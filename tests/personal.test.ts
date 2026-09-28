import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PersonalService } from "../src/personal/service";
import { PUBLIC_POLICY } from "../src/market/manager";
import { calculatePublicMarket } from "../src/market/engine";
import type { MarketSnapshot } from "../src/market/types";
import type { Observation, OpenInput } from "../src/personal/types";
const now = 1790582400000,
  hour = 3600000;
function observation(): Observation {
  const snapshots: MarketSnapshot[] = ["SPOT", "PERPETUAL"].map((kind: any) => {
    const id = `OKX:${kind}:BTC`;
    return {
      instrument: {
        id,
        venue: "OKX",
        symbol: id,
        base: "BTC",
        quote: "USDT",
        settlement: "USDT",
        kind,
        model: kind === "SPOT" ? "SPOT" : "LINEAR",
        quantityUnit: "BASE",
        basePerContract: 1,
        qtyStep: 0.001,
        minQty: 0.001,
        minNotional: 1,
        tickSize: 0.01,
        active: true,
        expiresAt: null,
        fundingIntervalMs: kind === "SPOT" ? null : hour,
        metadataAt: now,
      },
      book: {
        instrumentId: id,
        bids: [[100, 1000]],
        asks: [[100, 1000]],
        observedAt: now,
        receivedAt: now,
        timestampQuality: "VENUE",
        source: "WEBSOCKET",
        sequence: 1,
      },
      markPrice: 100,
      indexPrice: 100,
      funding:
        kind === "PERPETUAL"
          ? {
              rate: 0.0001,
              nextSettlementAt: now + hour,
              intervalMs: hour,
              intervalSource: "VENUE",
              observedAt: now,
              history: Array.from({ length: 12 }, (_, n) => ({
                at: now - (11 - n) * hour,
                rate: 0.0001,
              })),
            }
          : null,
      receivedAt: now,
      errors: [],
    };
  });
  return {
    snapshots,
    valuations: [
      {
        asset: "USDT",
        usdPrice: 1,
        observedAt: now,
        quality: "REFERENCE_ONLY",
        source: "COINBASE_PUBLIC_SPOT",
      },
    ],
  };
}
function setup(mode: "PAPER" | "MANUAL" = "PAPER", file: string | null = null) {
  const service = new PersonalService(file, PUBLIC_POLICY),
    obs = observation();
  service.flow(
    {
      requestId: "deposit-00001",
      mode,
      venue: "OKX",
      type: "DEPOSIT",
      amountUsd: 10000,
    },
    now,
  );
  return { service, obs };
}
function openPaper(service: PersonalService, obs: Observation) {
  const c = calculatePublicMarket(
    obs.snapshots,
    obs.valuations,
    PUBLIC_POLICY,
    now,
  ).candidates;
  return service.open(
    {
      requestId: "open-paper-0001",
      mode: "PAPER",
      candidateId: c[0].id,
      sizeUsd: 1000,
      acknowledgeResearch: true,
      stopLossUsd: 1,
    },
    obs,
    c,
    now,
  ).positionId;
}
function manual(): OpenInput {
  return {
    requestId: "manual-open-001",
    mode: "MANUAL",
    at: now,
    title: "Owner trade",
    legs: [
      {
        instrumentId: "OKX:SPOT:BTC",
        side: "BUY",
        quantity: 2,
        price: 100,
        quoteUsd: 1,
        feeUsd: 1,
      },
    ],
  };
}
test("personal books start empty and paper capital never leaks into manual book", () => {
  const { service, obs } = setup();
  assert.equal(service.dashboard("PAPER", obs, now).cashUsd, 10000);
  assert.equal(service.dashboard("MANUAL", obs, now).cashUsd, 0);
  assert.equal(service.dashboard("PAPER", obs, now).realizedNetPnlUsd, 0);
});
test("paper opens two fully funded legs atomically with actual book prices and modeled fees", () => {
  const { service, obs } = setup();
  const id = openPaper(service, obs);
  const d = service.dashboard("PAPER", obs, now);
  assert.equal(d.positions[0].id, id);
  assert.equal(d.capitalUsd, 2000);
  assert.equal(d.cashUsd, 7998.4);
  assert.equal(d.realizedNetPnlUsd, -1.6);
  assert.equal(d.reconciliationDifferenceUsd, 0);
  assert.equal(d.positions[0].legs[0].quantity, 10);
  assert.ok(d.positions[0].alerts.includes("STOP_LOSS"));
});
test("a second-leg funding failure leaves neither fills nor reserved funds", () => {
  const { service, obs } = setup();
  service.flow(
    {
      requestId: "withdraw-0001",
      mode: "PAPER",
      venue: "OKX",
      type: "WITHDRAWAL",
      amountUsd: 8500,
    },
    now,
  );
  const before = service.export();
  assert.throws(() => openPaper(service, obs), /INSUFFICIENT_VENUE_CASH/);
  assert.deepEqual(service.export(), before);
});
test("paper rejects stale books and a manual record rejects invented spot shorts", () => {
  const { service, obs } = setup();
  obs.snapshots[0].book!.observedAt = now - 10000;
  assert.throws(() => openPaper(service, obs), /STALE|SKEW/);
  const x = setup("MANUAL"),
    input = manual();
  input.legs![0].side = "SELL";
  assert.throws(() => x.service.open(input, x.obs, [], now), /SPOT_SHORT/);
});
test("paper close settles price PnL and actual modeled closing fees; expected yield is never credited", () => {
  const { service, obs } = setup();
  const id = openPaper(service, obs);
  obs.snapshots[0].book!.bids = [[110, 1000]];
  obs.snapshots[1].book!.asks = [[105, 1000]];
  service.close(id, { requestId: "close-paper-001" }, obs, now + 100);
  const d = service.dashboard("PAPER", obs, now + 100);
  assert.equal(d.capitalUsd, 0);
  assert.equal(d.realizedPricePnlUsd, 50);
  assert.equal(d.feesUsd, 3.33);
  assert.equal(d.cashUsd, 10046.67);
  assert.equal(d.totalPnlUsd, 46.67);
  assert.equal(d.reconciliationDifferenceUsd, 0);
});
test("close is atomic when one exit book has insufficient depth", () => {
  const { service, obs } = setup();
  const id = openPaper(service, obs),
    before = service.export();
  obs.snapshots[1].book!.asks = [[100, 1]];
  assert.throws(
    () => service.close(id, { requestId: "close-paper-001" }, obs, now),
    /INSUFFICIENT_BOOK_DEPTH/,
  );
  assert.deepEqual(service.export(), before);
});
test("manual fill and actual closing fees reconcile separately from deposits and withdrawals", () => {
  const { service, obs } = setup("MANUAL");
  const { positionId } = service.open(manual(), obs, [], now);
  const leg = service.dashboard("MANUAL", obs, now).positions[0].legs[0];
  service.close(
    positionId,
    {
      requestId: "manual-close-001",
      at: now + 100,
      fills: [{ legId: leg.id, price: 110, quoteUsd: 1, feeUsd: 2 }],
    },
    obs,
    now + 100,
  );
  service.flow(
    {
      requestId: "withdraw-0002",
      mode: "MANUAL",
      venue: "OKX",
      type: "WITHDRAWAL",
      amountUsd: 1000,
    },
    now + 100,
  );
  const d = service.dashboard("MANUAL", obs, now + 100);
  assert.equal(d.realizedPricePnlUsd, 20);
  assert.equal(d.realizedNetPnlUsd, 17);
  assert.equal(d.cashUsd, 9017);
  assert.equal(d.netContributionsUsd, 9000);
  assert.equal(d.reconciliationDifferenceUsd, 0);
});
test("derivative PnL converts price difference at exit FX, not the full notional FX change", () => {
  const { service, obs } = setup("MANUAL"),
    input = manual();
  input.legs = [
    {
      instrumentId: "OKX:PERPETUAL:BTC",
      side: "SELL",
      quantity: 2,
      price: 100,
      quoteUsd: 1,
      feeUsd: 1,
      collateralUsd: 50,
    },
  ];
  const { positionId } = service.open(input, obs, [], now),
    leg = service.dashboard("MANUAL", obs, now).positions[0].legs[0];
  service.close(
    positionId,
    {
      requestId: "manual-close-001",
      at: now + 100,
      fills: [{ legId: leg.id, price: 90, quoteUsd: 0.9, feeUsd: 1 }],
    },
    obs,
    now + 100,
  );
  assert.equal(
    service.dashboard("MANUAL", obs, now + 100).realizedPricePnlUsd,
    18,
  );
});
test("settled funding uses observed history and nearby price exactly once, including after restart", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "personal-test-"));
  try {
    const file = path.join(dir, "book.json"),
      { service, obs } = setup("PAPER", file);
    openPaper(service, obs);
    const at = now + hour;
    obs.snapshots[1].funding!.observedAt = at;
    obs.snapshots[1].funding!.history.push({ at, rate: 0.001 });
    obs.valuations[0].observedAt = at;
    service.sync(obs, at);
    service.sync(obs, at);
    let s = new PersonalService(file, PUBLIC_POLICY);
    s.sync(obs, at);
    const es = s.export().entries.filter((e) => e.type === "FUNDING");
    assert.equal(es.length, 1);
    assert.equal(es[0].fundingUsd, 1);
    assert.equal(es[0].evidence.settledRate, 0.001);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("missing settlement mark never substitutes today price or predicted rate", () => {
  const { service, obs } = setup();
  openPaper(service, obs);
  const at = now + hour;
  obs.snapshots[1].funding!.observedAt = at + 600000;
  obs.snapshots[1].funding!.history.push({ at, rate: 0.001 });
  obs.valuations[0].observedAt = at + 600000;
  service.sync(obs, at + 600000);
  assert.equal(
    service.export().entries.filter((e) => e.type === "FUNDING").length,
    0,
  );
  assert.ok(
    service
      .dashboard("PAPER", obs, at + 600000)
      .positions[0].alerts.includes("FUNDING_SETTLEMENT_INCOMPLETE"),
  );
});
test("manual funding accepts signed cash and rejects duplicate exchange reference", () => {
  const { service, obs } = setup("MANUAL"),
    input = manual();
  input.legs![0].instrumentId = "OKX:PERPETUAL:BTC";
  input.legs![0].collateralUsd = 50;
  const { positionId } = service.open(input, obs, [], now),
    leg = service.dashboard("MANUAL", obs, now).positions[0].legs[0];
  const body = {
    requestId: "funding-manual-01",
    type: "FUNDING",
    legId: leg.id,
    amountUsd: -3,
    reference: "exchange-1",
    at: now + hour,
  };
  service.cashflow(positionId, body, now + hour);
  service.cashflow(positionId, body, now + hour);
  assert.throws(
    () =>
      service.cashflow(
        positionId,
        { ...body, requestId: "funding-manual-02" },
        now + hour,
      ),
    /DUPLICATE_SETTLEMENT/,
  );
  assert.equal(service.dashboard("MANUAL", obs, now).fundingUsd, -3);
});
test("missing live marks propagate unknown equity rather than recording zero PnL", () => {
  const { service, obs } = setup("MANUAL");
  service.open(manual(), obs, [], now);
  const d = service.dashboard("MANUAL", obs, now + 20000);
  assert.equal(d.equityUsd, null);
  assert.equal(d.unrealizedPnlUsd, null);
  assert.ok(d.positions[0].alerts.includes("MARK_UNAVAILABLE"));
});
test("idempotency survives retries but a changed amount cannot reuse its key", () => {
  const { service, obs } = setup("MANUAL"),
    body = manual();
  const a = service.open(body, obs, [], now),
    b = service.open(body, obs, [], now);
  assert.deepEqual(a, b);
  assert.equal(service.export().positions.length, 1);
  assert.throws(
    () => service.open({ ...body, title: "changed" }, obs, [], now),
    /REQUEST_ID_CONFLICT/,
  );
});
test("holding time and explicit take-profit thresholds generate review alerts without automatic orders", () => {
  const { service, obs } = setup("MANUAL"),
    input = manual();
  input.takeProfitUsd = 10;
  input.maxHoldHours = 0.00001;
  service.open(input, obs, [], now);
  obs.snapshots[0].book!.bids = [[110, 1000]];
  const d = service.dashboard("MANUAL", obs, now + 100);
  assert.ok(d.positions[0].alerts.includes("TAKE_PROFIT"));
  assert.ok(d.positions[0].alerts.includes("HOLD_LIMIT"));
  assert.equal(d.positions[0].closedAt, null);
});

test("idempotency key cannot be reused across command types", () => {
  const { service } = setup();
  assert.throws(
    () =>
      service.setFee({
        requestId: "deposit-00001",
        mode: "PAPER",
        venue: "OKX",
        type: "DEPOSIT",
        amountUsd: 10000,
      }),
    /REQUEST_ID_CONFLICT/,
  );
});

test("manual close cannot precede a previously recorded settlement", () => {
  const { service, obs } = setup("MANUAL"),
    input = manual();
  input.legs![0].instrumentId = "OKX:PERPETUAL:BTC";
  input.legs![0].collateralUsd = 100;
  const { positionId } = service.open(input, obs, [], now),
    leg = service.dashboard("MANUAL", obs, now).positions[0].legs[0];
  service.cashflow(
    positionId,
    {
      requestId: "funding-after-001",
      legId: leg.id,
      type: "FUNDING",
      at: now + hour,
      amountUsd: 1,
      reference: "settle-after",
    },
    now + hour,
  );
  assert.throws(
    () =>
      service.close(
        positionId,
        {
          requestId: "close-before-001",
          at: now + 100,
          fills: [{ legId: leg.id, price: 100, quoteUsd: 1, feeUsd: 0 }],
        },
        obs,
        now + hour,
      ),
    /CLOSE_BEFORE_RECORDED_EVENT/,
  );
});

test("configured spot and derivative fees stay distinct in paper fills", () => {
  const { service, obs } = setup();
  service.setFee({
    requestId: "fee-spot-0001",
    mode: "PAPER",
    venue: "OKX",
    kind: "SPOT",
    takerBps: 2,
  });
  service.setFee({
    requestId: "fee-perp-0001",
    mode: "PAPER",
    venue: "OKX",
    kind: "PERPETUAL",
    takerBps: 3,
  });
  openPaper(service, obs);
  assert.equal(service.dashboard("PAPER", obs, now).feesUsd, 0.5);
  assert.deepEqual(
    service.export().positions[0].legs.map((l) => l.feeBps),
    [2, 3],
  );
});
