const SUMMARY_DELIMITER_PATTERN = /[,，。.!?;；、\s]/;

export function stripHtmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractSummaryFromHtmlBody(html: string, minStart = 50) {
  const text = stripHtmlToText(html);
  if (!text) return '';
  if (text.length <= minStart) return text;

  const tail = text.slice(minStart);
  const match = tail.search(SUMMARY_DELIMITER_PATTERN);
  const end = match >= 0 ? minStart + match : text.length;
  return text.slice(0, end).trim();
}
