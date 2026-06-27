'use client';

import type { Editor as TinyMceEditor } from 'tinymce';
import { Editor } from '@tinymce/tinymce-react';
import { useEffect, useRef } from 'react';

import { uploadMediaFile } from '@/lib/media-upload';

type RichTextEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  minHeight?: number;
  maxHeight?: number;
};

export function RichTextEditor({
  value = '',
  onChange,
  disabled = false,
  minHeight = 520,
  maxHeight = 720,
}: RichTextEditorProps) {
  const editorRef = useRef<TinyMceEditor | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.mode.set(disabled ? 'readonly' : 'design');
  }, [disabled]);

  return (
    <div className="rich-text-editor-shell">
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        disabled={disabled}
        onInit={(_event, editor) => {
          editorRef.current = editor;
          editor.mode.set(disabled ? 'readonly' : 'design');
        }}
        value={value}
        onEditorChange={(content) => onChange?.(content)}
        init={{
          height: minHeight,
          min_height: minHeight,
          max_height: maxHeight,
          resize: false,
          menubar: false,
          branding: false,
          promotion: false,
          statusbar: true,
          plugins: [
            'advlist',
            'autolink',
            'charmap',
            'code',
            'codesample',
            'emoticons',
            'fullscreen',
            'image',
            'link',
            'lists',
            'media',
            'preview',
            'quickbars',
            'searchreplace',
            'table',
            'wordcount',
          ],
          toolbar: [
            'undo redo | blocks fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify',
            'bullist numlist outdent indent | link image media table codesample | blockquote hr charmap emoticons | searchreplace preview fullscreen code removeformat',
          ],
          toolbar_mode: 'scrolling',
          toolbar_sticky: false,
          quickbars_selection_toolbar: 'bold italic underline | quicklink blockquote',
          quickbars_insert_toolbar: 'image media table codesample',
          block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Blockquote=blockquote; Preformatted=pre',
          font_size_formats: '12px 14px 16px 18px 20px 24px 28px 32px',
          content_css: '/cms-article-content.css',
          body_class: 'cms-article-content',
          content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 12px; }',
          valid_elements: 'p[class],h2[id|class],h3[id|class],h4[id|class],ul[class],ol[class],li,a[href|target|rel],strong,em,u,s,sub,sup,img[src|alt],div[class],table[class],thead,tbody,tr,th,td,pre[class],code,blockquote,hr,video[src|controls],span',
          invalid_styles: { '*': 'color font-size font-family line-height margin padding width height' },
          paste_remove_styles: true,
          paste_webkit_styles: 'none',
          relative_urls: false,
          convert_urls: false,
          images_upload_handler: async (blobInfo) => {
            const file = new File([blobInfo.blob()], blobInfo.filename(), { type: blobInfo.blob().type || 'image/jpeg' });
            const result = await uploadMediaFile(file, { kind: 'image', folder: 'editorial/images' });
            return result.url;
          },
          file_picker_types: 'image media',
          file_picker_callback: (callback, _value, meta) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = meta.filetype === 'image' ? 'image/*' : 'video/*,image/*';

            input.onchange = () => {
              const file = input.files?.[0];
              if (!file) return;

              void (async () => {
                try {
                  const kind = file.type.startsWith('video/') ? 'video' : 'image';
                  const result = await uploadMediaFile(file, { kind });
                  callback(result.url, { title: file.name });
                } catch {
                  // uploadMediaFile already surfaces errors via throw
                }
              })();
            };

            input.click();
          },
        }}
      />
    </div>
  );
}
