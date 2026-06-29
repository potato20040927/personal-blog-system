import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Mathematics } from '@tiptap/extension-mathematics';
import Underline from '@tiptap/extension-underline';
import { useEffect, useRef, useState } from 'react';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
}

const headingLevels = ['paragraph', '1', '2', '3'];

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onUploadImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https', 'mailto'],
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: 'rich-text-image',
        },
      }),
      Mathematics.configure({
        inlineOptions: {
          onClick: (node, pos) => {
            if (!editor) return;

            const latex = window.prompt('Edit inline LaTeX', node.attrs.latex);
            if (!latex?.trim()) return;

            editor.chain().focus().updateInlineMath({ pos, latex: latex.trim() }).run();
          },
        },
        blockOptions: {
          onClick: (node, pos) => {
            if (!editor) return;

            const latex = window.prompt('Edit block LaTeX', node.attrs.latex);
            if (!latex?.trim()) return;

            editor.chain().focus().updateBlockMath({ pos, latex: latex.trim() }).run();
          },
        },
        katexOptions: {
          throwOnError: false,
        },
      }),
    ],
    content: value || '',
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || value === editor.getHTML()) return;
    editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value]);

  const setHeading = (level: string) => {
    if (!editor) return;

    if (level === 'paragraph') {
      editor.chain().focus().setParagraph().run();
      return;
    }

    editor
      .chain()
      .focus()
      .toggleHeading({ level: Number(level) as 1 | 2 | 3 })
      .run();
  };

  const setLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Link URL', previousUrl || 'https://');

    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertInlineMath = () => {
    if (!editor) return;

    const latex = window.prompt('Inline LaTeX', 'x^2 + y^2 = z^2');
    if (!latex?.trim()) return;

    editor.chain().focus().insertInlineMath({ latex: latex.trim() }).run();
  };

  const insertBlockMath = () => {
    if (!editor) return;

    const latex = window.prompt(
      'Block LaTeX',
      '\\begin{bmatrix}1 & 0 \\\\ 0 & 1\\end{bmatrix}'
    );
    if (!latex?.trim()) return;

    editor.chain().focus().insertBlockMath({ latex: latex.trim() }).run();
  };

  const handleImageFile = async (file: File) => {
    if (!editor) return;

    try {
      setUploadingImage(true);
      const src = onUploadImage
        ? await onUploadImage(file)
        : window.prompt('Image URL') || '';

      if (src) {
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '圖片上傳失敗';
      alert(message);
    } finally {
      setUploadingImage(false);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar" aria-label="文章編輯工具列">
        <select
          aria-label="段落樣式"
          value={
            editor.isActive('heading', { level: 1 })
              ? '1'
              : editor.isActive('heading', { level: 2 })
                ? '2'
                : editor.isActive('heading', { level: 3 })
                  ? '3'
                  : 'paragraph'
          }
          onChange={(event) => setHeading(event.target.value)}
        >
          {headingLevels.map((level) => (
            <option key={level} value={level}>
              {level === 'paragraph' ? 'Paragraph' : `H${level}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={editor.isActive('bold') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={editor.isActive('italic') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={editor.isActive('underline') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </button>
        <button
          type="button"
          className={editor.isActive('strike') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </button>
        <button
          type="button"
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bullets
        </button>
        <button
          type="button"
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbers
        </button>
        <button
          type="button"
          className={editor.isActive('blockquote') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </button>
        <button
          type="button"
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          Code
        </button>
        <button type="button" onClick={setLink}>
          Link
        </button>
        <button type="button" onClick={insertInlineMath}>
          Inline Math
        </button>
        <button type="button" onClick={insertBlockMath}>
          Block Math
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
        >
          {uploadingImage ? 'Uploading' : 'Image'}
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          Clear
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImageFile(file);
          }
          event.target.value = '';
        }}
      />
      <EditorContent
        editor={editor}
        className="rich-text-content"
        data-testid="rich-text-editor"
      />
    </div>
  );
};

export default RichTextEditor;
