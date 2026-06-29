import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Mathematics } from '@tiptap/extension-mathematics';
import Underline from '@tiptap/extension-underline';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
}

const headingLevels = ['paragraph', '1', '2', '3'];
const mathPanelMaxWidth = 420;
const viewportPadding = 16;

type MathEditorState = {
  type: 'inline' | 'block';
  action: 'insert' | 'update';
  latex: string;
  pos?: number;
  anchor: {
    left: number;
    top: number;
  };
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onUploadImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mathPanelRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ left: 0, top: 0 });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mathEditor, setMathEditor] = useState<MathEditorState | null>(null);
  const [draggingMathPanel, setDraggingMathPanel] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
        underline: false,
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
            openMathEditor('inline', node.attrs.latex, pos);
          },
        },
        blockOptions: {
          onClick: (node, pos) => {
            openMathEditor('block', node.attrs.latex, pos);
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

  function openMathEditor(
    type: MathEditorState['type'],
    latex?: string,
    pos?: number,
    action?: MathEditorState['action']
  ) {
    const anchor = getMathEditorAnchor(pos);
    const nextAction = action ?? (pos === undefined ? 'insert' : 'update');

    setMathEditor({
      type,
      action: nextAction,
      latex: nextAction === 'update' ? latex ?? '' : '',
      pos,
      anchor,
    });
  }

  function getMathEditorAnchor(pos?: number) {
    const fallback = { left: viewportPadding, top: 96 };

    if (!editor || typeof window === 'undefined') {
      return fallback;
    }

    try {
      const docSize = editor.state.doc.content.size;
      const resolvedPos = Math.max(0, Math.min(pos ?? editor.state.selection.from, docSize));
      const coords = editor.view.coordsAtPos(resolvedPos);
      const panelWidth = getMathPanelWidth();
      const left = Math.min(
        Math.max(coords.left, viewportPadding),
        Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding)
      );
      const top = Math.min(
        Math.max(coords.bottom + 8, viewportPadding),
        Math.max(viewportPadding, window.innerHeight - 180)
      );

      return { left, top };
    } catch {
      return fallback;
    }
  }

  function getMathPanelWidth() {
    if (typeof window === 'undefined') return mathPanelMaxWidth;
    return Math.min(mathPanelMaxWidth, window.innerWidth - viewportPadding * 2);
  }

  function clampMathPanelPosition(left: number, top: number) {
    if (typeof window === 'undefined') return { left, top };

    const rect = mathPanelRef.current?.getBoundingClientRect();
    const width = rect?.width ?? getMathPanelWidth();
    const height = rect?.height ?? 220;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - width - viewportPadding);
    const maxTop = Math.max(viewportPadding, window.innerHeight - height - viewportPadding);

    return {
      left: Math.min(Math.max(left, viewportPadding), maxLeft),
      top: Math.min(Math.max(top, viewportPadding), maxTop),
    };
  }

  const moveMathPanel = (left: number, top: number) => {
    setMathEditor((current) =>
      current ? { ...current, anchor: clampMathPanelPosition(left, top) } : current
    );
  };

  const startDraggingMathPanel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!mathEditor) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOffsetRef.current = {
      left: event.clientX - mathEditor.anchor.left,
      top: event.clientY - mathEditor.anchor.top,
    };
    setDraggingMathPanel(true);
  };

  const dragMathPanel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingMathPanel) return;

    moveMathPanel(
      event.clientX - dragOffsetRef.current.left,
      event.clientY - dragOffsetRef.current.top
    );
  };

  const stopDraggingMathPanel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingMathPanel) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    setDraggingMathPanel(false);
  };

  const closeMathEditor = () => {
    setMathEditor(null);
  };

  const handleMathEditorConfirm = () => {
    if (!editor || !mathEditor) return;

    const latex = mathEditor.latex.trim();
    if (!latex) return;

    editor.commands.focus();

    if (mathEditor.type === 'inline') {
      if (mathEditor.action === 'update' && mathEditor.pos !== undefined) {
        editor.commands.updateInlineMath({ pos: mathEditor.pos, latex });
      } else {
        editor.commands.insertContentAt(
          mathEditor.pos ?? editor.state.selection.from,
          { type: 'inlineMath', attrs: { latex } }
        );
      }
    } else if (mathEditor.action === 'update' && mathEditor.pos !== undefined) {
      editor.commands.updateBlockMath({ pos: mathEditor.pos, latex });
    } else {
      editor.commands.insertContentAt(
        mathEditor.pos ?? editor.state.selection.from,
        { type: 'blockMath', attrs: { latex } }
      );
    }

    closeMathEditor();
  };

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
    openMathEditor('inline', undefined, editor?.state.selection.from, 'insert');
  };

  const insertBlockMath = () => {
    openMathEditor('block', undefined, editor?.state.selection.from, 'insert');
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
      {mathEditor && (
        <div
          ref={mathPanelRef}
          className="math-editor-panel"
          style={{
            left: `${mathEditor.anchor.left}px`,
            top: `${mathEditor.anchor.top}px`,
          }}
        >
          <div
            className="math-editor-header"
            onPointerDown={startDraggingMathPanel}
            onPointerMove={dragMathPanel}
            onPointerUp={stopDraggingMathPanel}
            onPointerCancel={stopDraggingMathPanel}
          >
            <strong>
              {mathEditor.action === 'insert' ? '新增' : '編輯'}
              {mathEditor.type === 'inline' ? ' Inline Math' : ' Block Math'}
            </strong>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={closeMathEditor}
              aria-label="關閉公式編輯器"
            >
              ×
            </button>
          </div>
          <textarea
            autoFocus
            aria-label="LaTeX 內容"
            value={mathEditor.latex}
            onChange={(event) =>
              setMathEditor((current) =>
                current ? { ...current, latex: event.target.value } : current
              )
            }
          />
          <div className="math-editor-actions">
            <button type="button" onClick={closeMathEditor}>
              取消
            </button>
            <button
              type="button"
              className="math-editor-confirm"
              onClick={handleMathEditorConfirm}
              disabled={!mathEditor.latex.trim()}
            >
              確認
            </button>
          </div>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="rich-text-content"
        data-testid="rich-text-editor"
      />
    </div>
  );
};

export default RichTextEditor;
