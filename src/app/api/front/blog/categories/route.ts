import { NextResponse } from 'next/server';

import { blogCategoryCatalog } from '@/lib/blog-categories';
import { frontCorsHeaders } from '@/lib/front-cors';

export async function GET() {
  return NextResponse.json(
    { items: blogCategoryCatalog },
    { headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
