import express from "express";
import { PersonalService } from "../personal/service";
import type { BookMode } from "../personal/types";
import { Service, DomainError } from "./service";
import { fetchBook } from "./market";
import { PublicMarketManager } from "../market/manager";
import { VENUES, type Venue } from "../market/types";
import { accountReadiness } from "../market/private-contracts";
import { digest, evaluateYieldTerms } from "../market/engine";
import { validateExport } from "./contracts";
export function createApp(
  service: Service,
  publicMarket = new PublicMarketManager(null),
  personal = new PersonalService(null, publicMarket.policy),
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const host = req.headers.host?.split(":")[0];
    if (host !== "127.0.0.1" && host !== "localhost")
      return res.status(403).json({ error: "LOCAL_HOST_REQUIRED" });
    if (!["GET", "HEAD"].includes(req.method)) {
      if (
        req.headers["x-alpha-client"] !== "owner-ui" ||
        !req.is("application/json")
      )
        return res.status(403).json({ error: "REQUEST_ORIGIN_REQUIRED" });
      if (
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}`
      )
        return res.status(403).json({ error: "ORIGIN_REJECTED" });
    }
    next();
  });
  app.get("/api/health", (_, res) =>
    res.json({ ok: true, mode: "PAPER", liveEnabled: false }),
  );
  app.get("/api/dashboard", (_, res) => res.json(service.dashboard()));
  app.post("/api/orders", (req, res) =>
    res.status(201).json(service.execute(req.body)),
  );
  app.post("/api/positions/:id/close", (req, res) =>
    res.json(service.close(req.params.id)),
  );
  app.post("/api/settings/kill-switch", (req, res) => {
    if (typeof req.body.active !== "boolean")
      throw new DomainError("INVALID_SETTING");
    service.setKillSwitch(req.body.active);
    res.json(service.dashboard());
  });
  app.post("/api/settings/intelligence", (req, res) => {
    if (!["CORE_ONLY", "AI_ENHANCED"].includes(req.body.mode))
      throw new DomainError("INVALID_SETTING");
    service.setIntelligence(req.body.mode);
    res.json(service.dashboard());
  });
  app.post("/api/scenario/refresh", (_, res) => {
    service.refreshScenario();
    res.json(service.dashboard());
  });
  app.get("/api/export", (req, res) => {
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="alpha-capital-decision-analysis-${Date.now()}.json"`,
    );
    const legacy = service.export();
    const payload = {
      ...legacy,
      metadata: {
        ...legacy.metadata,
        personalBooks: personal.export(),
        personalPerformance: ["PAPER", "MANUAL"].map((mode) =>
          personal.dashboard(mode as BookMode, publicMarket.observation()),
        ),
      },
    };
    const market = publicMarket.exportSnapshot();
    let combined: any = market.snapshots.length
      ? {
          ...payload,
          metadata: {
            ...payload.metadata,
            source: "PAPER_LEDGER_AND_PUBLIC_MARKET",
            publicMarketAsOf: market.computedAt,
            publicMarketPolicy: publicMarket.policy,
            publicMarketInputs: market.calculationInputs.snapshots,
            valuationReferences: market.calculationInputs.valuations,
            marketEnabled: market.enabled,
          },
          opportunities: [...payload.opportunities, ...market.candidates],
          calculationFacts: [...payload.calculationFacts, ...market.facts],
          calculationTraces: [...payload.calculationTraces, ...market.traces],
          riskFacts: [
            ...payload.riskFacts,
            {
              publicMarketExecutable: false,
              accountConfigured: false,
              valuationQuality: "REFERENCE_ONLY",
            },
          ],
        }
      : payload;
    if (req.query.workspace === "personal") {
      const evaluatedAt = Date.now(),
        observation = publicMarket.observation(),
        books = personal.export();
      const dashboards = (["PAPER", "MANUAL"] as const).map((mode) =>
        personal.dashboard(mode, observation, evaluatedAt),
      );
      const inputHash = digest({ books, observation, evaluatedAt }),
        configHash = digest(publicMarket.policy);
      const facts = dashboards.flatMap((d) =>
        Object.entries(d)
          .filter(([_, v]) => typeof v === "number")
          .map(([metric, value]) => ({
            factId: `personal:${inputHash}:${d.mode}:${metric}`,
            metric,
            value,
            unit: "USD",
            quality: "DERIVED",
            computedAt: new Date(evaluatedAt).toISOString(),
            formulaId: "PERSONAL_LEDGER",
            formulaVersion: "1.0.0",
            inputSnapshotHash: inputHash,
            configHash,
            assumptions: [
              d.performanceSource,
              d.cashValuation,
              "Unrealized PnL excludes future closing fees; missing funding evidence remains incomplete",
            ],
          })),
      );
      combined = {
        ...combined,
        metadata: {
          ...combined.metadata,
          source: "PERSONAL_BOOKS_AND_PUBLIC_MARKET",
          personalBooks: books,
          personalPerformance: dashboards,
          personalValuationInputs: observation,
          personalEvaluatedAt: evaluatedAt,
          personalInputHash: inputHash,
          snapshotId: `personal:${inputHash}`,
          numericFactReferences: { personal: facts.map((f) => f.factId) },
          windowStart: new Date(
            Math.min(books.createdAt, ...books.entries.map((e) => e.at)),
          ).toISOString(),
        },
        portfolio: {
          books: dashboards.map((d) => ({
            mode: d.mode,
            equityUsd: d.equityUsd,
            cashUsd: d.cashUsd,
            capitalUsd: d.capitalUsd,
            netContributionsUsd: d.netContributionsUsd,
          })),
        },
        capitalActions: dashboards.flatMap((d) =>
          d.positions
            .filter((p) => !p.closedAt)
            .flatMap((p) =>
              p.alerts.map((code) => ({
                mode: d.mode,
                positionId: p.id,
                action: "REVIEW",
                reasonCode: code,
                automaticExecution: false,
              })),
            ),
        ),
        positions: dashboards.flatMap((d) => d.positions),
        opportunities: market.candidates,
        performance: {
          books: dashboards.map(({ positions, entries, accounts, ...d }) => d),
        },
        eventFacts: books.entries,
        riskFacts: [
          {
            liveExecutionEnabled: false,
            manualBookExchangeReconciled: false,
            valuation: "USD_REFERENCE",
            fundingMarkToleranceMs: 120000,
          },
        ],
        calculationFacts: [...market.facts, ...facts],
        calculationTraces: [
          ...market.traces,
          ...facts.map((f) => ({
            traceId: `trace:${f.factId}`,
            subjectId: "PERSONAL_LEDGER",
            formulaId: f.formulaId,
            formulaVersion: f.formulaVersion,
            inputSnapshotHash: inputHash,
            outputFactId: f.factId,
            computedAt: f.computedAt,
            configHash,
            expression: f.metric,
          })),
        ],
        productValue: { status: "EVIDENCE_INSUFFICIENT" },
      };
    }
    if (!validateExport(combined)) throw new Error("INVALID_EXPORT_SCHEMA");
    res.json(combined);
  });
  let lastMarket = 0;
  app.post("/api/market/refresh", async (_, res) => {
    if (Date.now() - lastMarket < 10000)
      return res.status(429).json({ error: "RATE_LIMIT_WAIT_10_SECONDS" });
    lastMarket = Date.now();
    const results = await Promise.allSettled(
      (["OKX", "Binance", "Bybit", "Hyperliquid"] as const).map(fetchBook),
    );
    res.json(
      results.map((r, i) =>
        r.status === "fulfilled"
          ? { ok: true, ...r.value }
          : {
              ok: false,
              venue: ["OKX", "Binance", "Bybit", "Hyperliquid"][i],
              error: r.reason?.message ?? "UNAVAILABLE",
            },
      ),
    );
  });
  app.get("/api/public-market", (_, res) => res.json(publicMarket.summary()));
  app.post("/api/public-market/start", async (_, res, next) => {
    try {
      res.json(await publicMarket.start());
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/public-market/stop", (_, res) =>
    res.json(publicMarket.stop()),
  );
  app.post("/api/public-market/refresh", async (_, res, next) => {
    try {
      res.json(await publicMarket.refresh());
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/public-market/candidates/:id", (req, res) => {
    const detail = publicMarket.candidate(req.params.id);
    res
      .status(detail ? 200 : 404)
      .json(detail ?? { error: "CANDIDATE_NOT_FOUND" });
  });
  app.get("/api/public-market/history", async (req, res) => {
    const venue = req.query.venue as Venue,
      instrumentId = req.query.instrumentId,
      start = Number(req.query.start),
      end = Number(req.query.end);
    if (
      !VENUES.includes(venue) ||
      typeof instrumentId !== "string" ||
      !Number.isFinite(start + end) ||
      start < 0 ||
      end <= start ||
      end - start > 90 * 86400000
    )
      return res.status(400).json({ error: "INVALID_HISTORY_REQUEST" });
    try {
      res.json(await publicMarket.history(venue, instrumentId, start, end));
    } catch (e) {
      res.status(422).json({ error: (e as Error).message });
    }
  });
  app.post("/api/calculations/yield", (req, res) => {
    try {
      res.json(evaluateYieldTerms(req.body, Date.now()));
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });
  app.get("/api/personal", (req, res) =>
    res.json(
      personal.dashboard(
        (req.query.mode ?? "PAPER") as BookMode,
        publicMarket.observation(),
      ),
    ),
  );
  app.post("/api/personal/flows", (req, res) =>
    res.json(personal.flow(req.body)),
  );
  app.post("/api/personal/fees", (req, res) =>
    res.json(personal.setFee(req.body)),
  );
  app.post("/api/personal/open", (req, res) =>
    res
      .status(201)
      .json(
        personal.open(
          req.body,
          publicMarket.observation(),
          publicMarket.summary().candidates,
        ),
      ),
  );
  app.post("/api/personal/positions/:id/close", (req, res) =>
    res.json(
      personal.close(req.params.id, req.body, publicMarket.observation()),
    ),
  );
  app.post("/api/personal/positions/:id/cashflows", (req, res) =>
    res.json(personal.cashflow(req.params.id, req.body)),
  );
  app.post("/api/personal/positions/:id/risk", (req, res) =>
    res.json(personal.risk(req.params.id, req.body)),
  );
  app.post("/api/personal/sync", (_, res) => {
    personal.sync(publicMarket.observation());
    res.json({ ok: true });
  });
  app.get("/api/connections", (_, res) => res.json(accountReadiness()));
  app.all("/api/private/:venue/:operation", (_, res) =>
    res
      .status(403)
      .json({ error: "ACCOUNT_NOT_CONFIGURED", executionEnabled: false }),
  );
  app.use("/api", (_, res) => res.status(404).json({ error: "NOT_FOUND" }));
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(err instanceof DomainError ? err.status : 500).json({
        error: err instanceof DomainError ? err.code : "INTERNAL_ERROR",
      });
      if (!(err instanceof DomainError)) console.error(err.message);
    },
  );
  return app;
}
