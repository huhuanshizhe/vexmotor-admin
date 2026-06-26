'use client';

import { Checkbox, Input, Modal, Radio, Tree, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { AdminCategoryTreeNode } from '@/lib/category-content';
import {
  buildCategoryFlatIndex,
  buildCategoryPickerTreeData,
  filterCategoryFlatIndex,
  getCategoryRootKeys,
  toCategoryTreeCheckData,
} from '@/lib/category-picker';

type CategoryPickerModalProps = {
  open: boolean;
  mode: 'single' | 'multiple';
  categoryTree: AdminCategoryTreeNode[];
  disabledIds?: ReadonlySet<string>;
  onCancel: () => void;
  onConfirm: (ids: string[]) => void;
};

export function CategoryPickerModal({
  open,
  mode,
  categoryTree,
  disabledIds = new Set(),
  onCancel,
  onConfirm,
}: CategoryPickerModalProps) {
  const [keyword, setKeyword] = useState('');
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const flatIndex = useMemo(() => buildCategoryFlatIndex(categoryTree), [categoryTree]);

  const baseTreeData = useMemo(
    () => buildCategoryPickerTreeData(categoryTree, disabledIds),
    [categoryTree, disabledIds],
  );

  const treeData = useMemo(
    () => toCategoryTreeCheckData(baseTreeData),
    [baseTreeData],
  );

  const searchResults = useMemo(() => {
    const normalized = keyword.trim();
    if (!normalized) return [];
    return filterCategoryFlatIndex(flatIndex, normalized).filter((item) => !disabledIds.has(item.id));
  }, [flatIndex, keyword, disabledIds]);

  const isSearchMode = keyword.trim().length > 0;
  const isSingleMode = mode === 'single';

  useEffect(() => {
    if (!open) return;
    setKeyword('');
    setPendingKeys([]);
    setExpandedKeys(getCategoryRootKeys(categoryTree));
  }, [open, categoryTree]);

  function handleOk() {
    onConfirm(pendingKeys);
  }

  function applyPendingKeys(nextKeys: string[]) {
    if (isSingleMode) {
      setPendingKeys(nextKeys.length ? [nextKeys[nextKeys.length - 1]!] : []);
      return;
    }
    setPendingKeys(nextKeys);
  }

  return (
    <Modal
      title="选择分类"
      open={open}
      width={520}
      destroyOnHidden
      okText="确定"
      cancelText="取消"
      onCancel={onCancel}
      onOk={handleOk}
      okButtonProps={{ disabled: pendingKeys.length === 0 }}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <Input
          allowClear
          placeholder="搜索分类"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />

        {isSearchMode ? (
          <div className="category-picker-modal__search-list">
            {searchResults.length ? (
              isSingleMode ? (
                <Radio.Group
                  value={pendingKeys[0]}
                  style={{ display: 'grid', gap: 8, width: '100%' }}
                  onChange={(event) => {
                    applyPendingKeys([String(event.target.value)]);
                  }}
                >
                  {searchResults.map((item) => (
                    <Radio key={item.id} value={item.id}>
                      <span className="category-picker-modal__search-item">
                        <span className="category-picker-modal__search-name">{item.name}</span>
                        <span className="category-picker-modal__search-path">{item.pathLabel}</span>
                      </span>
                    </Radio>
                  ))}
                </Radio.Group>
              ) : (
                <Checkbox.Group
                  value={pendingKeys}
                  style={{ display: 'grid', gap: 8, width: '100%' }}
                  onChange={(checked) => {
                    applyPendingKeys(checked.map(String));
                  }}
                >
                  {searchResults.map((item) => (
                    <Checkbox key={item.id} value={item.id}>
                      <span className="category-picker-modal__search-item">
                        <span className="category-picker-modal__search-name">{item.name}</span>
                        <span className="category-picker-modal__search-path">{item.pathLabel}</span>
                      </span>
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              )
            ) : (
              <Typography.Text type="secondary">未找到匹配的分类</Typography.Text>
            )}
          </div>
        ) : (
          <div className="category-picker-modal__tree">
            {treeData.length ? (
              <Tree
                checkable={!isSingleMode}
                checkStrictly={!isSingleMode}
                selectable={isSingleMode}
                showLine
                height={360}
                expandedKeys={expandedKeys}
                selectedKeys={isSingleMode ? pendingKeys : undefined}
                checkedKeys={isSingleMode ? undefined : { checked: pendingKeys, halfChecked: [] }}
                treeData={treeData}
                onExpand={(keys) => setExpandedKeys(keys.map(String))}
                onSelect={(keys) => {
                  if (!isSingleMode) return;
                  applyPendingKeys(keys.map(String));
                }}
                onCheck={(_checked, info) => {
                  if (isSingleMode) return;
                  const keys = info.checkedNodes.map((node) => String(node.key));
                  applyPendingKeys(keys);
                }}
              />
            ) : (
              <Typography.Text type="secondary">暂无分类</Typography.Text>
            )}
          </div>
        )}

        <Typography.Text type="secondary">
          {isSingleMode ? `已选择 ${pendingKeys.length ? 1 : 0} 项` : `已勾选 ${pendingKeys.length} 项`}
          {mode === 'multiple' && disabledIds.size ? `（表单中已有 ${disabledIds.size} 项，不可重复添加）` : null}
        </Typography.Text>
      </div>
    </Modal>
  );
}
