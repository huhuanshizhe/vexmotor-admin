import { ContentEditorClient } from '@/components/admin/content-editor-client';

export default function FaqAdminPage() {
  return <ContentEditorClient initialRows={[]} contentType="faq" />;
}
