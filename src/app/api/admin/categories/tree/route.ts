import { NextRequest, NextResponse } from 'next/server';



import {

  getAdminCategoryStats,

  getAdminCategoryTree,

  getAdminCategoryTreeLevel,

  searchAdminCategoryTreeByName,

} from '@/server/admin/categories';



export async function GET(request: NextRequest) {

  const keyword = request.nextUrl.searchParams.get('keyword')?.trim() ?? '';

  const parentId = request.nextUrl.searchParams.get('parent_id');

  const full = request.nextUrl.searchParams.get('full') === '1';



  if (keyword) {

    const matches = await searchAdminCategoryTreeByName(keyword);

    return NextResponse.json({ matches });

  }



  if (full) {

    const [tree, stats] = await Promise.all([

      getAdminCategoryTree(),

      getAdminCategoryStats(),

    ]);

    return NextResponse.json({ tree, stats });

  }



  if (parentId) {

    const nodes = await getAdminCategoryTreeLevel(parentId);

    return NextResponse.json({ nodes });

  }



  const [tree, stats] = await Promise.all([

    getAdminCategoryTreeLevel(null),

    getAdminCategoryStats(),

  ]);

  return NextResponse.json({ tree, stats });

}

