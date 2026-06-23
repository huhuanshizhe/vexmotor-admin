import { Suspense } from 'react';

import { AdminFaqClient } from './faq-client';

import { parseAdminListQuery } from '@/lib/admin-list-query';
import { filterCoverageByModule } from '@/lib/editorial-content';
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

  const faqBoards = filterCoverageByModule(dashboard.coverage, 'faq');
  const filteredDashboard = { ...dashboard, coverage: faqBoards };
  const boardKeys = new Set(faqBoards.map((board) => board.key));
  const defaultBoard = faqBoards[0]?.key ?? '';
  const initialQuery = parseAdminListQuery(params, { defaultBoard });
  const boardKey = initialQuery.board && boardKeys.has(initialQuery.board) ? initialQuery.board : defaultBoard;
  const initialList = await getAdminEditorialContentListPaginated({
    contentModule: 'faq',
    boardKey: boardKey || defaultBoard,
    keyword: initialQuery.keyword || undefined,
    page: initialQuery.page,
    pageSize: initialQuery.pageSize,
    knownBoardKeys: faqBoards.map((board) => board.key),
  });

  const activeLanguages = siteLanguages.filter((language) => language.status === 'active');

  return (
    <AdminFaqClient
      initialDashboard={filteredDashboard}
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
