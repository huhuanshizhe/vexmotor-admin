export type MediaUploadValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateMediaUploadFile(
  file: File,
  options: {
    allowedMimeTypes: readonly string[];
    maxBytes: number;
  },
): MediaUploadValidationResult {
  if (!options.allowedMimeTypes.includes(file.type)) {
    return { ok: false, message: `File type not allowed: ${file.type || 'unknown'}` };
  }

  if (file.size > options.maxBytes) {
    const maxMb = Math.round(options.maxBytes / (1024 * 1024));
    return { ok: false, message: `File too large (max ${maxMb} MB)` };
  }

  return { ok: true };
}
