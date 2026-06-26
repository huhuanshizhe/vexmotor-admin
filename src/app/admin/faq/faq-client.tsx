'use client';

import {
  BoardContentListClient,
  type BoardContentListState,
} from '@/components/editorial/board-content-list-client';
import { FaqEditorModal } from '@/components/editorial/faq-editor-modal';
import type { AdminListQuery } from '@/lib/admin-list-query';
import type { AdminEditorialDashboard } from '@/lib/editorial-automation';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

export function AdminFaqClient({
  initialDashboard,
  initialList,
  initialQuery,
  activeLanguages,
}: {
  initialDashboard: AdminEditorialDashboard;
  initialList: BoardContentListState;
  initialQuery: AdminListQuery;
  activeLanguages: AdminSiteLanguageRow[];
}) {
  return (
    <BoardContentListClient
      basePath="/admin/faq"
      contentModule="faq"
      newButtonLabel="新建 FAQ"
      showSlugColumn={false}
      initialDashboard={initialDashboard}
      initialList={initialList}
      initialQuery={initialQuery}
      activeLanguages={activeLanguages}
      renderEditorModal={(props) => (
        <FaqEditorModal
          open={props.open}
          boardKey={props.boardKey}
          boardLabel={props.boardLabel}
          availableBoards={props.availableBoards}
          activeLanguages={activeLanguages}
          editingEntry={props.editingEntry}
          onClose={props.onClose}
          onSaved={props.onSaved}
        />
      )}
    />
  );
}
