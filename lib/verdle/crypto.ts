import crypto from "crypto";

function getWordKey(): Buffer {
  const secret = process.env.VERDLE_WORD_SECRET;
  if (!secret) {
    throw new Error("Missing env var VERDLE_WORD_SECRET");
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

/**
 * Encrypts a 5-letter word using AES-256-GCM.
 * Output format: base64url(iv).base64url(tag).base64url(ciphertext)
 */
export function encryptWord(word: string): string {
  const key = getWordKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(word, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptWord(payload: string): string {
  const key = getWordKey();
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid ciphertext payload");
  }
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
}

