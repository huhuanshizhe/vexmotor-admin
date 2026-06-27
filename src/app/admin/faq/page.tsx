import { Suspense } from 'react';

import { AdminFaqClient } from './faq-client';

import { parseAdminListQuery } from '@/lib/admin-list-query';
import { getAdminEditorialContentListPaginated } from '@/server/admin/editorial-content';
import { getAdminEditorialDashboard } from '@/server/admin/editorial';
import { getAdminSiteLanguages } from '@/server/admin/languages';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function FaqPageContent({ searchParams }: PageProps) {
  const [dashboard, siteLanguages, params] = await Promise.all([
    getAdminEditorialDashboard(),
    getAdminSiteLanguages(),
    searchParams,
  ]);

  const boardKeys = new Set(dashboard.coverage.map((board) => board.key));
  const defaultBoard = dashboard.coverage[0]?.key ?? '';
  const initialQuery = parseAdminListQuery(params, { defaultBoard });
  const boardKey = initialQuery.board && boardKeys.has(initialQuery.board) ? initialQuery.board : defaultBoard;
  const initialList = await getAdminEditorialContentListPaginated({
    contentModule: 'faq',
    boardKey: boardKey || defaultBoard,
    keyword: initialQuery.keyword || undefined,
    page: initialQuery.page,
    pageSize: initialQuery.pageSize,
    knownBoardKeys: dashboard.coverage.map((board) => board.key),
  });

  const activeLanguages = siteLanguages.filter((language) => language.status === 'active');

  return (
    <AdminFaqClient
      initialDashboard={dashboard}
      initialList={initialList}
      initialQuery={{ ...initialQuery, board: boardKey || defaultBoard }}
      activeLanguages={activeLanguages}
    />
  );
}

export default function AdminFaqPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <FaqPageContent searchParams={searchParams} />
    </Suspense>
  );
}
