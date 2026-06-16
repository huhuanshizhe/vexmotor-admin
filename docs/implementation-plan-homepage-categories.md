# 首页类目展示与后台管理实施计划

## 📋 需求概述

### 需求 1：首页 Shop by Category 展示升级
- **布局**：3 排 × 6 列 = 18 个类目展示位
- **内容**：包含所有 1 级和 2 级分类
- **样式**：专业技术线稿图片（参考 omc-stepperonline.com 风格）
- **交互**：悬停效果、点击跳转

### 需求 2：后台类目管理功能
- **图片管理**：AI 生成 / 手动上传 / 更换
- **推荐标记**：勾选"推荐到首页"选项
- **运营友好**：非技术人员可操作

### 需求 3：图片风格统一
- **参考**：https://www.omc-stepperonline.com/
- **风格**：3D 渲染、真实产品照片、或高质量技术插图
- **一致性**：所有类目图片尺寸、背景、角度统一

---

## 🎯 实施阶段

### Phase 1: 数据库 Schema 更新（预计 2 小时）

#### 1.1 扩展 Categories 表
```sql
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS featured_order INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id);
```

#### 1.2 创建索引
```sql
CREATE INDEX idx_categories_featured ON categories(is_featured, featured_order);
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

#### 1.3 更新 Drizzle Schema
```typescript
// src/server/db/schema.ts
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  imageUrl: text('imageUrl'), // 新增
  isFeatured: boolean('is_featured').default(false), // 新增
  featuredOrder: integer('featured_order').default(0), // 新增
  parentId: uuid('parent_id').references(() => categories.id), // 新增
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

### Phase 2: 后台类目管理界面（预计 4 小时）

#### 2.1 类目列表页增强
**文件**：`src/app/admin/categories/page.tsx`

**新增功能**：
- ✅ 显示图片缩略图
- ✅ "推荐到首页" 开关
- ✅ 拖拽排序（featured_order）
- ✅ 批量操作（生成图片、取消推荐）

#### 2.2 类目编辑页
**文件**：`src/app/admin/categories/[id]/page.tsx`

**新增功能**：
- ✅ 图片预览
- ✅ "AI 生成图片" 按钮
- ✅ 手动上传图片
- ✅ 推荐标记
- ✅ 父类目选择器

#### 2.3 AI 图片生成 API
**文件**：`src/app/api/admin/categories/generate-image/route.ts`

**功能**：
```typescript
// 调用阿里云 DashScope API
export async function POST(req: Request) {
  const { categoryId, prompt } = await req.json();
  
  // 1. 根据类目名称生成 prompt
  // 2. 调用 wanx-v1 模型
  // 3. 下载并上传到 Cloudflare R2
  // 4. 更新数据库 image_url
  
  return NextResponse.json({ success: true, imageUrl });
}
```

---

### Phase 3: 首页组件重构（预计 3 小时）

#### 3.1 数据获取
**文件**：`src/server/storefront/catalog.ts`

**新增函数**：
```typescript
export async function getFeaturedCategories() {
  return db
    .select()
    .from(categories)
    .where(eq(categories.isFeatured, true))
    .orderBy(categories.featuredOrder)
    .limit(18); // 3x6 = 18
}
```

#### 3.2 首页组件
**文件**：`src/app/page.tsx`

**重构 Shop by Category 区块**：
```tsx
<section className="section">
  <div className="section-inner">
    <div className="section-header">
      <h2 className="section-title">Shop by Category</h2>
      <Link href="/products" className="section-link">
        View all categories
      </Link>
    </div>

    <ul className="home-category-grid-18">
      {featuredCategories.map((category) => (
        <li key={category.id}>
          <Link href={`/c/${category.slug}`} className="home-category-card">
            <div className="home-category-image">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  width={200}
                  height={200}
                  sizes="(max-width: 768px) 150px, 200px"
                />
              ) : (
                <div className="home-category-placeholder">
                  {category.name.charAt(0)}
                </div>
              )}
            </div>
            <span className="home-category-name">{category.name}</span>
            {category.productCount > 0 && (
              <span className="home-category-count">
                {category.productCount} products
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  </div>
</section>
```

#### 3.3 CSS 样式
**文件**：`src/app/globals.css`

```css
/* 3 排 × 6 列网格 */
.home-category-grid-18 {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 24px;
  margin-top: 32px;
}

.home-category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  background: #ffffff;
  border: 1px solid rgba(16, 41, 66, 0.08);
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s ease;
}

.home-category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(16, 41, 66, 0.12);
  border-color: rgba(230, 126, 34, 0.3);
}

.home-category-image {
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-category-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* 响应式 */
@media (max-width: 1200px) {
  .home-category-grid-18 {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .home-category-grid-18 {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 480px) {
  .home-category-grid-18 {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

### Phase 4: 图片风格标准化（预计 2 小时）

#### 4.1 参考风格分析
**目标网站**：https://www.omc-stepperonline.com/

**风格特点**（需手动观察）：
- ✅ 3D 渲染 / 真实产品照片
- ✅ 白色或浅灰色背景
- ✅ 统一的角度（通常是 45° 俯视）
- ✅ 清晰的阴影和高光
- ✅ 产品尺寸比例一致

#### 4.2 AI 生成 Prompt 模板
```typescript
const PROMPT_TEMPLATES = {
  'stepper-motor': 'Professional product photo of a NEMA {size} stepper motor, {frame_mm}mm square frame, 45-degree isometric view, realistic 3D rendering, white background, soft shadows, high detail, industrial product photography style, centered composition',
  
  'driver': 'Professional product photo of a stepper motor driver module, aluminum heat sink on top, PCB with electronic components, terminal blocks, 45-degree isometric view, realistic 3D rendering, white background, soft shadows',
  
  'power-supply': 'Professional product photo of an industrial switching power supply, metal enclosure, ventilation holes, terminal blocks, LED indicator, 45-degree isometric view, realistic 3D rendering, white background, soft shadows',
};
```

#### 4.3 图片后处理脚本
**文件**：`scripts/standardize-images.ts`

```typescript
import sharp from 'sharp';

async function standardizeImage(inputPath: string, outputPath: string) {
  await sharp(inputPath)
    .resize(800, 800, { fit: 'contain', background: '#ffffff' })
    .png()
    .toFile(outputPath);
}
```

---

### Phase 5: 数据迁移与测试（预计 2 小时）

#### 5.1 更新现有类目
```typescript
// scripts/update-categories-featured.ts
const featuredCategories = [
  { slug: 'nema-8-stepper-motor', order: 1 },
  { slug: 'nema-11-stepper-motor', order: 2 },
  { slug: 'nema-14-stepper-motor', order: 3 },
  { slug: 'nema-16-stepper-motor', order: 4 },
  { slug: 'nema-17-stepper-motor', order: 5 },
  { slug: 'nema-23-stepper-motor', order: 6 },
  { slug: 'nema-24-stepper-motor', order: 7 },
  { slug: 'nema-34-stepper-motor', order: 8 },
  { slug: 'stepper-motor-driver', order: 9 },
  { slug: 'power-supply', order: 10 },
];

for (const { slug, order } of featuredCategories) {
  await db
    .update(categories)
    .set({ isFeatured: true, featuredOrder: order })
    .where(eq(categories.slug, slug));
}
```

#### 5.2 测试清单
- [ ] 数据库迁移成功
- [ ] 后台类目管理界面正常
- [ ] AI 图片生成功能可用
- [ ] 首页显示 18 个推荐类目
- [ ] 响应式布局正常
- [ ] 图片加载速度快

---

## 📊 时间预估

| Phase | 任务 | 预计时间 |
|-------|------|----------|
| 1 | 数据库 Schema 更新 | 2 小时 |
| 2 | 后台类目管理界面 | 4 小时 |
| 3 | 首页组件重构 | 3 小时 |
| 4 | 图片风格标准化 | 2 小时 |
| 5 | 数据迁移与测试 | 2 小时 |
| **总计** | | **13 小时** |

---

## 🚀 优先级排序

### P0 - 立即执行（今天）
1. ✅ 数据库 Schema 更新
2. ✅ 后台类目管理基础界面
3. ✅ 首页 3x6 网格布局

### P1 - 高优先级（明天）
4. AI 图片生成集成
5. 图片风格标准化
6. 数据迁移

### P2 - 中优先级（本周内）
7. 后台高级功能（批量操作、拖拽排序）
8. 性能优化
9. 用户权限细化

---

## ⚠️ 风险与注意事项

### 技术风险
1. **AI 图片生成质量**：可能需要多次调整 prompt
2. **数据库迁移**：生产环境需要备份
3. **性能**：18 张图片需要懒加载和 CDN

### 设计风险
1. **图片风格一致性**：AI 生成的图片可能不统一
2. **响应式布局**：移动端需要特别测试
3. **浏览器兼容性**：CSS Grid 需要 fallback

### 运营风险
1. **培训成本**：运营人员需要学习后台操作
2. **内容审核**：AI 生成的图片需要人工审核
3. **更新流程**：新类目上线需要标准化流程

---

## 📝 下一步行动

### 立即开始（选择一项）：

**A. 快速启动（推荐）**
```bash
# 1. 创建数据库迁移
pnpm drizzle-kit generate

# 2. 应用迁移
pnpm drizzle-kit push
```

**B. 先做原型**
- 创建本地测试环境
- 实现最小可行功能
- 验证后再推广

**C. 分阶段交付**
- Phase 1-3 为第一阶段（核心功能）
- Phase 4-5 为第二阶段（优化）

---

## 📞 联系方式

如有问题，请联系开发团队。

**文档版本**：v1.0  
**创建日期**：2026-06-03  
**最后更新**：2026-06-03
