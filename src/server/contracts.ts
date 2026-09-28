import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parse } from "yaml";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
export const SPEC = path.resolve(
  "specs/alpha-opportunity-capital-os-commercial-v1.0.7",
);
export const hash = (v: unknown): string =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
export const readJson = (p: string) =>
  JSON.parse(readFileSync(path.join(SPEC, p), "utf8"));
export const allocationPolicy = parse(
  readFileSync(
    path.join(SPEC, "02-domain-rules/config/allocation-policy.v1.0.1.yaml"),
    "utf8",
  ),
);
export const CONFIG_HASH = hash(
  readdirSync(path.join(SPEC, "02-domain-rules/config"))
    .sort()
    .map((f) => [
      f,
      readFileSync(path.join(SPEC, "02-domain-rules/config", f), "utf8"),
    ]),
);
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
export const validateExport = ajv.compile(
  readJson(
    "02-domain-rules/schemas/decision-analysis-export.v1.0.7.schema.json",
  ),
);
export const validateAction = ajv.compile(
  readJson("02-domain-rules/schemas/owner-action-card.v1.0.6.schema.json"),
);
export function validateAllSchemas() {
  let count = 0;
  function walk(dir: string) {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) walk(p);
      else if (d.name.endsWith(".schema.json")) {
        const instance = new Ajv2020({ strict: false });
        addFormats(instance);
        instance.compile(JSON.parse(readFileSync(p, "utf8")));
        count++;
      }
    }
  }
  walk(path.join(SPEC, "02-domain-rules"));
  return count;
}
