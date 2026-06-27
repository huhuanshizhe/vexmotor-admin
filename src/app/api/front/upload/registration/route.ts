import { NextRequest, NextResponse } from 'next/server';

import { REGISTRATION_UPLOAD_FOLDER, REGISTRATION_UPLOAD_MIME_TYPES } from '@/lib/customer-profile';
import { frontCorsHeaders } from '@/lib/front-cors';
import { MAX_DOCUMENT_UPLOAD_BYTES } from '@/lib/media-upload';
import { validateMediaUploadFile } from '@/server/upload/validate-media-upload';
import { uploadToOss } from '@/server/oss';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400, headers: frontCorsHeaders() },
      );
    }

    const validation = validateMediaUploadFile(file, {
      allowedMimeTypes: REGISTRATION_UPLOAD_MIME_TYPES,
      maxBytes: MAX_DOCUMENT_UPLOAD_BYTES,
    });

    if (!validation.ok) {
      return NextResponse.json(
        { message: validation.message },
        { status: 400, headers: frontCorsHeaders() },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToOss({
      buffer,
      filename: file.name,
      contentType: file.type,
      folder: REGISTRATION_UPLOAD_FOLDER,
    });

    if (!result.ok) {
      return NextResponse.json(
        { message: result.error },
        { status: 500, headers: frontCorsHeaders() },
      );
    }

    return NextResponse.json(
      {
        url: result.url,
        key: result.key,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      },
      { headers: frontCorsHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: `Upload failed: ${message}` },
      { status: 500, headers: frontCorsHeaders() },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
