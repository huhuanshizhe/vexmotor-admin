import { createHash } from 'crypto';

export function md5Hash(value: string): string {
  return createHash('md5').update(value).digest('hex');
}

export function compareMd5(plainText: string, storedMd5: string): boolean {
  return md5Hash(plainText) === storedMd5;
}
