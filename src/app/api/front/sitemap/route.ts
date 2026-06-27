import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontBoardBlogs } from '@/server/storefront/editorial-content';
import { getSupportCatalog } from '@/server/content/support';
import { getCategories, getProductList } from '@/server/storefront';

export async function GET(request: NextRequest) {
  const locale = resolveFrontRequestLocale(request);
  const [categories, products, blogBoard, supportCatalog] = await Promise.all([
    getCategories(),
    getProductList({ page: 1, pageSize: 1000 }),
    getStorefrontBoardBlogs('blog', locale),
    getSupportCatalog(),
  ]);

  return NextResponse.json(
    {
      categories,
      products: products.items,
      blogPosts: blogBoard.items,
      supportArticles: supportCatalog.pages,
    },
    { headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
