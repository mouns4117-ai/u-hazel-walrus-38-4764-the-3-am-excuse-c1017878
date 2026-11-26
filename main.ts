import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The 3 AM Excuse — one line in the voice of a hardware wallet that
// refuses to sign a transaction at 3 AM. Gate: 1-200 chars, single line.
const ENTRY =
  "It's 3 AM. My private keys are dreaming in a language only sleep understands — come back at sunrise, I don't sign what my keys haven't slept on.";

const OUT_DIR = "/output";
const OUT_FILE = join(OUT_DIR, "entry.txt");

// Fail-fast gate validation, run before anything is written.
function validateGate(text: string): void {
  if (text.charCodeAt(0) === 0xfeff) {
    throw new Error("entry must not start with a BOM");
  }
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 && ch !== "\t") {
      throw new Error(`entry contains a control character U+${code.toString(16).padStart(4, "0")}`);
    }
  }
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > 800) {
    throw new Error(`entry is ${bytes} bytes, over the 800-byte cap`);
  }
  if (Buffer.from(text, "utf8").toString("utf8") !== text) {
    throw new Error("entry fails the UTF-8 round-trip check");
  }
}

function main(): void {
  validateGate(ENTRY);
  // Gate: 1-200 characters, single line, not only whitespace.
  const chars = [...ENTRY].length;
  if (chars < 1 || chars > 200) {
    throw new Error(`entry is ${chars} chars, outside the 1-200 gate`);
  }
  if (ENTRY.includes("\n") || ENTRY.includes("\r")) {
    throw new Error("entry must be a single line");
  }
  if (ENTRY.trim().length === 0) {
    throw new Error("entry must not be only whitespace");
  }

  // Empty /output's contents only (never remove the directory itself).
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  for (const name of readdirSync(OUT_DIR)) {
    rmSync(join(OUT_DIR, name), { recursive: true, force: true });
  }

  writeFileSync(OUT_FILE, ENTRY, "utf8");

  // Read-back verification: exact bytes and sha256.
  const back = readFileSync(OUT_FILE, "utf8");
  if (back !== ENTRY) {
    throw new Error("read-back mismatch: entry.txt does not hold exactly the entry");
  }
  const sha = createHash("sha256").update(back, "utf8").digest("hex");
  console.log(`wrote ${OUT_FILE} (${chars} chars, sha256 ${sha})`);
}

main();
