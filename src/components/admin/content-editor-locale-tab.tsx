'use client';

import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type ContentEditorLocaleTabProps = {
  language: AdminSiteLanguageRow;
  isActive: boolean;
  persisted?: boolean;
  onClick: () => void;
};

export function ContentEditorLocaleTab({
  language,
  isActive,
  persisted = false,
  onClick,
}: ContentEditorLocaleTabProps) {
  return (
    <button
      type="button"
      className={`content-editor-locale-tab${isActive ? ' is-active' : ''}`}
      onClick={onClick}
    >
      <span className="content-editor-locale-tab__label">{language.nativeName}</span>
      <span
        className={`content-editor-locale-tab__mark${persisted ? ' is-persisted' : ''}`}
        aria-hidden={!persisted}
      >
        ✓
      </span>
    </button>
  );
}
