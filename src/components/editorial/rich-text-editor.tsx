'use client';

import type { Editor as TinyMceEditor } from 'tinymce';
import { Editor, type IAllProps } from '@tinymce/tinymce-react';
import { useEffect, useMemo, useRef } from 'react';

import { buildRichTextEditorInit } from '@/lib/rich-text-editor-config';

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
  const editorInit = useMemo(
    () => buildRichTextEditorInit({ minHeight, maxHeight }),
    [minHeight, maxHeight],
  );

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
        init={editorInit as unknown as IAllProps['init']}
      />
    </div>
  );
}
