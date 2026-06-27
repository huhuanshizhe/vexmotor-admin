function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildParagraphHtml(text: string) {
  return `<p>${escapeHtml(text)}</p>`;
}

export function buildListHtml(items: string[]) {
  return `<ul class="blog-article-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

export function buildCodeBlockHtml(code: string, label?: string) {
  const labelHtml = label ? `<p><strong>${escapeHtml(label)}</strong></p>` : '';
  return `${labelHtml}<pre class="blog-code-block"><code>${escapeHtml(code)}</code></pre>`;
}

export function buildTableHtml(input: {
  caption?: string;
  columns: string[];
  rows: string[][];
}) {
  const header = input.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const rows = input.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');
  const captionHtml = input.caption
    ? `<p class="blog-table-caption">${escapeHtml(input.caption)}</p>`
    : '';
  return [
    `<div class="blog-table-wrap">`,
    captionHtml,
    `<table class="blog-article-table"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`,
    `</div>`,
  ].join('');
}

export { escapeHtml };
