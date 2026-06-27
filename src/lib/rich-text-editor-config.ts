import type { Editor as TinyMceEditor } from 'tinymce';

import { uploadMediaFile } from '@/lib/media-upload';

/** Applied to TinyMCE iframe body and Preview window for cms-article-content.css */
export const CMS_ARTICLE_BODY_CLASS = 'cms-article-content';

export const CMS_ARTICLE_CONTENT_CSS = '/cms-article-content.css';

/** Preserve semantic classes from imported blog/FAQ HTML and TinyMCE codesample */
export const CMS_ARTICLE_VALID_ELEMENTS =
  'p[class],h2[id|class],h3[id|class],h4[id|class],ul[class],ol[class],li,a[href|target|rel],strong,em,u,s,sub,sup,img[src|alt],div[class],table[class],thead,tbody,tr,th,td,pre[class|data-language],code[class],blockquote,hr,video[src|controls],span[class]';

export type RichTextEditorInitOptions = {
  minHeight?: number;
  maxHeight?: number;
};

function ensureCmsArticleBodyClass(editor: TinyMceEditor) {
  const body = editor.getBody();
  if (body && !body.classList.contains(CMS_ARTICLE_BODY_CLASS)) {
    body.classList.add(CMS_ARTICLE_BODY_CLASS);
  }
}

export function buildRichTextEditorInit(options: RichTextEditorInitOptions = {}) {
  const minHeight = options.minHeight ?? 520;
  const maxHeight = options.maxHeight ?? 720;

  return {
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
    toolbar_mode: 'scrolling' as const,
    toolbar_sticky: false,
    quickbars_selection_toolbar: 'bold italic underline | quicklink blockquote',
    quickbars_insert_toolbar: 'image media table codesample',
    block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Blockquote=blockquote; Preformatted=pre',
    font_size_formats: '12px 14px 16px 18px 20px 24px 28px 32px',
    content_css: CMS_ARTICLE_CONTENT_CSS,
    body_class: CMS_ARTICLE_BODY_CLASS,
    content_style: `body.${CMS_ARTICLE_BODY_CLASS} { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 12px; }`,
    valid_elements: CMS_ARTICLE_VALID_ELEMENTS,
    invalid_styles: { '*': 'color font-size font-family line-height margin padding width height' },
    paste_remove_styles: true,
    paste_webkit_styles: 'none',
    relative_urls: false,
    convert_urls: false,
    setup(editor: TinyMceEditor) {
      editor.on('init', () => ensureCmsArticleBodyClass(editor));
      editor.on('SetContent', () => ensureCmsArticleBodyClass(editor));
    },
    images_upload_handler: async (blobInfo: { blob: () => Blob; filename: () => string }) => {
      const file = new File([blobInfo.blob()], blobInfo.filename(), { type: blobInfo.blob().type || 'image/jpeg' });
      const result = await uploadMediaFile(file, { kind: 'image', folder: 'editorial/images' });
      return result.url;
    },
    file_picker_types: 'image media',
    file_picker_callback: (
      callback: (url: string, meta?: { title?: string }) => void,
      _value: string,
      meta: { filetype: string },
    ) => {
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
  };
}
