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
import type { ButtonProps } from 'antd';
import type { MenuProps } from 'antd';
import { type ReactNode, useState } from 'react';

export const ADMIN_ACTION_TOOLTIP_DELAY_SEC = 1.5;

const ADMIN_ACTION_TOOLTIP_PROPS = {
  destroyOnHidden: true,
  mouseEnterDelay: ADMIN_ACTION_TOOLTIP_DELAY_SEC,
} as const;

export { ADMIN_ACTION_TOOLTIP_PROPS };

type ActionIconButtonProps = {
  title: string;
  icon: ReactNode;
  danger?: boolean;
  loading?: boolean;
  onClick?: () => void;
};

function ActionIconButton({ title, icon, danger, loading, onClick }: ActionIconButtonProps) {
  return (
    <span className="admin-row-action-trigger" onClick={onClick ? (event) => event.stopPropagation() : undefined}>
      <Tooltip title={title} {...ADMIN_ACTION_TOOLTIP_PROPS}>
        <Button type="text" size="small" danger={danger} icon={icon} loading={loading} onClick={onClick} />
      </Tooltip>
    </span>
  );
}

export { ActionIconButton as AdminActionIconButton };

type ConfirmActionIconButtonProps = Omit<ActionIconButtonProps, 'onClick'> & {
  confirmTitle: string;
  confirmDescription?: string;
  okText?: string;
  cancelText?: string;
  okButtonProps?: ButtonProps;
  onConfirm: () => void;
};

function ConfirmActionIconButton({
  title,
  icon,
  danger,
  loading,
  confirmTitle,
  confirmDescription,
  okText = '确定',
  cancelText = '取消',
  okButtonProps,
  onConfirm,
}: ConfirmActionIconButtonProps) {
  const [popconfirmOpen, setPopconfirmOpen] = useState(false);
  const [suppressTooltip, setSuppressTooltip] = useState(false);

  return (
    <Popconfirm
      title={confirmTitle}
      description={confirmDescription}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={okButtonProps}
      getPopupContainer={() => document.body}
      placement="topRight"
      open={popconfirmOpen}
      onOpenChange={(open) => {
        setPopconfirmOpen(open);
        if (open) setSuppressTooltip(true);
      }}
      onConfirm={onConfirm}
    >
      <span
        className="admin-row-action-trigger"
        onClick={(event) => event.stopPropagation()}
        onMouseLeave={() => setSuppressTooltip(false)}
      >
        <Tooltip
          title={title}
          {...ADMIN_ACTION_TOOLTIP_PROPS}
          open={(suppressTooltip || popconfirmOpen) ? false : undefined}
        >
          <Button type="text" size="small" danger={danger} icon={icon} loading={loading} />
        </Tooltip>
      </span>
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
  /** 为 false 时不显示编辑按钮 */
  showEdit?: boolean;
  /** 为 false 时不显示删除按钮 */
  showDelete?: boolean;
  /** 为 false 时不显示启用/停用按钮 */
  showToggle?: boolean;
  /** 使用自定义删除流程（如 Modal.confirm、删除前校验）时设为 callback */
  deleteMode?: 'popconfirm' | 'callback';
  toggleDisableDescription?: string;
  toggleEnableDescription?: string;
  toggleActiveActionTitle?: string;
  toggleInactiveActionTitle?: string;
  toggleActiveActionIcon?: ReactNode;
  toggleInactiveActionIcon?: ReactNode;
  toggleDisableConfirmTitle?: string;
  toggleEnableConfirmTitle?: string;
  toggleDisableOkText?: string;
  toggleEnableOkText?: string;
  /** 为 false 时切换按钮直接触发 onToggleActive（由调用方自行弹确认框） */
  toggleUsePopconfirm?: boolean;
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
  toggleActiveActionTitle,
  toggleInactiveActionTitle,
  toggleActiveActionIcon,
  toggleInactiveActionIcon,
  toggleDisableConfirmTitle,
  toggleEnableConfirmTitle,
  toggleDisableOkText,
  toggleEnableOkText,
  toggleUsePopconfirm = true,
  showEdit = true,
  showDelete = true,
  showToggle = true,
}: AdminEntityRowActionsProps) {
  const disableDescription = toggleDisableDescription ?? `停用后前台将不再展示该${entityName}。`;
  const enableDescription = toggleEnableDescription ?? `启用后${entityName}将恢复展示。`;
  const activeActionTitle = toggleActiveActionTitle ?? '停用';
  const inactiveActionTitle = toggleInactiveActionTitle ?? '启用';
  const activeActionIcon = toggleActiveActionIcon ?? <StopOutlined />;
  const inactiveActionIcon = toggleInactiveActionIcon ?? <CheckOutlined />;
  const disableConfirmTitle = toggleDisableConfirmTitle ?? `确定停用该${entityName}吗？`;
  const enableConfirmTitle = toggleEnableConfirmTitle ?? `确定启用该${entityName}吗？`;

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
      {showEdit ? (
        <ActionIconButton title="编辑" icon={<EditOutlined />} onClick={onEdit} />
      ) : null}
      {showToggle ? (toggleUsePopconfirm ? (
        isActive ? (
          <ConfirmActionIconButton
            title={activeActionTitle}
            icon={activeActionIcon}
            loading={loading}
            confirmTitle={disableConfirmTitle}
            confirmDescription={disableDescription}
            okText={toggleDisableOkText ?? '确定'}
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={onToggleActive}
          />
        ) : (
          <ConfirmActionIconButton
            title={inactiveActionTitle}
            icon={inactiveActionIcon}
            loading={loading}
            confirmTitle={enableConfirmTitle}
            confirmDescription={enableDescription}
            okText={toggleEnableOkText ?? '确定'}
            cancelText="取消"
            onConfirm={onToggleActive}
          />
        )
      ) : isActive ? (
        <ActionIconButton
          title={activeActionTitle}
          icon={activeActionIcon}
          loading={loading}
          onClick={onToggleActive}
        />
      ) : (
        <ActionIconButton
          title={inactiveActionTitle}
          icon={inactiveActionIcon}
          loading={loading}
          onClick={onToggleActive}
        />
      )) : null}
      {showDelete ? deleteButton : null}
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
