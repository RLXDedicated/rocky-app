#!/usr/bin/env node
// Opens an encrypted Rocky chat backup (chat-YYYY-MM-DD.enc.json).
// Usage: ROCKY_CHAT_BACKUP_KEY=<the key from Railway> node tools/decrypt-chat-backup.mjs chat-2026-09-28.enc.json > chat-2026-09-28.json
import { readFileSync } from "node:fs";
import { createDecipheriv, createHash } from "node:crypto";

const file = process.argv[2];
const key = process.env.ROCKY_CHAT_BACKUP_KEY;
if (!file || !key) {
  console.error(
    "Usage: ROCKY_CHAT_BACKUP_KEY=<key> node tools/decrypt-chat-backup.mjs <chat-YYYY-MM-DD.enc.json>",
  );
  process.exit(1);
}
const sealed = JSON.parse(readFileSync(file, "utf8"));
if (sealed.alg !== "aes-256-gcm") {
  // Not encrypted (written before a key was configured): print as is.
  process.stdout.write(JSON.stringify(sealed, null, 2));
  process.exit(0);
}
const decipher = createDecipheriv(
  "aes-256-gcm",
  createHash("sha256").update(key).digest(),
  Buffer.from(sealed.iv, "base64"),
);
decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
const plain = Buffer.concat([
  decipher.update(Buffer.from(sealed.data, "base64")),
  decipher.final(),
]).toString("utf8");
process.stdout.write(JSON.stringify(JSON.parse(plain), null, 2));
