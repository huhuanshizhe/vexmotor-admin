'use client';

import { useState, useEffect } from 'react';
import { SaveOutlined, GlobalOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons';
import { type Locale, SUPPORTED_LOCALES } from '@/lib/i18n';
import { getAvailableLocales } from '@/lib/i18n-formatter';

type TranslationEntry = {
  key: string;
  values: Record<Locale, string>;
};

export default function TranslationAdmin() {
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [selectedLocale, setSelectedLocale] = useState<Locale>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load translations on mount
  useEffect(() => {
    loadTranslations();
  }, []);

  const loadTranslations = async () => {
    try {
      // Load all locale files
      const [en, de, es] = await Promise.all([
        import('@/locales/en.json'),
        import('@/locales/de.json'),
        import('@/locales/es.json'),
      ]);

      const allKeys = extractAllKeys(en.default);
      const entries: TranslationEntry[] = allKeys.map((key) => ({
        key,
        values: {
          en: getNestedValue(en.default, key) || '',
          de: getNestedValue(de.default, key) || '',
          es: getNestedValue(es.default, key) || '',
        },
      }));

      setTranslations(entries);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  };

  const extractAllKeys = (obj: any, prefix = ''): string[] => {
    let keys: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys = keys.concat(extractAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  };

  const getNestedValue = (obj: any, path: string): string => {
    return path.split('.').reduce((current, key) => current?.[key], obj) || '';
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // In production, this would call an API to save translations
      // For now, we'll just show a success message
      alert('Translations saved successfully! (In production, this would update the JSON files)');
    } catch (error) {
      console.error('Failed to save translations:', error);
      alert('Failed to save translations');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (key: string, currentValue: string) => {
    setEditingKey(key);
    setEditValue(currentValue);
  };

  const handleSaveEdit = () => {
    if (!editingKey) return;

    setTranslations((prev) =>
      prev.map((entry) =>
        entry.key === editingKey
          ? { ...entry, values: { ...entry.values, [selectedLocale]: editValue } }
          : entry
      )
    );

    setEditingKey(null);
    setEditValue('');
  };

  const filteredTranslations = translations.filter(
    (entry) =>
      entry.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.values[selectedLocale]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTranslationStatus = (entry: TranslationEntry) => {
    const filled = Object.values(entry.values).filter(Boolean).length;
    const total = SUPPORTED_LOCALES.length;
    return `${filled}/${total}`;
  };

  return (
    <div className="translation-admin">
      <div className="admin-header">
        <div className="header-left">
          <GlobalOutlined style={{ fontSize: '24px', color: 'var(--brand-600)' }} />
          <h1>Translation Management</h1>
        </div>
        <button
          className="ui-button is-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          <SaveOutlined /> {isSaving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="toolbar-left">
          <label className="toolbar-label">Edit Language:</label>
          <select
            className="toolbar-select"
            value={selectedLocale}
            onChange={(e) => setSelectedLocale(e.target.value as Locale)}
          >
            {SUPPORTED_LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {locale.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-right">
          <div className="search-box">
            <SearchOutlined />
            <input
              type="text"
              placeholder="Search keys or translations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="translation-table-wrapper">
        <table className="data-table is-compact">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Translation Key</th>
              <th style={{ width: '40%' }}>{selectedLocale.toUpperCase()} Translation</th>
              <th style={{ width: '15%' }}>Status</th>
              <th style={{ width: '15%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTranslations.map((entry) => (
              <tr key={entry.key}>
                <td className="mono">{entry.key}</td>
                <td>
                  {editingKey === entry.key ? (
                    <div className="edit-mode">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="edit-input"
                        autoFocus
                      />
                      <button className="ui-button is-sm" onClick={handleSaveEdit}>
                        ✓
                      </button>
                    </div>
                  ) : (
                    <span className="translation-value">
                      {entry.values[selectedLocale] || (
                        <span className="missing-translation">Not translated</span>
                      )}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`status-badge status-${getTranslationStatus(entry)}`}>
                    {getTranslationStatus(entry)}
                  </span>
                </td>
                <td>
                  <button
                    className="ui-button is-ghost is-sm"
                    onClick={() => handleEdit(entry.key, entry.values[selectedLocale])}
                  >
                    <EditOutlined /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-footer">
        <p>Total: {translations.length} translation keys</p>
        <p>Showing: {filteredTranslations.length} keys</p>
      </div>

      <style jsx>{`
        .translation-admin {
          padding: var(--spacing-xl);
          max-width: 1400px;
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-xl);
          padding-bottom: var(--spacing-lg);
          border-bottom: 2px solid var(--color-border-primary);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .header-left h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }

        .admin-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-lg);
          gap: var(--spacing-md);
        }

        .toolbar-left,
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .toolbar-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .toolbar-select {
          padding: 6px 12px;
          border: 1px solid var(--color-border-primary);
          border-radius: var(--radius-sm);
          font-family: var(--font-sans);
          font-size: 0.875rem;
          cursor: pointer;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: 6px 12px;
          border: 1px solid var(--color-border-primary);
          border-radius: var(--radius-sm);
          background: var(--color-bg-primary);
          min-width: 300px;
        }

        .search-box input {
          flex: 1;
          border: none;
          outline: none;
          font-family: var(--font-sans);
          font-size: 0.875rem;
        }

        .translation-table-wrapper {
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .mono {
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }

        .translation-value {
          font-size: 0.875rem;
          color: var(--color-text-primary);
        }

        .missing-translation {
          color: var(--color-text-muted);
          font-style: italic;
        }

        .edit-mode {
          display: flex;
          gap: var(--spacing-xs);
        }

        .edit-input {
          flex: 1;
          padding: 4px 8px;
          border: 1px solid var(--brand-500);
          border-radius: var(--radius-sm);
          font-family: var(--font-sans);
          font-size: 0.875rem;
        }

        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-4\\/4 {
          background: var(--success-100);
          color: var(--success-700);
        }

        .status-3\\/4 {
          background: var(--warning-100);
          color: var(--warning-700);
        }

        .status-2\\/4,
        .status-1\\/4 {
          background: var(--danger-100);
          color: var(--danger-700);
        }

        .admin-footer {
          margin-top: var(--spacing-lg);
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--color-border-secondary);
          display: flex;
          gap: var(--spacing-xl);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        @media (max-width: 767px) {
          .translation-admin {
            padding: var(--spacing-md);
          }

          .admin-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-md);
          }

          .admin-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            min-width: 100%;
          }

          .translation-table-wrapper {
            overflow-x: auto;
          }

          .data-table {
            min-width: 800px;
          }
        }
      `}</style>
    </div>
  );
}
