import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluate,
  evaluateExit,
  sharedRule,
  economicValue,
  productValue,
  conservativeFunding,
  fundingSchedule,
  walkBook,
  termReturn,
} from "../src/domain/calculations";
import {
  readJson,
  validateAllSchemas,
  validateAction,
  validateExport,
} from "../src/server/contracts";
import { Service, DomainError } from "../src/server/service";
import { Store } from "../src/server/store";
import { sizeEconomics } from "../src/domain/portfolio";
function matches(actual: any, expected: any) {
  for (const [key, value] of Object.entries(expected)) {
    if (typeof value === "number") {
      assert.ok(
        Math.abs(actual[key] - value) < 1e-8,
        `${key}: expected ${value}, got ${actual[key]}`,
      );
    } else if (Array.isArray(value)) {
      for (const v of value) assert.ok(actual[key].includes(v));
    } else assert.deepEqual(actual[key], value, key);
  }
}
const gold = readJson("02-domain-rules/golden/golden-fixtures.v1.0.4.json");
for (const f of gold.strategyFixtures)
  test(`v1.0.4 ${f.id}`, () =>
    matches(
      f.class === "exit_trigger"
        ? evaluateExit(f.strategy, f.inputs)
        : evaluate(f.strategy, f.inputs),
      f.expected,
    ));
for (const f of gold.sharedRuleFixtures)
  test(`v1.0.4 ${f.id}`, () =>
    matches(sharedRule(f.rule, f.inputs), f.expected));
for (const f of readJson(
  "02-domain-rules/economic-validation/golden/economic-golden-fixtures.v1.0.2.json",
).fixtures)
  test(`Alpha Proof arithmetic ${f.id}`, () =>
    matches(economicValue(f.inputs), f.expected));
for (const f of readJson(
  "02-domain-rules/product-value/golden/product-value-golden-fixtures.v1.0.5.json",
).cases)
  test(`Product Value ${f.id}`, () =>
    matches(productValue(f.input), f.expected));
test("all supplied domain schemas compile", () =>
  assert.equal(validateAllSchemas(), 23));
test("funding requires 8 observations and uses actual settlement interval", () => {
  assert.throws(() => conservativeFunding(0.001, [0.001]), /INSUFFICIENT/);
  assert.equal(conservativeFunding(0.002, Array(12).fill(0.001)).rate, 0.001);
  assert.equal(fundingSchedule(3600000, 3600000, 0, 86400000).length, 24);
  assert.equal(fundingSchedule(14400000, 14400000, 0, 86400000).length, 6);
  assert.throws(() => fundingSchedule(1, 0, 0, 2), /INVALID/);
});
test("book walk cannot create nonexistent liquidity", () => {
  const book: [number, number][] = [
    [100, 2],
    [101, 1],
  ];
  assert.deepEqual(walkBook(book, 4), {
    filled: 3,
    vwap: 301 / 3,
    complete: false,
  });
  assert.equal(walkBook(book, 2).vwap, 100);
  assert.throws(() => walkBook(book, 0));
});
test("APR and APY term conversions are distinct", () => {
  assert.equal(termReturn(12, 365, "APY"), 12.00000000000001);
  assert.equal(termReturn(12, 30, "APR"), (12 * 30) / 365);
  assert.ok(termReturn(12, 30, "APY") < termReturn(12, 30, "APR"));
});
function fixture() {
  const store = new Store(null);
  return {
    store,
    service: new Service(store),
    o: store.read().opportunities[0],
  };
}
test("paper open/close reconciles cash and never turns forecast or reserve into realized profit", () => {
  const { service, o } = fixture();
  const p = service.execute({
    opportunityId: o.id,
    amountUsd: 5000,
    requestId: "test-request-1",
    mode: "PAPER",
  });
  assert.equal(service.dashboard().portfolio.equityUsd, 100000 - p.entryFeeUsd);
  const closed = service.close(p.id);
  assert.equal(closed.realizedPnlUsd, -3);
  assert.equal(service.dashboard().portfolio.equityUsd, 99997);
  assert.equal(service.close(p.id).realizedPnlUsd, -3);
  assert.equal(service.dashboard().positions.length, 1);
});
test("idempotent open and conflicting reuse rejected", () => {
  const { service, o } = fixture();
  const req = {
    opportunityId: o.id,
    amountUsd: 5000,
    requestId: "test-request-2",
    mode: "PAPER",
  };
  assert.equal(service.execute(req).id, service.execute(req).id);
  assert.equal(service.dashboard().positions.length, 1);
  assert.throws(
    () => service.execute({ ...req, amountUsd: 6000 }),
    /IDEMPOTENCY_CONFLICT/,
  );
});
test("kill switch blocks new orders but cannot block closing existing positions", () => {
  const { service, o } = fixture();
  const p = service.execute({
    opportunityId: o.id,
    amountUsd: 5000,
    requestId: "test-request-3",
    mode: "PAPER",
  });
  service.setKillSwitch(true);
  assert.throws(
    () =>
      service.execute({
        opportunityId: o.id,
        amountUsd: 1000,
        requestId: "test-request-4",
        mode: "PAPER",
      }),
    /KILL_SWITCH_ACTIVE/,
  );
  assert.equal(service.close(p.id).status, "CLOSED");
  assert.notEqual(service.dashboard().actions[0].actionType, "EXECUTE");
});
test("live modes cannot bypass promotion via direct API domain call", () => {
  const { service, o } = fixture();
  for (const mode of ["ASSISTED", "AUTO", "GUIDED", undefined])
    assert.throws(
      () =>
        service.execute({
          opportunityId: o.id,
          amountUsd: 5000,
          requestId: "test-request-5",
          mode,
        }),
      /LIVE_GATES_NOT_PASSED/,
    );
});
test("amount, capacity, freshness, and aggregate limits are enforced server-side", () => {
  const { store, service, o } = fixture();
  for (const amountUsd of [-100, NaN, Infinity, 0, 1.222, 11000])
    assert.throws(() =>
      service.execute({
        opportunityId: o.id,
        amountUsd,
        requestId: "test-request-6",
        mode: "PAPER",
      }),
    );
  service.execute({
    opportunityId: o.id,
    amountUsd: 6000,
    requestId: "test-request-7",
    mode: "PAPER",
  });
  assert.throws(
    () =>
      service.execute({
        opportunityId: o.id,
        amountUsd: 5000,
        requestId: "test-request-8",
        mode: "PAPER",
      }),
    /ALLOCATION_LIMIT/,
  );
  store.transaction(
    (s) => (s.opportunities[0].expiresAt = "2000-01-01T00:00:00Z"),
  );
  assert.throws(
    () =>
      service.execute({
        opportunityId: o.id,
        amountUsd: 1000,
        requestId: "test-request-9",
        mode: "PAPER",
      }),
    /NOT_EXECUTABLE/,
  );
});
test("unknown size cannot extrapolate beyond measured bands", () => {
  const { o } = fixture();
  o.bands = [
    {
      notionalUsd: 1000,
      expectedNetPct: 0.2,
      expectedPnlUsd: 2,
      qualifiedAtSize: true,
    },
    {
      notionalUsd: 5000,
      expectedNetPct: 0.1,
      expectedPnlUsd: 5,
      qualifiedAtSize: true,
    },
  ];
  assert.equal(sizeEconomics(o, 2500)?.expectedNetPct, 0.1);
  assert.equal(sizeEconomics(o, 5001), null);
});
test("today action cap, maturity, and canonical export in both AI modes", () => {
  const { service } = fixture();
  for (const mode of ["CORE_ONLY", "AI_ENHANCED"] as const) {
    service.setIntelligence(mode);
    const d = service.dashboard();
    assert.ok(d.actions.length <= 3);
    d.actions.forEach((a) => assert.ok(validateAction(a)));
    const x = service.export();
    assert.ok(validateExport(x));
    assert.deepEqual(x.capitalActions, d.actions);
    assert.equal(x.performance.economicStatus, "UNPROVEN");
    assert.ok(x.calculationFacts.length > 0);
    const ids = new Set(x.calculationFacts.map((f) => f.factId));
    x.calculationTraces.forEach((t) => assert.ok(ids.has(t.outputFactId)));
    assert.equal(x.productValue.valueClassification, "EVIDENCE_INSUFFICIENT");
    assert.ok(
      !/apiKey|passphrase|secret|token|signature/i.test(JSON.stringify(x)),
    );
  }
});
test("failed transaction has no effects", () => {
  const store = new Store(null),
    before = store.read();
  assert.throws(() =>
    store.transaction((s) => {
      s.cashUsd = 0;
      throw new Error("test rollback");
    }),
  );
  assert.deepEqual(store.read(), before);
});

test("missing strategy inputs are never qualified", () => {
  const f = gold.strategyFixtures[0];
  const inputs = { ...f.inputs };
  delete inputs.positivePersistence;
  assert.equal(evaluate(f.strategy, inputs).qualified, false);
  assert.equal(
    evaluate(f.strategy, { ...f.inputs, expectedCostPct: -1 }).qualified,
    false,
  );
});
test("export serializes previously materialized facts without reevaluating", () => {
  const { service } = fixture();
  const snapshot = service.dashboard();
  service.dashboard = () => {
    throw new Error("Export must not invoke calculation/projection");
  };
  assert.equal(service.export().metadata.snapshotId, snapshot.revision);
});
for (const f of readJson("02-domain-rules/golden/golden-fixtures.v1.0.1.json")
  .fixtures) {
  test(`legacy regression ${f.id}`, () => {
    const i = { ...f.inputs };
    i.expectedCostPct =
      (i.feesPct ?? 0) +
      (i.slippagePct ?? 0) +
      (i.capitalBorrowCostPct ?? 0) +
      (i.exitSettlementCostPct ?? 0);
    i.reservePct =
      i.basisAdverseReservePct ??
      i.premiumDivergenceReservePct ??
      i.rebalanceReservePct ??
      0;
    if (f.strategy === "BASIS_CASH_CARRY" && i.grossBasisPct === undefined)
      i.grossBasisPct = (i.futureBidTop / i.spotAskTop - 1) * 100;
    if (f.strategy === "IDLE_CAPITAL_YIELD") {
      i.productTermReturnPct = termReturn(
        i.productAprPct,
        i.termDays,
        i.quoteType,
      );
      i.baselineTermReturnPct = termReturn(
        i.baselineAprPct,
        i.termDays,
        i.quoteType,
      );
      // Legacy yield fixture omitted capacity; this test supplies explicit synthetic capacity.
      i.capacityUsd = 20000;
    }
    const result = evaluate(f.strategy, i);
    matches(
      {
        ...result,
        grossBasisPct: i.grossBasisPct,
        productTermReturnPct: i.productTermReturnPct,
        baselineTermReturnPct: i.baselineTermReturnPct,
      },
      f.expected,
    );
  });
}
