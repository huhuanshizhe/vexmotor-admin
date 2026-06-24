'use client';

import {
  CheckOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Button, Popconfirm, Space, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import type { ReactNode } from 'react';

type ActionIconButtonProps = {
  title: string;
  icon: ReactNode;
  danger?: boolean;
  loading?: boolean;
  onClick?: () => void;
};

function ActionIconButton({ title, icon, danger, loading, onClick }: ActionIconButtonProps) {
  return (
    <Tooltip title={title}>
      <Button type="text" size="small" danger={danger} icon={icon} loading={loading} onClick={onClick} />
    </Tooltip>
  );
}

export { ActionIconButton as AdminActionIconButton };

type ConfirmActionIconButtonProps = Omit<ActionIconButtonProps, 'onClick'> & {
  confirmTitle: string;
  confirmDescription?: string;
  onConfirm: () => void;
};

function ConfirmActionIconButton({
  title,
  icon,
  danger,
  loading,
  confirmTitle,
  confirmDescription,
  onConfirm,
}: ConfirmActionIconButtonProps) {
  return (
    <Popconfirm title={confirmTitle} description={confirmDescription} onConfirm={onConfirm}>
      <ActionIconButton title={title} icon={icon} danger={danger} loading={loading} />
    </Popconfirm>
  );
}

export type AdminEntityRowActionsProps = {
  loading?: boolean;
  isActive: boolean;
  entityName: string;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  /** 使用自定义删除流程（如 Modal.confirm、删除前校验）时设为 callback */
  deleteMode?: 'popconfirm' | 'callback';
  toggleDisableDescription?: string;
  toggleEnableDescription?: string;
};

export function AdminEntityRowActions({
  loading = false,
  isActive,
  entityName,
  onEdit,
  onToggleActive,
  onDelete,
  deleteMode = 'popconfirm',
  toggleDisableDescription,
  toggleEnableDescription,
}: AdminEntityRowActionsProps) {
  const disableDescription = toggleDisableDescription ?? `停用后前台将不再展示该${entityName}。`;
  const enableDescription = toggleEnableDescription ?? `启用后${entityName}将恢复展示。`;

  const deleteButton = deleteMode === 'callback' ? (
    <ActionIconButton
      title="删除"
      icon={<DeleteOutlined />}
      danger
      loading={loading}
      onClick={onDelete}
    />
  ) : (
    <ConfirmActionIconButton
      title="删除"
      icon={<DeleteOutlined />}
      danger
      loading={loading}
      confirmTitle={`确定删除该${entityName}吗？`}
      onConfirm={onDelete}
    />
  );

  return (
    <Space size={0} className="admin-row-actions">
      <ActionIconButton title="编辑" icon={<EditOutlined />} onClick={onEdit} />
      {isActive ? (
        <ConfirmActionIconButton
          title="停用"
          icon={<StopOutlined />}
          loading={loading}
          confirmTitle={`确定停用该${entityName}吗？`}
          confirmDescription={disableDescription}
          onConfirm={onToggleActive}
        />
      ) : (
        <ConfirmActionIconButton
          title="启用"
          icon={<CheckOutlined />}
          loading={loading}
          confirmTitle={`确定启用该${entityName}吗？`}
          confirmDescription={enableDescription}
          onConfirm={onToggleActive}
        />
      )}
      {deleteButton}
    </Space>
  );
}

export type AdminEditorialRowActionsProps = {
  loading?: boolean;
  status: 'draft' | 'published' | 'archived';
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function AdminEditorialRowActions({
  loading = false,
  status,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
}: AdminEditorialRowActionsProps) {
  return (
    <Space size={0} className="admin-row-actions">
      <ActionIconButton title="编辑" icon={<EditOutlined />} onClick={onEdit} />
      {status !== 'published' && status !== 'archived' ? (
        <ConfirmActionIconButton
          title="立即发布"
          icon={<CloudUploadOutlined />}
          loading={loading}
          confirmTitle="确定立即发布吗？"
          confirmDescription="发布后内容将对访客可见。"
          onConfirm={onPublish}
        />
      ) : null}
      {status !== 'archived' ? (
        <ConfirmActionIconButton
          title="归档"
          icon={<InboxOutlined />}
          loading={loading}
          confirmTitle="确定归档该内容吗？"
          confirmDescription="归档后内容将下线，且无法再从列表直接发布。"
          onConfirm={onArchive}
        />
      ) : null}
      <ConfirmActionIconButton
        title="删除"
        icon={<DeleteOutlined />}
        danger
        loading={loading}
        confirmTitle="确定删除该内容吗？"
        onConfirm={onDelete}
      />
    </Space>
  );
}

export type AdminEntityActionMenuOptions = {
  isActive: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
};

/** 树面板等紧凑场景：与表格行操作共用图标与文案 */
export function buildAdminEntityActionMenuItems({
  isActive,
  onEdit,
  onToggleActive,
  onDelete,
}: AdminEntityActionMenuOptions): MenuProps['items'] {
  return [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        onEdit();
      },
    },
    isActive
      ? {
          key: 'disable',
          icon: <StopOutlined />,
          label: '停用',
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
            onToggleActive();
          },
        }
      : {
          key: 'enable',
          icon: <CheckOutlined />,
          label: '启用',
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
            onToggleActive();
          },
        },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        onDelete();
      },
    },
  ];
}
