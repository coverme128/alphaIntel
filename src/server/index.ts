import express from "express";
import { PersonalService } from "../personal/service";
import path from "node:path";
import { createApp } from "./app";
import { Store } from "./store";
import { Service } from "./service";
import { PublicMarketManager } from "../market/manager";
const service = new Service(
  new Store(
    path.resolve(process.env.ALPHA_DATA_DIR ?? ".data", "paper-state.json"),
  ),
);
const publicMarket = new PublicMarketManager(
  path.resolve(process.env.ALPHA_DATA_DIR ?? ".data", "public-market.json"),
  undefined,
  (process.env.ALPHA_ASSETS ?? "BTC,ETH").split(",").map((a) => a.trim()),
);
const personal = new PersonalService(
  path.resolve(process.env.ALPHA_DATA_DIR ?? ".data", "personal-books.json"),
  publicMarket.policy,
);
const personalTimer = setInterval(() => {
  try {
    personal.sync(publicMarket.observation());
  } catch (e) {
    console.error("Personal settlement:", (e as Error).message);
  }
}, 15000);
personalTimer.unref();
const app = createApp(service, publicMarket, personal);
if (process.env.ALPHA_PUBLIC_AUTOSTART === "true")
  void publicMarket
    .start()
    .catch((e) => console.error("Public market:", e.message));
process.once("SIGTERM", () => {
  publicMarket.stop();
  process.exit(0);
});
process.once("SIGINT", () => {
  publicMarket.stop();
  process.exit(0);
});
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve("dist")));
  app.get("*", (_, res) => res.sendFile(path.resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT ?? 4317);
app.listen(port, "127.0.0.1", () =>
  console.log(`Alpha Capital OS · PAPER · http://127.0.0.1:${port}`),
);
