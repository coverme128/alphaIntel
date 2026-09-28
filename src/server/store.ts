import {
  mkdirSync,
  existsSync,
  readFileSync,
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
  renameSync,
} from "node:fs";
import path from "node:path";
import type { State } from "../domain/types";
import { initialState } from "./seed";
import { hash } from "./contracts";
export class Store {
  private state: State;
  constructor(private file: string | null) {
    this.state =
      file && existsSync(file)
        ? JSON.parse(readFileSync(file, "utf8"))
        : initialState();
    if (this.state.version !== 1) throw new Error("UNSUPPORTED_STATE_VERSION");
    let previous = "GENESIS";
    for (const event of this.state.events) {
      const { hash: digest, ...body } = event;
      if (body.previousHash !== previous || hash(body) !== digest)
        throw new Error("AUDIT_INTEGRITY_FAILURE");
      previous = digest;
    }
    if (file && !existsSync(file)) this.persist(this.state);
  }
  read(): State {
    return structuredClone(this.state);
  }
  transaction<T>(fn: (draft: State) => T): T {
    const draft = this.read();
    const result = fn(draft);
    this.persist(draft);
    this.state = draft;
    return result;
  }
  private persist(state: State) {
    if (!this.file) return;
    mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 });
    const tmp = this.file + ".tmp";
    const fd = openSync(tmp, "w", 0o600);
    try {
      writeFileSync(fd, JSON.stringify(state));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, this.file);
  }
}
export function audit(
  s: State,
  type: string,
  subjectId: string,
  details: Record<string, unknown>,
  at: string,
) {
  const body = {
    id: `event-${s.events.length + 1}`,
    at,
    type,
    subjectId,
    details,
    previousHash: s.events.at(-1)?.hash ?? "GENESIS",
  };
  s.events.push({ ...body, hash: hash(body) });
}
