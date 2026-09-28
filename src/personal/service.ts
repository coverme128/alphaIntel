import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Decimal } from "decimal.js";
import { DomainError } from "../server/service";
import { digest, pairEconomics } from "../market/engine";
import {
  VENUES,
  type Venue,
  type MarketSnapshot,
  type MarketPolicy,
  type PublicCandidate,
} from "../market/types";
import { walkBook } from "../domain/calculations";
import type {
  PersonalState,
  BookMode,
  Entry,
  PersonalPosition,
  PersonalLeg,
  Observation,
  OpenInput,
} from "./types";
const strategyNames: Record<string, string> = {
  FUNDING_NEUTRAL: "资金费率中性",
  BASIS_CASH_CARRY: "期现基差",
  CROSS_EXCHANGE_FUNDING: "跨所资金费率",
  CROSS_EXCHANGE_SPREAD: "跨所价差",
  IDLE_CAPITAL_YIELD: "闲置生息",
};
const usd = (n: number) => new Decimal(n).toDecimalPlaces(8).toNumber() || 0;
const fail = (code: string): never => {
  throw new DomainError(code);
};
const number = (x: unknown, min = 0, max = 1e12): number =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max
    ? x
    : fail("INVALID_AMOUNT");
const modeOf = (m: unknown): BookMode =>
  m === "PAPER" || m === "MANUAL" ? m : fail("INVALID_BOOK_MODE");
const venueOf = (v: unknown): Venue =>
  VENUES.includes(v as Venue) ? (v as Venue) : fail("INVALID_VENUE");
const occurredAt = (value: unknown, now: number) =>
  value === undefined ? now : number(value, 1, now);
export class PersonalService {
  private state: PersonalState;
  constructor(
    private file: string | null,
    readonly policy: MarketPolicy,
  ) {
    this.state =
      file && existsSync(file)
        ? JSON.parse(readFileSync(file, "utf8"))
        : {
            version: 1,
            createdAt: Date.now(),
            entries: [],
            positions: [],
            requests: {},
            fees: {},
            marks: {},
            nav: [],
          };
    if (this.state.version !== 1) throw new Error("INVALID_PERSONAL_STATE");
  }
  export() {
    return structuredClone(this.state);
  }
  private save(s: PersonalState) {
    if (this.file) {
      mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 });
      writeFileSync(this.file + ".tmp", JSON.stringify(s), { mode: 0o600 });
      renameSync(this.file + ".tmp", this.file);
    }
    this.state = structuredClone(s);
  }
  private command<T>(body: any, action: (s: PersonalState) => T): T {
    if (
      typeof body.requestId !== "string" ||
      !/^[\w-]{8,100}$/.test(body.requestId)
    )
      fail("REQUEST_ID_REQUIRED");
    const signature = digest(body),
      previous = this.state.requests[body.requestId];
    if (previous) {
      if (previous.hash !== signature) fail("REQUEST_ID_CONFLICT");
      return structuredClone(previous.result) as T;
    }
    const s = this.export(),
      result = action(s);
    s.requests[body.requestId] = { hash: signature, result };
    this.save(s);
    return structuredClone(result);
  }
  private entry(s: PersonalState, values: Omit<Entry, "id">) {
    s.entries.push({ id: randomUUID(), ...values });
  }
  private cash(s: PersonalState, mode: BookMode, venue: Venue) {
    return usd(
      s.entries
        .filter((e) => e.mode === mode && e.venue === venue)
        .reduce((n, e) => n + e.cashDeltaUsd, 0),
    );
  }
  private requireCash(
    s: PersonalState,
    mode: BookMode,
    venue: Venue,
    amount: number,
  ) {
    if (this.cash(s, mode, venue) + 1e-7 < amount)
      fail("INSUFFICIENT_VENUE_CASH");
  }
  flow(body: any, now = Date.now()) {
    return this.command({ ...body, operation: "FLOW" }, (s) => {
      const mode = modeOf(body.mode),
        venue = venueOf(body.venue),
        amount = number(body.amountUsd, 0.000001),
        at = occurredAt(body.at, now);
      if (body.type !== "DEPOSIT" && body.type !== "WITHDRAWAL")
        fail("INVALID_FLOW_TYPE");
      if (body.type === "WITHDRAWAL") this.requireCash(s, mode, venue, amount);
      const signed = body.type === "DEPOSIT" ? amount : -amount;
      this.entry(s, {
        mode,
        venue,
        at,
        type: body.type,
        positionId: null,
        legId: null,
        cashDeltaUsd: signed,
        capitalDeltaUsd: 0,
        realizedPricePnlUsd: 0,
        feeUsd: 0,
        fundingUsd: 0,
        externalFlowUsd: signed,
        evidence: {
          source: mode === "PAPER" ? "SIMULATED_CAPITAL" : "OWNER_REPORTED",
          note: String(body.note ?? "").slice(0, 200),
        },
      });
      return { ok: true };
    });
  }
  setFee(body: any) {
    return this.command({ ...body, operation: "FEE_SETTINGS" }, (s) => {
      const mode = modeOf(body.mode),
        venue = venueOf(body.venue);
      if (!["SPOT", "PERPETUAL", "FUTURE"].includes(body.kind))
        fail("INVALID_MARKET_KIND");
      const kind = body.kind as "SPOT" | "PERPETUAL" | "FUTURE";
      s.fees[mode] ??= {};
      s.fees[mode]![venue] ??= {};
      s.fees[mode]![venue]![kind] = number(body.takerBps, 0, 100);
      return { ok: true };
    });
  }
  private reference(observation: Observation, asset: string, now: number) {
    const v = observation.valuations.find(
      (v) =>
        v.asset === asset &&
        now - v.observedAt <= this.policy.valuationTtlMs &&
        v.observedAt <= now + 5000,
    );
    return v?.usdPrice ?? null;
  }
  private snapshot(observation: Observation, id: string) {
    return (
      observation.snapshots.find((s) => s.instrument.id === id) ??
      fail("INSTRUMENT_NOT_FOUND_CONNECT_MARKET")
    );
  }
  private bookFill(
    s: MarketSnapshot,
    side: "BUY" | "SELL",
    q: number,
    now: number,
  ) {
    const b = s.book;
    if (
      !b ||
      b.timestampQuality !== "VENUE" ||
      now - b.observedAt > 2000 ||
      now - b.receivedAt > 2000 ||
      b.observedAt > now + 5000
    )
      fail("FRESH_BOOK_REQUIRED");
    const fill = walkBook(side === "BUY" ? b!.asks : b!.bids, q);
    if (!fill.complete || fill.vwap === null) fail("INSUFFICIENT_BOOK_DEPTH");
    return fill.vwap!;
  }
  open(
    body: OpenInput,
    observation: Observation,
    candidates: PublicCandidate[],
    now = Date.now(),
  ) {
    return this.command({ ...body, operation: "OPEN" }, (s) => {
      const mode = modeOf(body.mode),
        at = mode === "PAPER" ? now : occurredAt(body.at, now);
      let inputs: NonNullable<OpenInput["legs"]>,
        candidate: PublicCandidate | undefined;
      if (mode === "PAPER") {
        if (body.acknowledgeResearch !== true)
          fail("ACKNOWLEDGE_RESEARCH_REQUIRED");
        candidate =
          candidates.find((c) => c.id === body.candidateId) ??
          fail("CANDIDATE_NOT_FOUND");
        const [a, b] = candidate.instrumentIds.map((id) =>
          this.snapshot(observation, id),
        );
        const policy = structuredClone(this.policy);
        for (const venue of VENUES)
          if (s.fees.PAPER?.[venue] !== undefined)
            for (const k of ["SPOT", "PERPETUAL", "FUTURE"] as const)
              policy.feesBps[venue][k] =
                s.fees.PAPER[venue]![k] ?? policy.feesBps[venue][k];
        const e = pairEconomics(
          candidate.strategy,
          a,
          b,
          number(body.sizeUsd, 1),
          observation.valuations,
          policy,
          now,
        );
        const blocked = e.reasonCodes.filter(
          (c) =>
            ![
              "NET_BELOW_MIN",
              "ANNUALIZED_BELOW_MIN",
              "FUNDING_PERSISTENCE_LOW",
              "FUNDING_NOT_POSITIVE",
              "NEGATIVE_BASIS",
              "ENTRY_BASIS_LIMIT",
              "CROSS_VENUE_PREMIUM_LIMIT",
            ].includes(c),
        );
        if (e.legs.length !== 2 || e.netPct === null || blocked.length)
          fail(blocked[0] ?? "MARKET_EVIDENCE_INCOMPLETE");
        inputs = e.legs.map((l) => ({
          instrumentId: l.instrumentId,
          side: l.side,
          quantity: l.baseQuantity,
          price: l.vwap,
          quoteUsd: this.reference(
            observation,
            this.snapshot(observation, l.instrumentId).instrument.quote,
            now,
          )!,
          feeUsd: (l.notionalUsd * l.feeBps) / 10000,
          collateralUsd: l.notionalUsd,
        }));
      } else {
        if (
          !Array.isArray(body.legs) ||
          !body.legs.length ||
          body.legs.length > 2
        )
          fail("ONE_OR_TWO_LEGS_REQUIRED");
        inputs = body.legs!;
      }
      if (new Set(inputs.map((l) => l.instrumentId)).size !== inputs.length)
        fail("DUPLICATE_LEG");
      const p: PersonalPosition = {
        id: randomUUID(),
        mode,
        title: String(
          body.title ??
            `${candidate?.asset ?? "个人"} · ${strategyNames[candidate?.strategy ?? ""] ?? "手动成交"}`,
        ).slice(0, 120),
        strategy: candidate?.strategy ?? "MANUAL",
        candidateId: candidate?.id ?? null,
        openedAt: at,
        closedAt: null,
        legs: [],
        stopLossUsd: number(body.stopLossUsd ?? 0),
        takeProfitUsd: number(body.takeProfitUsd ?? 0),
        maxHoldHours: number(body.maxHoldHours ?? 0, 0, 87600),
        source: mode === "PAPER" ? "PUBLIC_BOOK_SIMULATION" : "OWNER_REPORTED",
      };
      for (const input of inputs) {
        const market = this.snapshot(observation, input.instrumentId),
          i = market.instrument;
        if (input.side !== "BUY" && input.side !== "SELL") fail("INVALID_SIDE");
        if (i.kind === "SPOT" && input.side === "SELL")
          fail("SPOT_SHORT_REQUIRES_EXISTING_INVENTORY");
        const q = number(input.quantity, 1e-12),
          price = number(input.price, 1e-12),
          fx = number(input.quoteUsd, 1e-12),
          fee = number(input.feeUsd);
        const venueQty = new Decimal(q).div(i.basePerContract);
        if (
          !venueQty.mod(i.qtyStep).isZero() ||
          (mode === "PAPER" &&
            (venueQty.lt(i.minQty) || price * q < i.minNotional))
        )
          fail("INVALID_INSTRUMENT_QUANTITY");
        const collateral =
          mode === "PAPER" || i.kind === "SPOT"
            ? q * price * fx
            : number(input.collateralUsd, 0.000001);
        this.requireCash(s, mode, i.venue, collateral + fee);
        const leg: PersonalLeg = {
          id: randomUUID(),
          instrument: structuredClone(i),
          side: input.side,
          quantity: q,
          remaining: q,
          entryPrice: price,
          entryQuoteUsd: fx,
          collateralUsd: usd(collateral),
          feeBps:
            s.fees[mode]?.[i.venue]?.[i.kind] ??
            this.policy.feesBps[i.venue][i.kind],
        };
        p.legs.push(leg);
        this.entry(s, {
          mode,
          venue: i.venue,
          at,
          type: "OPEN",
          positionId: p.id,
          legId: leg.id,
          cashDeltaUsd: usd(-collateral - fee),
          capitalDeltaUsd: usd(collateral),
          realizedPricePnlUsd: 0,
          feeUsd: usd(fee),
          fundingUsd: 0,
          externalFlowUsd: 0,
          evidence: {
            source: p.source,
            price,
            quoteUsd: fx,
            baseQuantity: q,
            side: input.side,
            book: mode === "PAPER" ? market.book : undefined,
            feeSource:
              mode === "MANUAL"
                ? "OWNER_REPORTED"
                : s.fees.PAPER?.[i.venue]?.[i.kind] !== undefined
                  ? "OWNER_CONFIGURED"
                  : "FALLBACK",
            candidateInputHash: candidate?.inputHash,
          },
        });
      }
      s.positions.push(p);
      return { positionId: p.id };
    });
  }
  private pnl(leg: PersonalLeg, q: number, price: number, fx: number) {
    return usd(
      leg.instrument.kind === "SPOT"
        ? q * (price * fx - leg.entryPrice * leg.entryQuoteUsd)
        : (leg.side === "BUY" ? 1 : -1) * q * (price - leg.entryPrice) * fx,
    );
  }
  close(id: string, body: any, observation: Observation, now = Date.now()) {
    return this.command(
      { ...body, operation: "CLOSE", positionId: id },
      (s) => {
        const p =
          s.positions.find((p) => p.id === id) ?? fail("POSITION_NOT_FOUND");
        if (p.closedAt) fail("POSITION_ALREADY_CLOSED");
        const at = p.mode === "PAPER" ? now : occurredAt(body.at, now);
        if (at < p.openedAt) fail("CLOSE_BEFORE_OPEN");
        if (s.entries.some((e) => e.positionId === id && e.at > at))
          fail("CLOSE_BEFORE_RECORDED_EVENT");
        const remaining = p.legs.filter((l) => l.remaining > 0);
        if (
          p.mode === "MANUAL" &&
          (!Array.isArray(body.fills) ||
            body.fills.length !== remaining.length ||
            new Set(body.fills.map((f: any) => f.legId)).size !==
              remaining.length)
        )
          fail("ALL_REMAINING_LEG_FILLS_REQUIRED");
        const prepared = remaining.map((leg) => {
          let price: number, fx: number, fee: number;
          if (p.mode === "PAPER") {
            const m = this.snapshot(observation, leg.instrument.id);
            price = this.bookFill(
              m,
              leg.side === "BUY" ? "SELL" : "BUY",
              leg.remaining,
              now,
            );
            fx =
              this.reference(observation, leg.instrument.quote, now) ??
              fail("USD_VALUATION_MISSING");
            fee = (leg.remaining * price * fx * leg.feeBps) / 10000;
          } else {
            const f =
              body.fills.find((f: any) => f.legId === leg.id) ??
              fail("MISSING_LEG_FILL");
            price = number(f.price, 1e-12);
            fx = number(f.quoteUsd, 1e-12);
            fee = number(f.feeUsd);
          }
          return { leg, price, fx, fee };
        });
        for (const { leg, price, fx, fee } of prepared) {
          const pnl = this.pnl(leg, leg.remaining, price, fx),
            capital = leg.collateralUsd;
          this.entry(s, {
            mode: p.mode,
            venue: leg.instrument.venue,
            at,
            type: "CLOSE",
            positionId: id,
            legId: leg.id,
            cashDeltaUsd: usd(capital + pnl - fee),
            capitalDeltaUsd: -capital,
            realizedPricePnlUsd: pnl,
            feeUsd: usd(fee),
            fundingUsd: 0,
            externalFlowUsd: 0,
            evidence: {
              source: p.source,
              price,
              quoteUsd: fx,
              baseQuantity: leg.remaining,
              side: leg.side === "BUY" ? "SELL" : "BUY",
            },
          });
          leg.remaining = 0;
          leg.collateralUsd = 0;
        }
        p.closedAt = at;
        return { positionId: id };
      },
    );
  }
  cashflow(id: string, body: any, now = Date.now()) {
    return this.command(
      { ...body, operation: "CASHFLOW", positionId: id },
      (s) => {
        const p =
          s.positions.find((p) => p.id === id) ?? fail("POSITION_NOT_FOUND");
        if (p.mode !== "MANUAL") fail("MANUAL_BOOK_ONLY");
        const leg =
          p.legs.find((l) => l.id === body.legId) ?? fail("LEG_NOT_FOUND");
        const at = occurredAt(body.at, now);
        if (at < p.openedAt || at > (p.closedAt ?? now))
          fail("CASHFLOW_OUTSIDE_POSITION");
        if (body.type !== "FUNDING" && body.type !== "FEE")
          fail("INVALID_CASHFLOW");
        if (body.type === "FUNDING" && leg.instrument.kind !== "PERPETUAL")
          fail("NOT_PERPETUAL");
        if (
          typeof body.reference !== "string" ||
          !body.reference.trim() ||
          body.reference.length > 120
        )
          fail("SETTLEMENT_REFERENCE_REQUIRED");
        if (
          s.entries.some(
            (e) =>
              e.mode === "MANUAL" &&
              e.venue === leg.instrument.venue &&
              e.evidence.reference === body.reference,
          )
        )
          fail("DUPLICATE_SETTLEMENT_REFERENCE");
        const amount = number(
          body.amountUsd,
          body.type === "FUNDING" ? -1e12 : 0,
        );
        this.entry(s, {
          mode: p.mode,
          venue: leg.instrument.venue,
          at,
          type: body.type,
          positionId: id,
          legId: leg.id,
          cashDeltaUsd: body.type === "FUNDING" ? amount : -amount,
          capitalDeltaUsd: 0,
          realizedPricePnlUsd: 0,
          feeUsd: body.type === "FEE" ? amount : 0,
          fundingUsd: body.type === "FUNDING" ? amount : 0,
          externalFlowUsd: 0,
          evidence: {
            source: "OWNER_REPORTED",
            reference: body.reference,
            note: String(body.note ?? "").slice(0, 200),
          },
        });
        return { ok: true };
      },
    );
  }
  risk(id: string, body: any) {
    return this.command({ ...body, operation: "RISK", positionId: id }, (s) => {
      const p =
        s.positions.find((p) => p.id === id) ?? fail("POSITION_NOT_FOUND");
      p.stopLossUsd = number(body.stopLossUsd);
      p.takeProfitUsd = number(body.takeProfitUsd);
      p.maxHoldHours = number(body.maxHoldHours, 0, 87600);
      return { ok: true };
    });
  }
  sync(observation: Observation, now = Date.now()) {
    const s = this.export();
    let changed = false;
    for (const p of s.positions)
      for (const leg of p.legs) {
        if (leg.instrument.kind !== "PERPETUAL" || p.mode !== "PAPER") continue;
        const m = observation.snapshots.find(
            (m) => m.instrument.id === leg.instrument.id,
          ),
          f = m?.funding;
        if (!m?.markPrice || !f) continue;
        const fx = this.reference(observation, leg.instrument.quote, now);
        if (fx !== null && Math.abs(now - f.observedAt) <= 120000) {
          const samples = (s.marks[leg.instrument.id] ??= []);
          if (!samples.some((v) => v.at === f.observedAt)) {
            samples.push({
              at: f.observedAt,
              price: m.markPrice,
              quoteUsd: fx,
            });
            s.marks[leg.instrument.id] = samples.slice(-10080);
            changed = true;
          }
        }
        for (const r of f.history) {
          if (r.at <= p.openedAt || r.at > (p.closedAt ?? now) || r.at > now)
            continue;
          if (
            s.entries.some(
              (e) =>
                e.legId === leg.id &&
                e.type === "FUNDING" &&
                e.evidence.settlementAt === r.at,
            )
          )
            continue;
          const sample = (s.marks[leg.instrument.id] ?? [])
            .filter((v) => Math.abs(v.at - r.at) <= 120000)
            .sort((a, b) => Math.abs(a.at - r.at) - Math.abs(b.at - r.at))[0];
          if (!sample) continue;
          const amount = usd(
            (leg.side === "BUY" ? -1 : 1) *
              leg.quantity *
              sample.price *
              sample.quoteUsd *
              r.rate,
          );
          this.entry(s, {
            mode: "PAPER",
            venue: leg.instrument.venue,
            at: r.at,
            type: "FUNDING",
            positionId: p.id,
            legId: leg.id,
            cashDeltaUsd: amount,
            capitalDeltaUsd: 0,
            realizedPricePnlUsd: 0,
            feeUsd: 0,
            fundingUsd: amount,
            externalFlowUsd: 0,
            evidence: {
              source: "SIMULATED_SETTLEMENT",
              settlementAt: r.at,
              settledRate: r.rate,
              referenceMark: sample.price,
              markAt: sample.at,
              quoteUsd: sample.quoteUsd,
              quality: "NEAR_SETTLEMENT_MARK_ESTIMATE",
            },
          });
          changed = true;
        }
      }
    for (const mode of ["PAPER", "MANUAL"] as const)
      if (!s.nav.some((n) => n.mode === mode && now - n.at < 60000)) {
        const d = this.project(s, mode, observation, now);
        s.nav.push({
          at: now,
          mode,
          equityUsd: d.equityUsd,
          netContributionsUsd: d.netContributionsUsd,
        });
        changed = true;
      }
    if (changed) this.save(s);
  }
  private project(
    s: PersonalState,
    mode: BookMode,
    observation: Observation,
    now: number,
  ) {
    const entries = s.entries.filter((e) => e.mode === mode),
      totals = entries.reduce(
        (a, e) => ({
          cashUsd: a.cashUsd + e.cashDeltaUsd,
          capitalUsd: a.capitalUsd + e.capitalDeltaUsd,
          realizedPricePnlUsd: a.realizedPricePnlUsd + e.realizedPricePnlUsd,
          feesUsd: a.feesUsd + e.feeUsd,
          fundingUsd: a.fundingUsd + e.fundingUsd,
          netContributionsUsd: a.netContributionsUsd + e.externalFlowUsd,
        }),
        {
          cashUsd: 0,
          capitalUsd: 0,
          realizedPricePnlUsd: 0,
          feesUsd: 0,
          fundingUsd: 0,
          netContributionsUsd: 0,
        },
      );
    const positions = s.positions
      .filter((p) => p.mode === mode)
      .map((p) => {
        const pe = entries.filter((e) => e.positionId === p.id),
          realized = usd(
            pe.reduce(
              (n, e) => n + e.realizedPricePnlUsd + e.fundingUsd - e.feeUsd,
              0,
            ),
          );
        const alerts: string[] = [];
        const legs = p.legs.map((l) => {
          const m = observation.snapshots.find(
              (m) => m.instrument.id === l.instrument.id,
            ),
            fx = this.reference(observation, l.instrument.quote, now);
          let price: number | null = null;
          if (l.remaining === 0) price = l.entryPrice;
          else if (
            m?.book &&
            now - m.book.observedAt <= 15000 &&
            m.book.observedAt <= now + 5000
          ) {
            const f = walkBook(
              l.side === "BUY" ? m.book.bids : m.book.asks,
              l.remaining,
            );
            if (f.complete) price = f.vwap;
          }
          const unrealized =
            l.remaining === 0
              ? 0
              : price !== null && fx !== null
                ? this.pnl(l, l.remaining, price, fx)
                : null;
          if (unrealized === null) alerts.push("MARK_UNAVAILABLE");
          if (
            l.remaining > 0 &&
            m?.funding &&
            now - m.funding.observedAt <= 120000 &&
            m.funding.rate * (l.side === "BUY" ? -1 : 1) < 0
          )
            if (
              p.legs.filter((l) => l.instrument.kind === "PERPETUAL").length ===
              1
            )
              alerts.push("PAYING_FUNDING");
          if (
            l.remaining > 0 &&
            l.instrument.expiresAt &&
            l.instrument.expiresAt - now <= 86400000
          )
            alerts.push("EXPIRY_WITHIN_24H");
          const missing =
            mode === "PAPER" && m?.funding
              ? m.funding.history.filter(
                  (r) =>
                    r.at > p.openedAt &&
                    r.at <= (p.closedAt ?? now) &&
                    !pe.some(
                      (e) =>
                        e.legId === l.id &&
                        e.type === "FUNDING" &&
                        e.evidence.settlementAt === r.at,
                    ),
                ).length
              : 0;
          if (missing) alerts.push("FUNDING_SETTLEMENT_INCOMPLETE");
          if (mode === "PAPER" && l.instrument.kind === "PERPETUAL") {
            if (!m?.funding || now - m.funding.observedAt > 120000)
              alerts.push("FUNDING_HISTORY_GAP");
            else {
              const oldest = m.funding.history[0]?.at,
                accounted = pe
                  .filter(
                    (e) =>
                      e.legId === l.id &&
                      e.type === "FUNDING" &&
                      oldest &&
                      e.at < oldest,
                  )
                  .reduce((n, e) => Math.max(n, e.at), p.openedAt);
              if (
                oldest &&
                oldest - accounted > m.funding.intervalMs * 1.5 &&
                accounted < (p.closedAt ?? now)
              )
                alerts.push("FUNDING_HISTORY_GAP");
            }
          }
          if (mode === "MANUAL" && l.instrument.kind === "PERPETUAL")
            alerts.push("VERIFY_MANUAL_FUNDING");
          return {
            ...l,
            currentPrice: price,
            unrealizedPnlUsd: unrealized,
            missingFundingCount: missing,
          };
        });
        const unrealized = legs.some((l) => l.unrealizedPnlUsd === null)
            ? null
            : usd(legs.reduce((n, l) => n + l.unrealizedPnlUsd!, 0)),
          net = unrealized === null ? null : usd(realized + unrealized);
        if (!p.closedAt) {
          const perps = p.legs.filter((l) => l.instrument.kind === "PERPETUAL");
          if (perps.length === 2) {
            const estimates = perps.map((l) => {
              const m = observation.snapshots.find(
                (m) => m.instrument.id === l.instrument.id,
              );
              const fx = this.reference(observation, l.instrument.quote, now);
              return m?.funding &&
                m.markPrice &&
                fx !== null &&
                now - m.funding.observedAt <= 120000
                ? ((l.side === "BUY" ? -1 : 1) *
                    l.remaining *
                    m.markPrice *
                    fx *
                    m.funding.rate *
                    86400000) /
                    m.funding.intervalMs
                : null;
            });
            if (
              estimates.every((e) => e !== null) &&
              estimates.reduce<number>((n, e) => n + (e ?? 0), 0) < 0
            )
              alerts.push("FUNDING_NET_NEGATIVE");
          }
          if (p.stopLossUsd > 0 && net !== null && net <= -p.stopLossUsd)
            alerts.push("STOP_LOSS");
          if (p.takeProfitUsd > 0 && net !== null && net >= p.takeProfitUsd)
            alerts.push("TAKE_PROFIT");
          if (
            p.maxHoldHours > 0 &&
            now - p.openedAt >= p.maxHoldHours * 3600000
          )
            alerts.push("HOLD_LIMIT");
          if (
            legs.length === 2 &&
            Math.abs(
              (legs[0].side === "BUY" ? 1 : -1) * legs[0].remaining +
                (legs[1].side === "BUY" ? 1 : -1) * legs[1].remaining,
            ) > 1e-8
          )
            alerts.push(
              legs[0].instrument.base === legs[1].instrument.base
                ? "HEDGE_MISMATCH"
                : "CROSS_ASSET_HEDGE_UNVERIFIED",
            );
        }
        return {
          ...p,
          legs,
          realizedNetPnlUsd: realized,
          unrealizedPnlUsd: unrealized,
          totalPnlUsd: net,
          alerts: [...new Set(alerts)],
        };
      });
    const unrealized = positions.some((p) => p.unrealizedPnlUsd === null)
      ? null
      : usd(positions.reduce((n, p) => n + p.unrealizedPnlUsd!, 0));
    const equity =
      unrealized === null
        ? null
        : usd(totals.cashUsd + totals.capitalUsd + unrealized);
    const realized = usd(
      totals.realizedPricePnlUsd + totals.fundingUsd - totals.feesUsd,
    );
    return {
      mode,
      ...Object.fromEntries(
        Object.entries(totals).map(([k, v]) => [k, usd(v)]),
      ),
      realizedPricePnlUsd: usd(totals.realizedPricePnlUsd),
      feesUsd: usd(totals.feesUsd),
      fundingUsd: usd(totals.fundingUsd),
      cashUsd: usd(totals.cashUsd),
      capitalUsd: usd(totals.capitalUsd),
      netContributionsUsd: usd(totals.netContributionsUsd),
      equityUsd: equity,
      unrealizedPnlUsd: unrealized,
      realizedNetPnlUsd: realized,
      totalPnlUsd: unrealized === null ? null : usd(realized + unrealized),
      reconciliationDifferenceUsd:
        equity === null
          ? null
          : usd(equity - totals.netContributionsUsd - realized - unrealized!),
      positions,
      accounts: VENUES.map((venue) => ({
        venue,
        cashUsd: this.cash(s, mode, venue),
        feeBps: s.fees[mode]?.[venue] ?? null,
      })),
      entries: [...entries].sort((a, b) => b.at - a.at),
      nav: s.nav.filter((n) => n.mode === mode),
      cashValuation: "USD_BOOK_VALUE_NO_AUTOMATIC_FX",
      performanceSource:
        mode === "PAPER"
          ? "SIMULATED"
          : "OWNER_REPORTED_NOT_EXCHANGE_RECONCILED",
    };
  }
  dashboard(mode: BookMode, observation: Observation, now = Date.now()) {
    return this.project(this.state, modeOf(mode), observation, now);
  }
}
