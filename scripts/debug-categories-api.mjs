const response = await fetch('http://localhost:5100/api/front/categories?locale=en');
const data = await response.json();
const top = (data.categories ?? [])
  .filter((item) => !item.parentId)
  .map((item) => ({
    slug: item.slug,
    name: item.name,
    productCount: item.productCount,
    rollupProductCount: item.rollupProductCount,
  }));
console.log(JSON.stringify(top, null, 2));
