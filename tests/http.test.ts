import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server/app";
import { Service } from "../src/server/service";
import { Store } from "../src/server/store";
import { normalizeBook } from "../src/server/market";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
test("HTTP mutation protection and paper journey", async () => {
  const app = createApp(new Service(new Store(null)));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const port = (server.address() as any).port,
    url = `http://127.0.0.1:${port}`;
  try {
    const d = await (await fetch(url + "/api/dashboard")).json();
    const request = {
      opportunityId: d.opportunities[0].id,
      amountUsd: 5000,
      requestId: "http-request-001",
      mode: "PAPER",
    };
    const send = (body: any, extra: Record<string, string> = {}) =>
      fetch(url + "/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Alpha-Client": "owner-ui",
          ...extra,
        },
        body: JSON.stringify(body),
      });
    assert.equal((await send(request, { "X-Alpha-Client": "" })).status, 403);
    assert.equal(
      (await send(request, { Origin: "https://evil.example" })).status,
      403,
    );
    assert.equal((await send({ ...request, mode: "AUTO" })).status, 403);
    const opened = await send(request);
    assert.equal(opened.status, 201);
    const p = await opened.json();
    const closed = await fetch(url + `/api/positions/${p.id}/close`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Alpha-Client": "owner-ui",
      },
      body: "{}",
    });
    assert.equal(closed.status, 200);
    const exported = await fetch(url + "/api/export");
    assert.ok(exported.headers.get("content-disposition")?.endsWith('.json"'));
    assert.equal((await exported.json()).positions[0].status, "CLOSED");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  }
});
test("four venue book adapters normalize recorded responses; invalid/stale fail closed", () => {
  const now = Date.now(),
    responses = {
      OKX: {
        code: "0",
        data: [
          {
            bids: [["100", "2", "0", "1"]],
            asks: [["101", "3", "0", "1"]],
            ts: String(now),
          },
        ],
      },
      Binance: {
        lastUpdateId: 123,
        bids: [["100", "2"]],
        asks: [["101", "3"]],
      },
      Bybit: {
        retCode: 0,
        result: { b: [["100", "2"]], a: [["101", "3"]], ts: now },
      },
      Hyperliquid: {
        time: now,
        levels: [[{ px: "100", sz: "2" }], [{ px: "101", sz: "3" }]],
      },
    };
  for (const venue of Object.keys(responses) as (keyof typeof responses)[]) {
    const b = normalizeBook(venue, responses[venue], now);
    assert.equal(b.bids[0][0], 100);
    assert.equal(b.asks[0][1], 3);
    assert.equal(b.executable, false);
  }
  assert.throws(
    () =>
      normalizeBook(
        "OKX",
        {
          code: "0",
          data: [{ bids: [["100", "2"]], asks: [["101", "3"]], ts: "1" }],
        },
        now,
      ),
    /STALE/,
  );
  assert.throws(
    () =>
      normalizeBook(
        "Binance",
        { bids: [["102", "2"]], asks: [["101", "3"]] },
        now,
      ),
    /INVALID/,
  );
});
test("state survives restart and tampered audit event is rejected", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "alpha-test-")),
    file = path.join(dir, "state.json");
  try {
    const service = new Service(new Store(file));
    service.setKillSwitch(true);
    assert.equal(new Store(file).read().killSwitch, true);
    const s = JSON.parse(readFileSync(file, "utf8"));
    s.events[0].type = "ALTERED";
    writeFileSync(file, JSON.stringify(s));
    assert.throws(() => new Store(file), /AUDIT_INTEGRITY_FAILURE/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
