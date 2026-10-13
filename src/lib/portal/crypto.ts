import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { TOTP, Secret } from "otpauth";
import { portalConfig } from "./config";
export function randomToken() {
  return randomBytes(32).toString("base64url");
}
export function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function equalSecret(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function privateHash(value: string) {
  return createHmac(
    "sha256",
    Buffer.from(portalConfig().PORTAL_ENCRYPTION_KEY, "base64"),
  )
    .update(value)
    .digest("hex");
}
export function encrypt(value: string, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(portalConfig().PORTAL_ENCRYPTION_KEY, "base64"),
    iv,
  );
  cipher.setAAD(Buffer.from(context));
  const payload = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    payload.toString("base64"),
  ].join(":");
}
export function decrypt(value: string, context: string) {
  const [version, iv, tag, payload] = value.split(":");
  if (version !== "v1" || !iv || !tag || !payload)
    throw new Error("Invalid encrypted record");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(portalConfig().PORTAL_ENCRYPTION_KEY, "base64"),
    Buffer.from(iv, "base64"),
  );
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    cipher.update(Buffer.from(payload, "base64")),
    cipher.final(),
  ]).toString("utf8");
}
export function hashPassword(password: string) {
  return hash(password, {
    algorithm: 2 /* Argon2id */,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
}
export async function verifyPassword(encoded: string, password: string) {
  try {
    return await verify(encoded, password);
  } catch {
    return false;
  }
}
export function makeTotp(secret: string, email: string) {
  return new TOTP({
    issuer: "Alabbas",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}
export function newTotpSecret() {
  return new Secret({ size: 20 }).base32;
}
export function validateTotp(
  secret: string,
  email: string,
  code: string,
  now = Date.now(),
) {
  if (!/^\d{6}$/.test(code)) return null;
  const delta = makeTotp(secret, email).validate({
    token: code,
    timestamp: now,
    window: 1,
  });
  return delta === null ? null : BigInt(Math.floor(now / 30000) + delta);
}
