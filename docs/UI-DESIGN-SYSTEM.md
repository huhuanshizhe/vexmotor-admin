# STEPMOTECH UI/UX 设计规范

> 基于 McMaster-Carr / Grainger / MSC Industrial 等美国顶级工业品电商最佳实践

---

## 🎨 设计原则

### 1. 信息密度优先
工业客户需要快速扫描大量规格参数，界面应最大化信息展示效率。

### 2. 零视觉噪音
去除所有不必要的渐变、阴影、装饰。每个像素都应有明确功能。

### 3. 色彩克制
使用 **主色 + 中性色 + 功能色** 三色系统，确保 WCAG 2.1 AA 对比度标准。

### 4. 字体一致性
单一字体族 + 字重变化，确保可读性和专业感。

### 5. 明确操作层级
每个页面仅 1 个 Primary 按钮，其他操作使用 Secondary/Ghost。

---

## 🎨 色彩系统

### 品牌色（工业蓝）

```css
--brand-900: #0a1929  /* 最深背景 */
--brand-800: #0f2847  /* Header/导航 */
--brand-700: #163a66  /* 按钮 hover */
--brand-600: #1e4d85  /* 链接 */
--brand-500: #2563a8  /* 主品牌色 */
--brand-400: #3b82c4
--brand-300: #6ba3d6
--brand-200: #a3c4e8
--brand-100: #d6e6f5
--brand-50:  #f0f6fc  /* 最浅背景 */
```

### 强调色（工业橙 - CTA）

```css
--accent-700: #b35a00  /* 按钮 active */
--accent-600: #cc6700  /* 按钮 hover */
--accent-500: #e67e22  /* Primary 按钮 */
--accent-400: #f39c12
--accent-300: #f7b731
--accent-200: #fad391
--accent-100: #fde8c8
--accent-50:  #fff7ed
```

### 中性灰（7 级系统）

```css
--gray-0:  #ffffff  /* 纯白 */
--gray-50:  #f8fafc  /* 页面背景 */
--gray-100: #f1f5f9  /* 卡片背景 */
--gray-200: #e2e8f0  /* 边框 */
--gray-300: #cbd5e1  /* 分割线 */
--gray-400: #94a3b8  /* 禁用文字 */
--gray-500: #64748b  /* 次要文字 */
--gray-600: #475569  /* 标题 */
--gray-700: #334155
--gray-800: #1e293b
--gray-900: #0f172a  /* 主要文字 */
```

### 功能色

```
Success: #16a34a (绿色)
Warning: #ca8a04 (黄色)
Danger:  #dc2626 (红色)
Info:    #0284c7 (蓝色)
```

---

## 🔤 字体系统

### 字体族

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
```

**仅使用 1 个字体族**，通过字重区分层次。

### 字号比例（Minor Third - 1.25）

| 类名 | 字号 | 行高 | 用途 |
|------|------|------|------|
| `.text-xs` | 12px | 1.6 | 标签、徽章 |
| `.text-sm` | 14px | 1.5 | 次要文字、SKU |
| `.text-base` | 16px | 1.5 | 正文 |
| `.text-lg` | 18px | 1.4 | 卡片标题 |
| `.text-xl` | 20px | 1.4 | 小节标题 |
| `.text-2xl` | 24px | 1.3 | 页面标题 |
| `.text-3xl` | 30px | 1.25 | Hero 标题 |
| `.text-4xl` | 36px | 1.2 | 品牌标题 |

### 字重

```css
.font-normal:   400  /* 正文 */
.font-medium:   500  /* 强调 */
.font-semibold: 600  /* 小标题 */
.font-bold:     700  /* 标题 */
```

---

## 🔘 按钮系统

### 4 种标准变体

#### 1. Primary（CTA）
- **用途**：页面唯一主操作（如"加入购物车"、"立即结账"）
- **样式**：橙色实心背景
- **颜色**：`--accent-500` → hover `--accent-600`

```html
<button class="ui-button is-primary is-lg">Add to Cart</button>
```

#### 2. Secondary（Outlined）
- **用途**：次要操作（如"返回列表"、"取消"）
- **样式**：白色背景 + 灰色边框
- **颜色**：`--gray-0` → hover `--gray-50`

```html
<button class="ui-button is-secondary">Cancel</button>
```

#### 3. Brand（Blue）
- **用途**：后台管理、Header 操作
- **样式**：蓝色实心背景
- **颜色**：`--brand-700` → hover `--brand-800`

```html
<button class="ui-button is-brand">Save Changes</button>
```

#### 4. Ghost（Text Only）
- **用途**：低优先级操作（如"查看详情"、"了解更多"）
- **样式**：仅文字，无背景边框
- **颜色**：`--brand-600` → hover `--brand-700`

```html
<button class="ui-button is-ghost">View Details →</button>
```

### 尺寸

| 类名 | 高度 | 内边距 | 字号 | 用途 |
|------|------|--------|------|------|
| `.is-xs` | 28px | 0 12px | 12px | 表格内操作 |
| `.is-sm` | 32px | 0 14px | 13px | 紧凑布局 |
| `.is-md` | 40px | 0 20px | 14px | 默认尺寸 |
| `.is-lg` | 48px | 0 28px | 16px | CTA 按钮 |
| `.is-xl` | 56px | 0 36px | 18px | Hero 区域 |

### 状态

```css
/* 加载状态 */
<button class="ui-button is-primary is-loading">Saving...</button>

/* 禁用状态 */
<button class="ui-button is-primary" disabled>Unavailable</button>
```

---

## 📦 组件样式

### 产品卡片

```css
.product-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.product-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

**特点**：
- 圆角 `6px`（工业感）
- 显示 SKU（等宽字体）
- 价格使用强调色
- 库存状态颜色区分

### 数据表格

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table th {
  padding: 10px 16px;
  background: var(--gray-50);
  border-bottom: 2px solid var(--gray-300);
}

.data-table tbody tr:hover {
  background: var(--gray-50);
}
```

**变体**：
- 默认：`10px 16px` 内边距
- `.is-compact`：`8px 12px`
- `.is-tight`：`6px 10px`（最高密度）

---

## 📐 间距系统

基于 4px 网格：

```
4px   → xs
8px   → sm
12px  → md
16px  → lg
24px  → xl
32px  → 2xl
48px  → 3xl
64px  → 4xl
```

---

## 🎯 圆角规范

```css
--radius-xs: 2px   /* 徽章、标签 */
--radius-sm: 4px   /* 按钮、输入框 */
--radius-md: 6px   /* 卡片 */
--radius-lg: 8px   /* 弹窗 */
--radius-xl: 12px  /* 大型容器 */
```

**工业风格**：小圆角（2-6px），避免过度圆润。

---

## 🌈 阴影系统

```css
--shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
--shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06);
--shadow-md: 0 4px 6px rgba(15, 23, 42, 0.07);
--shadow-lg: 0 10px 15px rgba(15, 23, 42, 0.08);
--shadow-xl: 0 20px 25px rgba(15, 23, 42, 0.1);
```

**原则**：微妙、专业，不使用夸张的投影。

---

## ♿ 无障碍性

### 对比度

所有文字/背景组合必须满足 **WCAG 2.1 AA** 标准：
- 正常文字：≥ 4.5:1
- 大文字（18px+）：≥ 3:1

### 焦点样式

```css
*:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-xs);
}
```

### 交互反馈

- 按钮 hover：`translateY(-1px)`
- 卡片 hover：`translateY(-2px) + shadow-lg`
- 过渡时间：`150ms`（快速）、`200ms`（默认）、`300ms`（慢速）

---

## 📝 代码示例

### 产品卡片

```html
<article class="product-card">
  <div class="product-card-media">
    <img src="/products/stepper-motor.jpg" alt="NEMA 17 Stepper Motor" />
    <span class="product-badge">In Stock</span>
  </div>
  <div class="product-card-content">
    <h3 class="product-card-title">NEMA 17 Bipolar Stepper Motor</h3>
    <p class="product-card-sku">SKU: SM-17HD4012-22B</p>
    <p class="product-card-price">$24.90</p>
    <p class="product-card-status">● 152 units in stock</p>
    <button class="ui-button is-primary is-sm">Add to Cart</button>
  </div>
</article>
```

### 数据表格

```html
<table class="data-table is-compact">
  <thead>
    <tr>
      <th>SKU</th>
      <th>Product</th>
      <th>Price</th>
      <th>Stock</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="mono">SM-17HD4012-22B</td>
      <td>NEMA 17 Bipolar Stepper</td>
      <td class="mono">$24.90</td>
      <td>152</td>
      <td>
        <button class="ui-button is-secondary is-xs">Edit</button>
      </td>
    </tr>
  </tbody>
</table>
```

---

## 🚀 性能优化

### CSS 变量
使用 CSS 自定义属性，支持主题切换和暗色模式。

### 过渡优化
仅对 `transform` 和 `opacity` 使用 GPU 加速。

### 字体加载
使用 `font-display: swap` 避免 FOUT。

---

## 📱 响应式断点

```css
/* Mobile */
@media (max-width: 640px) { ... }

/* Tablet */
@media (max-width: 768px) { ... }

/* Desktop */
@media (max-width: 1024px) { ... }

/* Large Desktop */
@media (max-width: 1280px) { ... }
```

---

## 🎯 参考案例

- **McMaster-Carr**：信息密度、零装饰、快速查找
- **Grainger**：导航结构、筛选系统
- **MSC Industrial**：产品卡片、规格表格
- **Amazon Business**：购买流程、评价系统

---

**最后更新**：2025-02-24  
**维护者**：Design System Team
