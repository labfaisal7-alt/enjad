import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function normalizeLoginIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, passwordHash) {
  const [salt, originalHash] = String(passwordHash || "").split(":");
  if (!salt || !originalHash) return false;
  const candidateHash = scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHash, "hex");
  return originalBuffer.length === candidateHash.length && timingSafeEqual(originalBuffer, candidateHash);
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, password, ...safeUser } = user;
  return safeUser;
}
