import type { ReactNode } from 'react';

export type AdminNavItem = {
  key: string;
  title: string;
  icon?: ReactNode;
  href?: string;
  children?: AdminNavItem[];
};

export const adminNavItems: AdminNavItem[] = [
  { key: '/admin', title: '仪表盘', href: '/admin' },
  {
    key: 'product-management',
    title: '产品管理',
    children: [
      { key: '/admin/products', title: '产品管理', href: '/admin/products' },
      { key: '/admin/categories', title: '分类管理', href: '/admin/categories' },
      { key: '/admin/brands', title: '品牌管理', href: '/admin/brands' },
      { key: '/admin/commerce', title: '定价与物流', href: '/admin/commerce' },
    ],
  },
  {
    key: 'order-management',
    title: '订单管理',
    children: [
      { key: '/admin/orders', title: '订单管理', href: '/admin/orders' },
      { key: '/admin/inquiries', title: '询盘管理', href: '/admin/inquiries' },
      { key: '/admin/customers', title: '客户管理', href: '/admin/customers' },
    ],
  },
  {
    key: 'content-management',
    title: '内容管理',
    children: [
      { key: '/admin/editorial/boards', title: '看板管理', href: '/admin/editorial/boards' },
      { key: '/admin/faq', title: 'FAQ管理', href: '/admin/faq' },
      { key: '/admin/editorial', title: '博客管理', href: '/admin/editorial' },
    ],
  },
  {
    key: 'site-management',
    title: '站点管理',
    children: [
      { key: '/admin/languages', title: '多语言', href: '/admin/languages' },
    ],
  },
];

function flattenNavItems(items: AdminNavItem[]): AdminNavItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavItems(item.children) : [])]);
}

const flattenedNavItems = flattenNavItems(adminNavItems);

export function getAdminPageTitle(pathname: string) {
  const match = [...flattenedNavItems]
    .filter((item) => item.href)
    .sort((left, right) => right.key.length - left.key.length)
    .find((item) => pathname === item.key || pathname.startsWith(`${item.key}/`));

  return match?.title ?? '后台管理系统';
}

export function getAdminNavOpenKeys(pathname: string) {
  return adminNavItems
    .filter((item) => item.children?.some((child) => pathname === child.key || pathname.startsWith(`${child.key}/`)))
    .map((item) => item.key);
}

export function getAdminNavSelectedKey(pathname: string) {
  return [...flattenedNavItems]
    .filter((item) => item.href)
    .sort((left, right) => right.key.length - left.key.length)
    .find((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))?.key ?? '/admin';
}
