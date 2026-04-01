import { useState, useEffect, useRef } from 'react'
import { Plus, Edit, Trash2, Upload, FileText, Calendar, Folder } from 'lucide-react'
import RichTextEditor, { RichTextEditorRef } from '../../components/RichTextEditor'

interface SpecialTopic {
  id: string
  title: string
  slug: string
  description: string
  coverImage?: string
  content: string
  articles: string[]
  status: string
  createdAt: string
  updatedAt: string
}

interface DailyArticle {
  id: string
  title: string
}

interface Image {
  id: string
  localPath: string
  caption?: string
}

export default function SpecialTopicsAdmin() {
  const [topics, setTopics] = useState<SpecialTopic[]>([])
  const [articles, setArticles] = useState<DailyArticle[]>([])
  const [selectedTopic, setSelectedTopic] = useState<SpecialTopic | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editorKey, setEditorKey] = useState(0) // 用于强制刷新编辑器
  const editorRef = useRef<RichTextEditorRef>(null)
  const [imageSelectMode, setImageSelectMode] = useState<'cover' | 'content'>('content')

  const [editForm, setEditForm] = useState({
    title: '',
    slug: '',
    description: '',
    coverImage: '',
    content: '',
    articles: [] as string[],
    author: '',
    status: 'DRAFT'
  })

  useEffect(() => {
    fetchTopics()
    fetchArticles()
  }, [])

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/special-topics?limit=50')
      if (response.ok) {
        const json = await response.json()
        setTopics(json.data || [])
      }
    } catch (error) {
      console.error('获取专题失败:', error)
    }
  }

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/daily-articles?limit=100&status=PUBLISHED')
      if (response.ok) {
        const json = await response.json()
        setArticles(json.data || [])
      }
    } catch (error) {
      console.error('获取文章失败:', error)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const url = selectedTopic
        ? `/api/special-topics/${selectedTopic.id}`
        : '/api/special-topics'

      const response = await fetch(url, {
        method: selectedTopic ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        setMessage('保存成功')
        setShowEditModal(false)
        resetForm()
        fetchTopics()
      } else {
        setMessage('保存失败')
      }
    } catch (error) {
      setMessage('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个专题吗？')) return

    try {
      const response = await fetch(`/api/special-topics/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage('删除成功')
        fetchTopics()
      } else {
        setMessage('删除失败')
      }
    } catch (error) {
      setMessage('删除失败')
    }
  }

  const handleEdit = (topic: SpecialTopic) => {
    setSelectedTopic(topic)
    const authors = topic.author ? topic.author.split(', ') : []
    setSelectedAuthors(authors)
    setEditForm({
      title: topic.title,
      slug: topic.slug,
      description: topic.description,
      coverImage: topic.coverImage || '',
      content: topic.content,
      articles: topic.articles || [],
      author: topic.author || '',
      status: topic.status
    })
    setShowEditModal(true)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setLoading(true)
    setMessage('')

    try {
      // 使用新的文件提取函数（支持文件夹）
      const { extractFilesFromFileList } = await import('../../utils/fileParser')
      const { mdFile, imageFiles } = extractFilesFromFileList(files)

      if (!mdFile) {
        setMessage('未找到Markdown文件（.md），请确保文件夹中包含.md文件')
        setLoading(false)
        return
      }

      console.log('找到Markdown文件:', mdFile.name)
      console.log('检测到图片文件:', Array.from(imageFiles.keys()))

      const { parseMarkdownFile } = await import('../../utils/fileParser')

      const content = await parseMarkdownFile(
        mdFile,
        imageFiles,
        (progressMsg) => {
          setMessage(progressMsg)
        }
      )

      console.log('解析后的内容长度:', content.length)

      // 插入到编辑器现有内容之后
      const newContent = editForm.content ? editForm.content + '\n\n' + content : content
      setEditForm({ ...editForm, content: newContent })
      setMessage('Markdown文件解析成功，图片已自动上传！')
      console.log('内容已更新')

      // 强制刷新编辑器
      setTimeout(() => {
        setEditorKey(prev => prev + 1)
      }, 100)
    } catch (error) {
      console.error('文件上传失败:', error)
      setMessage('文件上传失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
    // 重置input以允许重复选择相同文件
    e.target.value = ''
  }

  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([])
  const [adminUsers, setAdminUsers] = useState<any[]>([])

  useEffect(() => {
    fetchAdminUsers()
  }, [])

  const fetchAdminUsers = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      console.log('获取管理员(专题), token存在:', !!token)
      const response = await fetch('/api/admin-users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      console.log('获取管理员响应状态(专题):', response.status)
      if (response.ok) {
        const json = await response.json()
        console.log('管理员数据(专题):', json)
        setAdminUsers(json.data || [])
      } else {
        console.error('获取管理员失败(专题), 状态:', response.status)
        const errorText = await response.text()
        console.error('错误文本(专题):', errorText)
      }
    } catch (error) {
      console.error('获取管理员失败(专题):', error)
    }
  }

  const toggleAuthorSelection = (username: string) => {
    let newSelectedAuthors: string[]
    if (selectedAuthors.includes(username)) {
      newSelectedAuthors = selectedAuthors.filter(u => u !== username)
    } else {
      newSelectedAuthors = [...selectedAuthors, username]
    }
    setSelectedAuthors(newSelectedAuthors)
    setEditForm({ ...editForm, author: newSelectedAuthors.join(', ') })
  }

  const handleImageFromLibrary = (image: Image) => {
    if (imageSelectMode === 'cover') {
      setEditForm({ ...editForm, coverImage: image.localPath })
    } else {
      editorRef.current?.insertImage(image.localPath)
      editorRef.current?.focus()
    }
    setShowImageLibrary(false)
  }

  const handleStatusToggle = async (topic: SpecialTopic) => {
    const newStatus = topic.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'

    try {
      const response = await fetch(`/api/special-topics/${topic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...topic, status: newStatus })
      })

      if (response.ok) {
        fetchTopics()
      }
    } catch (error) {
      console.error('状态切换失败:', error)
    }
  }

  const toggleArticleSelection = (articleId: string) => {
    if (editForm.articles.includes(articleId)) {
      setEditForm({
        ...editForm,
        articles: editForm.articles.filter(id => id !== articleId)
      })
    } else {
      setEditForm({
        ...editForm,
        articles: [...editForm.articles, articleId]
      })
    }
  }

  const resetForm = () => {
    setEditForm({
      title: '',
      slug: '',
      description: '',
      coverImage: '',
      content: '',
      articles: [],
      author: '',
      status: 'DRAFT'
    })
    setSelectedTopic(null)
    setSelectedAuthors([])
  }

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">专题栏目管理</h2>
        <button
          onClick={() => {
            resetForm()
            setShowEditModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          新建专题
        </button>
      </div>

      {/* 专题列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">标题</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">描述</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">文章数</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">创建时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">状态</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <tr key={topic.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{topic.title}</div>
                  <div className="text-sm text-slate-500">{topic.slug}</div>
                  {topic.coverImage && (
                    <img src={topic.coverImage} alt="" className="w-16 h-16 object-cover rounded mt-2" />
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 text-sm max-w-xs truncate">
                  {topic.description}
                </td>
                <td className="px-4 py-3 text-slate-600">{topic.articles?.length || 0}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(topic.createdAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleStatusToggle(topic)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      topic.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {topic.status === 'PUBLISHED' ? '已发布' : '草稿'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(topic)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="编辑"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(topic.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto my-8">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedTopic ? '编辑专题' : '新建专题'}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">标题 *</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">URL标识符 *</label>
                  <input
                    type="text"
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="例如: ai-development-trend"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">描述</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="专题简要描述"
                  required
                />
              </div>

              {/* 封面图片 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">封面图片</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.coverImage}
                    onChange={(e) => setEditForm({ ...editForm, coverImage: e.target.value })}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="输入图片URL或从图片库选择"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageSelectMode('cover')
                      setShowImageLibrary(true)
                    }}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2"
                  >
                    <FileText size={18} />
                    从图片库选择
                  </button>
                </div>
                {editForm.coverImage && (
                  <img src={editForm.coverImage} alt="封面预览" className="w-48 h-32 object-cover rounded-lg mt-2" />
                )}
              </div>

              {/* 文件上传 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">导入内容</label>
                <div className="space-y-2">
                  {/* 文件夹上传 */}
                  <label className="block">
                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg hover:border-blue-500 hover:bg-blue-100 cursor-pointer">
                      <Upload size={24} className="text-blue-500" />
                      <div className="text-sm font-medium text-blue-600">选择文件夹上传（推荐）</div>
                      <p className="text-xs text-blue-500 text-center">
                        在Typora中将图片保存到与.md文件同一文件夹，然后选择整个文件夹上传
                      </p>
                      <input
                        type="file"
                        accept=".md,.markdown,image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        //@ts-ignore
                        webkitdirectory=""
                        directory=""
                      />
                    </div>
                  </label>
                  
                  {/* 多文件上传（备选） */}
                  <label className="block">
                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 cursor-pointer">
                      <div className="text-xs text-slate-500">或手动选择多个文件</div>
                      <input
                        type="file"
                        accept=".md,.markdown,image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </label>
                </div>
                {loading && <p className="text-sm text-blue-600 mt-2">处理中...</p>}
                {message && <p className="text-sm text-green-600 mt-2">{message}</p>}
              </div>

              {/* 选择作者 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">选择作者（管理员）</label>
                <div className="border border-slate-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {adminUsers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">暂无管理员</div>
                  ) : (
                    <div className="space-y-2">
                      {adminUsers.map((admin) => (
                        <label key={admin.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAuthors.includes(admin.username)}
                            onChange={() => toggleAuthorSelection(admin.username)}
                            className="w-4 h-4"
                          />
                          <span className="flex-1 text-slate-700">{admin.username}</span>
                          {admin.avatar && (
                            <img src={admin.avatar} alt={admin.username} className="w-8 h-8 rounded-full object-cover" />
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  已选择 {selectedAuthors.length} 位作者
                </div>
              </div>

              {/* 富文本编辑器 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">专题内容</label>
                <RichTextEditor
                  ref={editorRef}
                  key={editorKey}
                  content={editForm.content}
                  onChange={(content) => setEditForm({ ...editForm, content })}
                  onImageSelect={() => {
                    setImageSelectMode('content')
                    setShowImageLibrary(true)
                  }}
                  skipImageLibrary={true}
                />
              </div>

              {/* 状态 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">状态</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DRAFT">草稿</option>
                  <option value="PUBLISHED">已发布</option>
                  <option value="ARCHIVED">已归档</option>
                </select>
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                  disabled={loading}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400"
                  disabled={loading}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 图片库选择器 */}
      {showImageLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold">选择图片</h3>
              <button
                onClick={() => setShowImageLibrary(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                ✕
              </button>
            </div>
            <ImageLibrarySelector onSelect={handleImageFromLibrary} />
          </div>
        </div>
      )}

      {/* 消息提示 */}
      {message && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
          message.includes('成功') ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}

function ImageLibrarySelector({ onSelect }: { onSelect: (image: Image) => void }) {
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/image-library?limit=100')
      if (response.ok) {
        const json = await response.json()
        console.log('图片库数据:', json)
        setImages(json.data || json.images || [])
      } else {
        setError('获取图片库失败')
      }
    } catch (error) {
      console.error('获取图片库失败:', error)
      setError('获取图片库失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 overflow-y-auto max-h-[60vh]">
      {loading ? (
        <div className="text-center py-8 text-slate-500">加载中...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : images.length === 0 ? (
        <div className="text-center py-8 text-slate-500">暂无图片</div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              onClick={() => onSelect(image)}
              className="cursor-pointer hover:ring-2 hover:ring-blue-500 rounded-lg overflow-hidden"
            >
              <img
                src={image.localPath}
                alt={image.caption}
                className="w-full h-32 object-cover"
                onError={(e) => {
                  console.error('图片加载失败:', image.localPath, e);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {image.caption && (
                <div className="p-2 text-sm text-slate-600 bg-slate-50 truncate">
                  {image.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
