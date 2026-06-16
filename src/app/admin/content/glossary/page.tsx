import { ContentEditorClient } from '@/components/admin/content-editor-client';

export default function GlossaryAdminPage() {
  return <ContentEditorClient initialRows={[]} contentType="glossary" />;
}
