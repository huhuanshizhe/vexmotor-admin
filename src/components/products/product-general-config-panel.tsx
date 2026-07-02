'use client';

import { Col, Form, Input, InputNumber, Row, Select, Switch } from 'antd';

import { BrandPickerField } from '@/components/brands/brand-picker-field';
import { CategoryPickerField } from '@/components/categories/category-picker-field';
import { ProductBoardMultiSelect, type ProductBoardOption } from '@/components/products/product-board-multi-select';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import type { ProductPurchaseMode, ProductStatus } from '@/lib/product-content';

type ProductGeneralConfigPanelProps = {
  spu: string;
  onSpuChange: (value: string) => void;
  categoryTree: AdminCategoryTreeNode[];
  categoryIds: string[];
  onCategoryIdsChange: (value: string[]) => void;
  brandId: string | null;
  onBrandIdChange: (value: string | null) => void;
  boardOptions: ProductBoardOption[];
  boardKeys: string[];
  onBoardKeysChange: (value: string[]) => void;
  featured: boolean;
  onFeaturedChange: (value: boolean) => void;
  featuredSortOrder: number;
  onFeaturedSortOrderChange: (value: number) => void;
  purchaseMode: ProductPurchaseMode;
  onPurchaseModeChange: (value: ProductPurchaseMode) => void;
  paidSampleEnabled: boolean;
  onPaidSampleEnabledChange: (value: boolean) => void;
  status: ProductStatus;
  onStatusChange: (nextStatus: ProductStatus) => void;
};

const fieldStyle = { marginBottom: 16 };

export function ProductGeneralConfigPanel({
  spu,
  onSpuChange,
  categoryTree,
  categoryIds,
  onCategoryIdsChange,
  brandId,
  onBrandIdChange,
  boardOptions,
  boardKeys,
  onBoardKeysChange,
  featured,
  onFeaturedChange,
  featuredSortOrder,
  onFeaturedSortOrderChange,
  purchaseMode,
  onPurchaseModeChange,
  paidSampleEnabled,
  onPaidSampleEnabledChange,
  status,
  onStatusChange,
}: ProductGeneralConfigPanelProps) {
  return (
    <div className="content-editor-shared-section">
      <Row gutter={[16, 0]}>
        <Col xs={24} md={6}>
          <Form.Item label="SPU" layout="vertical" required style={fieldStyle}>
            <Input value={spu} onChange={(event) => onSpuChange(event.target.value)} placeholder="全局唯一 SPU" />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="所属分类" layout="vertical" required style={fieldStyle}>
            <CategoryPickerField
              mode="multiple"
              categoryTree={categoryTree}
              value={categoryIds}
              onChange={onCategoryIdsChange}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="所属品牌" layout="vertical" required style={fieldStyle}>
            <BrandPickerField
              mode="single"
              value={brandId ?? ''}
              onChange={(value) => onBrandIdChange(value || null)}
              addButtonLabel="选择品牌"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="看板关联" layout="vertical" style={fieldStyle}>
            <ProductBoardMultiSelect
              boards={boardOptions}
              value={boardKeys}
              onChange={onBoardKeysChange}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="推荐到首页" layout="vertical" style={fieldStyle}>
            <Switch checked={featured} onChange={onFeaturedChange} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="首页展示顺序" layout="vertical" style={fieldStyle}>
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              disabled={!featured}
              value={featuredSortOrder}
              onChange={(value) => onFeaturedSortOrderChange(Number(value ?? 0))}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="购买模式" layout="vertical" style={fieldStyle}>
            <Select
              value={purchaseMode}
              onChange={onPurchaseModeChange}
              options={[
                { value: 'buy', label: '直接下单' },
                { value: 'inquiry', label: '询价模式' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="付邮拿样" layout="vertical" style={fieldStyle}>
            <Switch checked={paidSampleEnabled} onChange={onPaidSampleEnabledChange} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="上架状态" layout="vertical" style={fieldStyle}>
            <Switch
              checked={status === 'active'}
              checkedChildren="上架"
              unCheckedChildren="下架"
              onChange={(checked) => onStatusChange(checked ? 'active' : 'inactive')}
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
