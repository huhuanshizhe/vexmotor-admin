'use client';

import { ContentEditorModal } from '@/components/editorial/content-editor-modal';
import {
  BoardContentListClient,
  type BoardContentListState,
} from '@/components/editorial/board-content-list-client';
import type { AdminListQuery } from '@/lib/admin-list-query';
import type { AdminEditorialDashboard } from '@/lib/editorial-automation';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

export function AdminEditorialClient({
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
      basePath="/admin/editorial"
      contentModule="editorial"
      newButtonLabel="新建内容"
      showSlugColumn
      initialDashboard={initialDashboard}
      initialList={initialList}
      initialQuery={initialQuery}
      activeLanguages={activeLanguages}
      renderEditorModal={(props) => (
        <ContentEditorModal
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
