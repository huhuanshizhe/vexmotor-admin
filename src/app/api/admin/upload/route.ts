import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth/admin-auth';
import {
  DOCUMENT_UPLOAD_MIME_TYPES,
  IMAGE_UPLOAD_MIME_TYPES,
  MAX_DOCUMENT_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  VIDEO_UPLOAD_MIME_TYPES,
  defaultUploadFolder,
  type MediaUploadKind,
} from '@/lib/media-upload';
import { uploadToOss } from '@/server/oss';

const KIND_MIME_MAP: Record<MediaUploadKind, readonly string[]> = {
  image: IMAGE_UPLOAD_MIME_TYPES,
  video: VIDEO_UPLOAD_MIME_TYPES,
  document: DOCUMENT_UPLOAD_MIME_TYPES,
};

const KIND_SIZE_MAP: Record<MediaUploadKind, number> = {
  image: MAX_IMAGE_UPLOAD_BYTES,
  video: MAX_VIDEO_UPLOAD_BYTES,
  document: MAX_DOCUMENT_UPLOAD_BYTES,
};

function parseKind(value: FormDataEntryValue | null): MediaUploadKind | null {
  if (value === 'image' || value === 'video' || value === 'document') {
    return value;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string | null;
    const kindInput = parseKind(formData.get('kind'));

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    const inferredKind = (IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)
      ? 'image'
      : (VIDEO_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)
        ? 'video'
        : (DOCUMENT_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)
          ? 'document'
          : null;
    const kind = kindInput ?? inferredKind;

    if (!kind) {
      return NextResponse.json({ message: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    if (!KIND_MIME_MAP[kind].includes(file.type)) {
      return NextResponse.json({ message: `File type not allowed for ${kind}: ${file.type}` }, { status: 400 });
    }

    const maxSize = KIND_SIZE_MAP[kind];
    if (file.size > maxSize) {
      return NextResponse.json({ message: `File too large (max ${Math.round(maxSize / (1024 * 1024))} MB)` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToOss({
      buffer,
      filename: file.name,
      contentType: file.type,
      folder: folder ?? defaultUploadFolder(kind),
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: 500 });
    }

    return NextResponse.json({
      url: result.url,
      key: result.key,
      filename: file.name,
      size: file.size,
      contentType: file.type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: `Upload failed: ${message}` }, { status: 500 });
  }
}
