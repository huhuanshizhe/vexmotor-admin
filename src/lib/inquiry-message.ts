export function parseInquiryMessage(message: string) {
  const lines = message.split('\n').map((line) => line.trim()).filter(Boolean);
  return {
    estimatedQuantity:
      lines.find((line) => line.startsWith('Estimated Quantity:') || line.startsWith('预计数量：'))?.replace('Estimated Quantity:', '').replace('预计数量：', '').trim() ?? null,
    targetLeadTime:
      lines.find((line) => line.startsWith('Target Lead Time:') || line.startsWith('目标交期：'))?.replace('Target Lead Time:', '').replace('目标交期：', '').trim() ?? null,
    narrative:
      lines
        .filter(
          (line) => !line.startsWith('Estimated Quantity:') && !line.startsWith('Target Lead Time:') && !line.startsWith('预计数量：') && !line.startsWith('目标交期：'),
        )
        .join('\n') || message,
  };
}
