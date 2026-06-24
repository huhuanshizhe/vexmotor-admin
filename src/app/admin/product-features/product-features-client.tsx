'use client';

import { FeatureDefinitionEditorModal } from '@/components/feature-definitions/feature-definition-editor-modal';
import {
  FeatureDefinitionListClient,
  type FeatureDefinitionListState,
} from '@/components/feature-definitions/feature-definition-list-client';
import type { AdminListQuery } from '@/lib/admin-list-query';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

export function AdminProductFeaturesClient({
  initialList,
  initialQuery,
  activeLanguages,
}: {
  initialList: FeatureDefinitionListState;
  initialQuery: AdminListQuery;
  activeLanguages: AdminSiteLanguageRow[];
}) {
  return (
    <FeatureDefinitionListClient
      initialList={initialList}
      initialQuery={initialQuery}
      activeLanguages={activeLanguages}
      renderEditorModal={(props) => (
        <FeatureDefinitionEditorModal
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
