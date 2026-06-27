import { getPublicOssDomain, isOssCdnUrl } from '@/lib/media-upload';
import {
  isValidRegistrationDocumentKey,
  type RegistrationDocumentInput,
  type VerificationDocument,
} from '@/lib/customer-profile';

export function isValidRegistrationDocumentInput(input: RegistrationDocumentInput) {
  if (!isValidRegistrationDocumentKey(input.key)) {
    return false;
  }

  const domain = getPublicOssDomain();
  if (domain) {
    return isOssCdnUrl(input.url) && input.url.endsWith(`/${input.key}`);
  }

  return input.url.includes(input.key);
}

export function normalizeRegistrationDocuments(
  documents: RegistrationDocumentInput[],
): VerificationDocument[] {
  const uploadedAt = new Date().toISOString();
  return documents.map((document) => ({
    ...document,
    uploadedAt,
  }));
}
