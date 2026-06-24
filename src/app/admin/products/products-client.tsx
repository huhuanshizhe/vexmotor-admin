'use client';

import { ProductEditorModal } from '@/components/products/product-editor-modal';
import { ProductListClient } from '@/components/products/product-list-client';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import type { ProductListQuery } from '@/lib/product-list-query';
import type { AdminProductListItem, AdminProductTranslation } from '@/lib/product-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

import type { ProductListState } from '@/components/products/product-list-client';

type AdminProductsClientProps = {
  initialList: ProductListState;
  initialQuery: ProductListQuery;
  brandOptions: Array<{ label: string; value: string }>;
  categoryTree: AdminCategoryTreeNode[];
  activeLanguages: AdminSiteLanguageRow[];
};

export function AdminProductsClient({
  initialList,
  initialQuery,
  brandOptions,
  categoryTree,
  activeLanguages,
}: AdminProductsClientProps) {
  return (
    <ProductListClient
      initialList={initialList}
      initialQuery={initialQuery}
      activeLanguages={activeLanguages}
      brandOptions={brandOptions}
      categoryTree={categoryTree}
      renderEditorModal={({ open, editingEntry, onClose, onSaved }) => (
        <ProductEditorModal
          open={open}
          editingEntry={editingEntry}
          activeLanguages={activeLanguages}
          brandOptions={brandOptions}
          categoryTree={categoryTree}
          onClose={onClose}
          onSaved={onSaved as (entry: AdminProductTranslation) => void}
        />
      )}
    />
  );
}
