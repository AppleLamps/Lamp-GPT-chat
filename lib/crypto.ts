import crypto from 'crypto';

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || '';
  if (!secret) throw new Error('Missing ENCRYPTION_KEY env var');
  // Accept base64 or hex or raw string; normalize to 32 bytes
  try {
    const buf = secret.length === 64 ? Buffer.from(secret, 'hex') : Buffer.from(secret, 'base64');
    if (buf.length >= 32) return buf.subarray(0, 32);
  } catch {}
  const raw = Buffer.from(secret);
  const out = Buffer.alloc(32);
  raw.copy(out);
  return out;
}

export function encrypt(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(payload: string): string {
  const key = getKey();
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}


