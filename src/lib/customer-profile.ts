export type VerificationDocument = {
  url: string;
  key: string;
  filename: string;
  contentType: string;
  uploadedAt: string;
};

/** 注册提交时的证件对象（不含 uploadedAt，由服务端补全） */
export type RegistrationDocumentInput = {
  url: string;
  key: string;
  filename: string;
  contentType: string;
};

export const REGISTRATION_UPLOAD_FOLDER = 'registrations/documents';

export const REGISTRATION_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export function isValidRegistrationDocumentKey(key: string) {
  return key.startsWith(`${REGISTRATION_UPLOAD_FOLDER}/`);
}
