import { NextResponse } from 'next/server';

import { getPublishedBlogPosts } from '@/server/content/blog';
import { getSupportCatalog } from '@/server/content/support';
import { getCategories, getProductList } from '@/server/storefront';

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return { 'Access-Control-Allow-Origin': origin };
}

export async function GET() {
  const [categories, products, blogPosts, supportCatalog] = await Promise.all([
    getCategories(),
    getProductList({ page: 1, pageSize: 1000 }),
    getPublishedBlogPosts(),
    getSupportCatalog(),
  ]);

  return NextResponse.json(
    {
      categories,
      products: products.items,
      blogPosts,
      supportArticles: supportCatalog.pages,
    },
    { headers: corsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
