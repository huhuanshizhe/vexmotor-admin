'use client';

import { BrandEditorModal } from '@/components/brands/brand-editor-modal';
import { BrandListClient, type BrandListState } from '@/components/brands/brand-list-client';
import type { AdminListQuery } from '@/lib/admin-list-query';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

export function AdminBrandsClient({
  initialList,
  initialQuery,
  activeLanguages,
}: {
  initialList: BrandListState;
  initialQuery: AdminListQuery;
  activeLanguages: AdminSiteLanguageRow[];
}) {
  return (
    <BrandListClient
      initialList={initialList}
      initialQuery={initialQuery}
      activeLanguages={activeLanguages}
      renderEditorModal={(props) => (
        <BrandEditorModal
          open={props.open}
          activeLanguages={activeLanguages}
          editingEntry={props.editingEntry}
          onClose={props.onClose}
          onSaved={props.onSaved}
        />
      )}
    />
  );
}
