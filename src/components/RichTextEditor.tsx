import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  FolderOpen,
} from 'lucide-react'
import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'

// 自定义Image扩展，支持width属性
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: el => el.getAttribute('width') || el.style.width || null,
        renderHTML: attrs => {
          if (!attrs.width) return {}
          return {
            width: attrs.width,
            style: `width: ${attrs.width}; height: auto;`
          }
        },
      },
    }
  },
})

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  onImageSelect?: () => void
  skipImageLibrary?: boolean
}

export interface RichTextEditorRef {
  insertImage: (url: string) => void
  focus: () => void
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content, onChange, onImageSelect, skipImageLibrary = false }, ref) => {
    const [showImageModal, setShowImageModal] = useState(false)
    const [imageUrl, setImageUrl] = useState('')
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
          paragraph: {
            keepMarks: true,
            keepAttributes: true,
          },
        }),
        CustomImage.configure({
          inline: false,
          allowBase64: true,
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
      ],
      content,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML())
      },
    })

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      insertImage: (url: string) => {
        if (editor) {
          editor.chain().focus().setImage({ src: url }).run()
        }
      },
      focus: () => {
        if (editor) {
          editor.commands.focus()
        }
      },
    }))

    // 当外部content变化时更新编辑器
    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        editor.commands.setContent(content, false, {
          parseOptions: {
            preserveWhitespace: 'full',
          },
        })
      }
    }, [editor, content])

    if (!editor) {
      return null
    }

    const insertImage = () => {
      if (imageUrl) {
        editor.chain().focus().setImage({ src: imageUrl }).run()
        setShowImageModal(false)
        setImageUrl('')
      }
    }

    // 上传本地图片
    const handleLocalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('image', file)

        const skipParam = skipImageLibrary ? '?skipLibrary=true' : ''
        const response = await fetch(`/api/image-library${skipParam}`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('上传失败')
        }

        const data = await response.json()
        const imageUrl = data.localPath || data.url
        
        // 插入图片到编辑器
        editor.chain().focus().setImage({ src: imageUrl }).run()
      } catch (error) {
        console.error('图片上传失败:', error)
        alert('图片上传失败，请重试')
      } finally {
        setUploading(false)
        // 重置input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }

    const MenuButton = ({ onClick, active, children, title }: { 
      onClick: () => void, 
      active?: boolean, 
      children: React.ReactNode,
      title?: string
    }) => (
      <button
        onClick={onClick}
        title={title}
        className={`p-2 rounded hover:bg-gray-100 ${active ? 'bg-blue-100 text-blue-600' : ''}`}
      >
        {children}
      </button>
    )

    // 图片大小调整选项
    const resizeImage = (width: string) => {
      editor.chain().focus().updateAttributes('image', { 
        width,
        style: `width: ${width}; height: auto;`
      }).run()
    }

    // 检查当前是否选中图片
    const isImageSelected = editor.isActive('image')

    return (
      <div className="border border-gray-300 rounded-lg">
        {/* 工具栏 */}
        <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-white">
          {/* 文本格式 */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
            <MenuButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="粗体"
            >
              <Bold size={18} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="斜体"
            >
              <Italic size={18} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              title="下划线"
            >
              <UnderlineIcon size={18} />
            </MenuButton>
          </div>

          {/* 标题 */}
          <div className="flex items-center gap-1 px-2 border-r border-gray-200">
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
              title="标题1"
            >
              <Heading1 size={18} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              title="标题2"
            >
              <Heading2 size={18} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
              title="标题3"
            >
              <Heading3 size={18} />
            </MenuButton>
          </div>

          {/* 列表 */}
          <div className="flex items-center gap-1 px-2 border-r border-gray-200">
            <MenuButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="无序列表"
            >
              <List size={18} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="有序列表"
            >
              <ListOrdered size={18} />
            </MenuButton>
          </div>

          {/* 对齐 */}
          <div className="flex items-center gap-1 px-2 border-r border-gray-200">
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              active={editor.isActive({ textAlign: 'left' })}
              title="左对齐"
            >
              <AlignLeft size={18} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              active={editor.isActive({ textAlign: 'center' })}
              title="居中"
            >
              <AlignCenter size={18} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              active={editor.isActive({ textAlign: 'right' })}
              title="右对齐"
            >
              <AlignRight size={18} />
            </MenuButton>
          </div>

          {/* 图片 */}
          <div className="flex items-center gap-1 px-2 border-r border-gray-200">
            {/* 本地图片上传 */}
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLocalImageUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className={`p-2 rounded hover:bg-gray-100 ${uploading ? 'opacity-50' : ''}`}>
                <Upload size={18} title="上传本地图片" />
              </div>
            </label>
            
            {/* 图片库 */}
            {onImageSelect && (
              <MenuButton 
                onClick={onImageSelect}
                title="从图片库选择"
              >
                <FolderOpen size={18} />
              </MenuButton>
            )}
            
            {/* URL插入 */}
            <MenuButton 
              onClick={() => setShowImageModal(true)}
              title="输入图片URL"
            >
              <ImageIcon size={18} />
            </MenuButton>
          </div>

          {/* 图片大小调整 */}
          {isImageSelected && (
            <div className="flex items-center gap-1 px-2 border-l border-gray-200">
              <span className="text-xs text-gray-500">图片大小:</span>
              <button
                onClick={() => resizeImage('25%')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                小
              </button>
              <button
                onClick={() => resizeImage('50%')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                中
              </button>
              <button
                onClick={() => resizeImage('100%')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                大
              </button>
            </div>
          )}

          {/* 链接 */}
          <div className="flex items-center gap-1 px-2">
            <MenuButton
              onClick={() => {
                const url = window.prompt('输入链接地址:')
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run()
                }
              }}
              active={editor.isActive('link')}
              title="插入链接"
            >
              <LinkIcon size={18} />
            </MenuButton>
          </div>
        </div>

        {/* 编辑器内容 */}
        <EditorContent
          editor={editor}
          className="prose max-w-none min-h-[500px] p-4 focus:outline-none rich-text-content"
        />

        <style>{`
          .rich-text-content {
            line-height: 1.75;
          }
          .rich-text-content h1 {
            font-size: 2em;
            font-weight: bold;
            margin: 1em 0 0.5em;
            text-align: left;
          }
          .rich-text-content h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 1em 0 0.5em;
            text-align: left;
          }
          .rich-text-content h3 {
            font-size: 1.25em;
            font-weight: bold;
            margin: 1em 0 0.5em;
            text-align: left;
          }
          .rich-text-content p {
            margin: 1em 0;
            text-align: left;
          }
          .rich-text-content img {
            max-width: 100%;
            height: auto;
            margin: 1em 0;
            display: block;
            cursor: pointer;
          }
          .rich-text-content img.ProseMirror-selectedNode {
            outline: 3px solid #3b82f6;
            outline-offset: 2px;
          }
          .rich-text-content ul, .rich-text-content ol {
            margin: 1em 0;
            padding-left: 2em;
          }
          .rich-text-content li {
            margin: 0.25em 0;
          }
          .rich-text-content ul > li {
            list-style-type: disc;
          }
          .rich-text-content ol > li {
            list-style-type: decimal;
          }
          .rich-text-content blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1em;
            margin: 1em 0;
            color: #6b7280;
          }
          .rich-text-content code {
            background: #f3f4f6;
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-family: monospace;
          }
          .rich-text-content pre {
            background: #1f2937;
            color: #f9fafb;
            padding: 1em;
            border-radius: 8px;
            overflow-x: auto;
          }
          .rich-text-content pre code {
            background: transparent;
            padding: 0;
          }
        `}</style>

        {/* 图片插入弹窗 */}
        {showImageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">插入图片</h3>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="输入图片URL"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImageModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={insertImage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  插入
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor
