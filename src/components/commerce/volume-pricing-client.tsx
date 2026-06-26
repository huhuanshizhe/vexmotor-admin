'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, Modal, Space, Switch, Table, Tag, message } from 'antd';
import { useMemo, useState } from 'react';

import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn } from '@/components/admin/admin-table';
import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { createLocalId } from '@/components/commerce/commerce-utils';
import { useCommerceConfig } from '@/components/commerce/use-commerce-config';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import type { CommerceConfig, VolumePricingRuleConfig } from '@/lib/commerce-config';
import {
  MIN_VOLUME_PRICING_QUANTITY,
  buildVolumePricingLabel,
  formatDiscountPercent,
  parseDiscountPercentToPriceFactor,
  priceFactorToDiscountPercentValue,
  validateVolumePricingDiscountPercent,
  validateVolumePricingMinQuantity,
} from '@/lib/volume-discount';

type VolumeRuleFormValues = {
  label: string;
  minQuantity: number | null;
  discountPercent: number | null;
  note: string;
  enabled: boolean;
};

export function VolumePricingClient({ initialConfig }: { initialConfig: CommerceConfig }) {
  const { config, isPending, updateAndPersist } = useCommerceConfig(initialConfig);
  const [volumeRuleModalOpen, setVolumeRuleModalOpen] = useState(false);
  const [editingVolumeRuleId, setEditingVolumeRuleId] = useState<string | null>(null);
  const [pendingRuleId, setPendingRuleId] = useState<string | null>(null);
  const [isModalSaving, setIsModalSaving] = useState(false);
  const [volumeRuleForm] = Form.useForm<VolumeRuleFormValues>();

  const sortedRules = useMemo(
    () => [...config.volumePricingRules].sort((left, right) => left.minQuantity - right.minQuantity),
    [config.volumePricingRules],
  );

  function openVolumeRuleModal(rule?: VolumePricingRuleConfig) {
    setEditingVolumeRuleId(rule?.id ?? null);
    volumeRuleForm.setFieldsValue({
      label: rule?.label ?? '',
      minQuantity: rule?.minQuantity ?? null,
      discountPercent: rule ? priceFactorToDiscountPercentValue(rule.priceFactor) : null,
      note: rule?.note ?? '',
      enabled: rule?.enabled ?? false,
    });
    setVolumeRuleModalOpen(true);
  }

  function saveVolumeRule() {
    void volumeRuleForm.validateFields().then((values) => {
      const minQuantity = Math.trunc(values.minQuantity ?? NaN);
      const quantityValidation = validateVolumePricingMinQuantity(config.volumePricingRules, {
        minQuantity,
        editingId: editingVolumeRuleId,
      });
      if (!quantityValidation.ok) {
        void message.error(quantityValidation.message);
        return;
      }

      const discountValidation = validateVolumePricingDiscountPercent(values.discountPercent);
      if (!discountValidation.ok) {
        void message.error(discountValidation.message);
        return;
      }

      const nextRuleId = editingVolumeRuleId ?? createLocalId('tier');
      setIsModalSaving(true);
      void updateAndPersist((current) => {
        const nextRule: VolumePricingRuleConfig = {
          id: nextRuleId,
          label: buildVolumePricingLabel(values.label, minQuantity),
          minQuantity,
          priceFactor: parseDiscountPercentToPriceFactor(values.discountPercent),
          note: values.note.trim() || null,
          enabled: values.enabled,
        };

        return {
          ...current,
          volumePricingRules: editingVolumeRuleId
            ? current.volumePricingRules.map((rule) => (rule.id === editingVolumeRuleId ? nextRule : rule))
            : [...current.volumePricingRules, nextRule],
        };
      }).then((saved) => {
        setIsModalSaving(false);
        if (!saved) return;
        setVolumeRuleModalOpen(false);
        setEditingVolumeRuleId(null);
        volumeRuleForm.resetFields();
      });
    });
  }

  function deleteVolumeRule(id: string) {
    if (config.volumePricingRules.length <= 1) {
      void message.warning('至少保留一条阶梯规则');
      return;
    }

    setPendingRuleId(id);
    void updateAndPersist((current) => ({
      ...current,
      volumePricingRules: current.volumePricingRules.filter((rule) => rule.id !== id),
    })).finally(() => setPendingRuleId(null));
  }

  function patchVolumeRuleEnabled(row: VolumePricingRuleConfig, enabled: boolean) {
    setPendingRuleId(row.id);
    void updateAndPersist((current) => ({
      ...current,
      volumePricingRules: current.volumePricingRules.map((rule) => (
        rule.id === row.id ? { ...rule, enabled } : rule
      )),
    })).finally(() => setPendingRuleId(null));
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <CommercePageHeader
        title="阶梯定价"
        description="维护官网批发阶梯价规则（起订数量须大于 1）。单件购买使用产品原价，不套用阶梯优惠。"
        statusMessage={null}
        isPending={isPending}
        showSave={false}
      />

      <Card
        title="阶梯定价规则"
        extra={(
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openVolumeRuleModal()}>
            新增阶梯
          </Button>
        )}
      >
        <Table
          rowKey="id"
          pagination={false}
          dataSource={sortedRules}
          columns={[
            buildAdminListRowIndexColumn(1, sortedRules.length || 1),
            { title: '名称', dataIndex: 'label' },
            { title: '起订数量', dataIndex: 'minQuantity' },
            {
              title: '优惠幅度',
              dataIndex: 'priceFactor',
              render: (value: number) => formatDiscountPercent(value),
            },
            {
              title: '状态',
              dataIndex: 'enabled',
              render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
            },
            { title: '说明', dataIndex: 'note', render: (value: string | null) => value ?? '—' },
            adminTableFixedActionsColumn({
              title: '操作',
              key: 'actions',
              render: (_: unknown, row: VolumePricingRuleConfig) => (
                <AdminEntityRowActions
                  loading={pendingRuleId === row.id}
                  isActive={row.enabled}
                  entityName="阶梯规则"
                  toggleDisableDescription="停用后前台将不再应用该阶梯优惠。"
                  toggleEnableDescription="启用后该阶梯优惠将恢复生效。"
                  onEdit={() => openVolumeRuleModal(row)}
                  onToggleActive={() => patchVolumeRuleEnabled(row, !row.enabled)}
                  onDelete={() => deleteVolumeRule(row.id)}
                />
              ),
            }),
          ]}
        />
      </Card>

      <Modal
        open={volumeRuleModalOpen}
        title={editingVolumeRuleId ? '编辑阶梯规则' : '新增阶梯规则'}
        onCancel={() => {
          setVolumeRuleModalOpen(false);
          setEditingVolumeRuleId(null);
        }}
        onOk={saveVolumeRule}
        confirmLoading={isModalSaving}
        destroyOnHidden
      >
        <Form
          form={volumeRuleForm}
          layout="vertical"
          initialValues={{ enabled: false, minQuantity: null, discountPercent: null, note: '', label: '' }}
        >
          <Form.Item
            label="起订数量"
            name="minQuantity"
            required
            extra="阶梯定价仅用于批发；单件购买使用产品原价，起订数量须大于 1"
            rules={[
              {
                validator: async (_, value) => {
                  if (value == null || value === '') {
                    throw new Error('请填写起订数量');
                  }
                  const minQuantity = Math.trunc(Number(value));
                  if (!Number.isFinite(minQuantity) || minQuantity < MIN_VOLUME_PRICING_QUANTITY) {
                    throw new Error(`起订数量必须是大于 1 的整数（至少 ${MIN_VOLUME_PRICING_QUANTITY}）`);
                  }
                  const validation = validateVolumePricingMinQuantity(config.volumePricingRules, {
                    minQuantity,
                    editingId: editingVolumeRuleId,
                  });
                  if (!validation.ok) {
                    throw new Error(validation.message);
                  }
                },
              },
            ]}
          >
            <InputNumber min={MIN_VOLUME_PRICING_QUANTITY} precision={0} step={1} style={{ width: '100%' }} placeholder={`至少 ${MIN_VOLUME_PRICING_QUANTITY}`} />
          </Form.Item>
          <Form.Item label="名称" name="label" extra="留空则自动生成为 Tier {起订数量}">
            <Input placeholder="例如 Tier 100" />
          </Form.Item>
          <Form.Item
            label="优惠幅度"
            name="discountPercent"
            required
            rules={[
              {
                validator: async (_, value) => {
                  const validation = validateVolumePricingDiscountPercent(value);
                  if (!validation.ok) {
                    throw new Error(validation.message);
                  }
                },
              },
            ]}
            extra="相对产品原价，如 7 表示 7% 优惠（100 元折后 93 元）"
          >
            <InputNumber min={0.01} max={100} step={0.01} precision={4} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>
          <Form.Item label="说明" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
