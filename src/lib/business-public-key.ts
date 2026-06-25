import { randomBytes } from 'node:crypto';

const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type BusinessKeyPrefix = 'CPN' | 'VM' | 'BAT' | 'INV';

function createRandomSuffix(length: number) {
  const bytes = randomBytes(length);
  let result = '';
  for (let index = 0; index < length; index += 1) {
    result += KEY_ALPHABET[bytes[index]! % KEY_ALPHABET.length];
  }
  return result;
}

/** Format: {PREFIX}-{timestamp}-{randomSuffix} */
export function createBusinessPublicKey(prefix: BusinessKeyPrefix, options?: { suffixLength?: number }) {
  const suffixLength = options?.suffixLength ?? 6;
  return `${prefix}-${Date.now()}-${createRandomSuffix(suffixLength)}`;
}

export function normalizeBusinessPublicKey(value: string) {
  return value.trim().toUpperCase();
}
