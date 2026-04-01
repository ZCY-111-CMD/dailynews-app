import { useEffect, useState, useCallback } from 'react'
import { DailyArticle, Category, ArticleStatus } from '../../types'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Plus, Edit, Trash2, Eye, RefreshCw, Archive, Save, ChevronLeft, ChevronRight, CheckSquare, Square, Recycle, RotateCcw, FileText, Send, X, Upload, Star, GripVertical, ArrowUp, ArrowDown, FolderPlus, CalendarDays, UserPlus, Search } from 'lucide-react'
import { fetchAPI } from '../../lib/api'

// 清理HTML标签的辅助函数
function cleanHtmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 获取图片URL的辅助函数
const getImageUrl = (imagePath: string) => {
  if (!imagePath) {
    return 'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=800';
  }
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return imagePath.startsWith('/') ? imagePath : `/uploads/${imagePath}`;
};

// 图片轮播组件
function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const nextImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    setImageError(false);
  };

  const prevImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    setImageError(false);
  };

  if (images.length === 0) return null;

  const handleImageError = () => {
    setImageError(true);
  };

  const defaultImage = 'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=800';

  return (
    <div className="relative w-full overflow-hidden">
      <div className="relative aspect-[16/9] w-full">
        <img
          src={imageError ? defaultImage : getImageUrl(images[currentIndex])}
          alt={alt}
          className="w-full h-full object-cover transition-opacity duration-500"
          onError={handleImageError}
        />
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setImageError(false);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ArticleDraft {
  id: string
  articleId: string | null
  title: string
  content: string
  summary: string | null
  category: Category
  photographer: string | null
  author: string | null
  featuredImage: string | null
  images: string[]
  source: string | null
  sourceUrl: string | null
  createdAt: string
  updatedAt: string
}

interface ArticleHistory {
  id: string
  articleId: string
  title: string
  content: string
  summary: string | null
  publishTime: string
  category: Category
  featuredImage: string | null
  images: string[]
  source: string | null
  sourceUrl: string | null
  archivedAt: string
  article: DailyArticle
}

const DailyArticlesAdmin = () => {
  const [articles, setArticles] = useState<DailyArticle[]>([])
  const [drafts, setDrafts] = useState<ArticleDraft[]>([])
  const [history, setHistory] = useState<ArticleHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('articles')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingArticle, setEditingArticle] = useState<DailyArticle | ArticleDraft | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showRecycleBin, setShowRecycleBin] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [admins, setAdmins] = useState<any[]>([])
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // === 精选编排相关状态 ===
  const [selectionDate, setSelectionDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [selectionArticles, setSelectionArticles] = useState<any[]>([])
  const [poolArticles, setPoolArticles] = useState<any[]>([])
  const [poolSearch, setPoolSearch] = useState('')
  const [poolStatusFilter, setPoolStatusFilter] = useState<'all' | 'PUBLISHED' | 'DRAFT'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [loadingSelection, setLoadingSelection] = useState(false)
  const [selectionSelectedItems, setSelectionSelectedItems] = useState<Set<string>>(new Set())

  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    loadData()
    setSelectedItems(new Set())
  }, [activeTab, selectedSource, selectedDate, currentPage, showRecycleBin])

  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        console.log('No admin token found')
        return
      }

      // 使用原生fetch并添加admin_token
      const response = await fetch('/api/admin-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          console.log('No permission to load admins, skipping...')
          return
        }
        throw new Error(`Failed to load admins: ${response.status}`)
      }

      const data = await response.json()
      setAdmins(data.data || [])
    } catch (error) {
      console.error('Failed to load admins:', error)
      // 不设置错误状态，因为管理员列表不是必需的
    }
  }

  // === 精选编排功能 ===
  const loadSelectionData = useCallback(async () => {
    if (activeTab !== 'selection') return
    setLoadingSelection(true)
    try {
      // 加载选中日期的已发布文章（当前精选）
      const targetDate = new Date(selectionDate + 'T00:00:00.000Z')
      const nextDate = new Date(targetDate)
      nextDate.setDate(nextDate.getDate() + 1)

      const allRes = await fetchAPI<{ data: any[]; total: number }>(
        `/daily-articles?limit=100&offset=0`
      )
      const allArticles = allRes.data || []

      // 当前日期的精选文章
      const selected = allArticles.filter((a: any) => {
        const pt = new Date(a.publishTime)
        return (
          a.status === 'PUBLISHED' &&
          pt.getFullYear() === targetDate.getFullYear() &&
          pt.getMonth() === targetDate.getMonth() &&
          pt.getDate() === targetDate.getDate()
        )
      }).sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || new Date(a.publishTime).getTime() - new Date(b.publishTime).getTime())

      // 文章池（非当前日期的精选 + 所有草稿）
      const pool = allArticles.filter((a: any) => {
        if (a.status === 'DRAFT') return true
        if (a.status === 'ARCHIVED') return false
        const pt = new Date(a.publishTime)
        const isCurrentDate =
          pt.getFullYear() === targetDate.getFullYear() &&
          pt.getMonth() === targetDate.getMonth() &&
          pt.getDate() === targetDate.getDate()
        return !isCurrentDate
      })

      setSelectionArticles(selected)
      setPoolArticles(pool)
    } catch (error) {
      console.error('Failed to load selection data:', error)
    } finally {
      setLoadingSelection(false)
    }
  }, [activeTab, selectionDate])

  useEffect(() => {
    if (activeTab === 'selection') {
      loadSelectionData()
    }
  }, [activeTab, selectionDate, loadSelectionData])

  // 将文章加入精选
  const handleAddToSelection = async (articleIds: string[]) => {
    try {
      const targetDateTime = new Date(selectionDate + 'T08:00:00.000Z')
      for (let i = 0; i < articleIds.length; i++) {
        const time = new Date(targetDateTime)
        time.setMinutes(time.getMinutes() + i)
        await fetchAPI(`/daily-articles/${articleIds[i]}`, {
          method: 'PUT',
          body: JSON.stringify({
            status: 'PUBLISHED',
            publishTime: time.toISOString()
          })
        })
      }
      loadSelectionData()
    } catch (error) {
      console.error('添加精选失败:', error)
      alert('添加精选失败')
    }
  }

  // 从精选中撤回
  const handleWithdrawFromSelection = async (articleId: string) => {
    try {
      await fetchAPI(`/daily-articles/${articleId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'DRAFT' })
      })
      loadSelectionData()
    } catch (error) {
      console.error('撤回失败:', error)
      alert('撤回失败')
    }
  }

  // 修改精选发布日期
  const handleChangeSelectionDate = async (newDate: string) => {
    try {
      const articleIds = selectionArticles.map((a: any) => a.id)
      const targetDateTime = new Date(newDate + 'T08:00:00.000Z')
      for (let i = 0; i < articleIds.length; i++) {
        const time = new Date(targetDateTime)
        time.setMinutes(time.getMinutes() + i)
        await fetchAPI(`/daily-articles/${articleIds[i]}`, {
          method: 'PUT',
          body: JSON.stringify({ publishTime: time.toISOString() })
        })
      }
      setSelectionDate(newDate)
    } catch (error) {
      console.error('修改日期失败:', error)
      alert('修改日期失败')
    }
  }

  // 调整精选顺序（上移/下移），使用 sortOrder 字段
  const handleMoveArticle = async (articleId: string, direction: 'up' | 'down') => {
    const idx = selectionArticles.findIndex((a: any) => a.id === articleId)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= selectionArticles.length) return

    // 构建新的排序数组，交换位置
    const newOrder = selectionArticles.map((a: any, i: number) => ({
      id: a.id,
      sortOrder: i === idx ? targetIdx : (i === targetIdx ? idx : i)
    }))

    try {
      await fetchAPI('/daily-articles/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ items: newOrder })
      })
      loadSelectionData()
    } catch (error) {
      console.error('调整顺序失败:', error)
      alert('调整顺序失败')
    }
  }

  // 批量设置管理员为作者
  const handleSetAdminAsAuthor = async (articleIds: string[]) => {
    if (admins.length === 0) {
      alert('没有可用的管理员账号')
      return
    }
    try {
      const authorName = admins[0].username
      for (const id of articleIds) {
        await fetchAPI(`/daily-articles/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ author: authorName })
        })
      }
      loadSelectionData()
    } catch (error) {
      console.error('设置作者失败:', error)
      alert('设置作者失败')
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)

      if (activeTab === 'articles') {
        const offset = (currentPage - 1) * ITEMS_PER_PAGE
        const status = showRecycleBin ? 'ARCHIVED' : 'PUBLISHED'
        const response = await fetchAPI<{ data: any[], total: number }>(
          `/daily-articles?status=${status}&limit=${ITEMS_PER_PAGE}&offset=${offset}`
        )
        let processedArticles = response.data.map((article: any) => ({
          ...article,
          category: article.category as Category,
          status: article.status as ArticleStatus,
          views: article.views || 0
        }))

        // 客户端筛选
        if (selectedSource !== 'all') {
          processedArticles = processedArticles.filter((article: any) => article.source === selectedSource)
        }

        if (selectedDate !== 'all') {
          const targetDate = new Date(selectedDate)
          processedArticles = processedArticles.filter((article: any) => {
            const articleDate = new Date(article.publishTime)
            return articleDate.toDateString() === targetDate.toDateString()
          })
        }

        setArticles(processedArticles)
        setTotalPages(Math.ceil(response.total / ITEMS_PER_PAGE))
      } else if (activeTab === 'drafts') {
        const offset = (currentPage - 1) * ITEMS_PER_PAGE
        const response = await fetchAPI<{ data: any[], total: number }>(
          `/daily-articles?status=DRAFT&limit=${ITEMS_PER_PAGE}&offset=${offset}`
        )
        const allArticles = response.data as any[]

        const processedDrafts = allArticles.map((article: any) => ({
          id: article.id,
          articleId: article.id,
          title: article.title,
          content: article.content,
          summary: article.summary,
          category: article.category as Category,
          photographer: article.photographer,
          author: article.author,
          featuredImage: article.featuredImage,
          images: article.images,
          source: article.source,
          sourceUrl: article.sourceUrl,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt
        }))

        // 客户端筛选
        const filteredDrafts = selectedSource === 'all'
          ? processedDrafts
          : processedDrafts.filter((draft: ArticleDraft) => draft.source === selectedSource)

        let dateFilteredDrafts = filteredDrafts
        if (selectedDate !== 'all') {
          const targetDate = new Date(selectedDate)
          dateFilteredDrafts = filteredDrafts.filter((draft: ArticleDraft) => {
            const articleDate = new Date(draft.createdAt)
            return articleDate.toDateString() === targetDate.toDateString()
          })
        }

        setDrafts(dateFilteredDrafts)
        setTotalPages(Math.ceil(response.total / ITEMS_PER_PAGE))
      } else if (activeTab === 'history') {
        const response = await fetchAPI<{ data: any[] }>('/daily-articles/history')
        setHistory(response.data as ArticleHistory[])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取可用日期列表
  const getAvailableDates = () => {
    const dates = new Set<string>()
    const items = activeTab === 'articles' ? articles : drafts
    items.forEach(item => {
      const dateField = activeTab === 'articles' ? item.publishTime : item.createdAt
      if (dateField) {
        dates.add(new Date(dateField).toISOString().split('T')[0])
      }
    })
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  }

  // 删除/移入回收站文章
  const handleDelete = async (id: string) => {
    if (!confirm('确定要将这篇文章移入回收站吗？')) return

    try {
      await fetchAPI(`/daily-articles/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ARCHIVED' })
      })
      setCurrentPage(1)
      loadData()
    } catch (error) {
      console.error('Failed to delete article:', error)
      alert('删除失败')
    }
  }

  // 批量删除/移入回收站
  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`确定要将选中的 ${selectedItems.size} 篇文章移入回收站吗？`)) return

    try {
      for (const id of selectedItems) {
        await fetchAPI(`/daily-articles/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'ARCHIVED' })
        })
      }
      setSelectedItems(new Set())
      setCurrentPage(1)
      loadData()
    } catch (error) {
      console.error('Failed to batch delete articles:', error)
      alert('批量删除失败')
    }
  }

  // 批量撤回为草稿
  const handleBatchWithdrawToDraft = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`确定要将选中的 ${selectedItems.size} 篇文章撤回为草稿吗？`)) return

    try {
      for (const id of selectedItems) {
        await fetchAPI(`/daily-articles/${id}/unpublish`, { method: 'PUT' })
      }
      setSelectedItems(new Set())
      loadData()
    } catch (error) {
      console.error('Failed to batch unpublish:', error)
      alert('批量撤回失败')
    }
  }

  // 精选编排批量撤回为草稿
  const handleBatchWithdrawFromSelection = async () => {
    if (selectionSelectedItems.size === 0) return
    if (!confirm(`确定要将选中的 ${selectionSelectedItems.size} 篇文章从精选中撤回为草稿吗？`)) return

    try {
      for (const id of selectionSelectedItems) {
        await fetchAPI(`/daily-articles/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'DRAFT' })
        })
      }
      setSelectionSelectedItems(new Set())
      loadSelectionData()
    } catch (error) {
      console.error('Failed to batch withdraw from selection:', error)
      alert('批量撤回失败')
    }
  }

  // 恢复文章
  const handleRestore = async (id: string) => {
    try {
      await fetchAPI(`/daily-articles/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PUBLISHED' })
      })
      loadData()
    } catch (error) {
      console.error('Failed to restore article:', error)
      alert('恢复失败')
    }
  }

  // 批量恢复
  const handleBatchRestore = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`确定要恢复选中的 ${selectedItems.size} 篇文章吗？`)) return

    try {
      for (const id of selectedItems) {
        await fetchAPI(`/daily-articles/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'PUBLISHED' })
        })
      }
      setSelectedItems(new Set())
      loadData()
    } catch (error) {
      console.error('Failed to batch restore articles:', error)
      alert('批量恢复失败')
    }
  }

  // 永久删除
  const handlePermanentlyDelete = async (id: string) => {
    if (!confirm('确定要永久删除这篇文章吗？此操作无法撤销！')) return

    try {
      await fetchAPI(`/daily-articles/${id}`, { method: 'DELETE' })
      loadData()
    } catch (error) {
      console.error('Failed to permanently delete article:', error)
      alert('永久删除失败')
    }
  }

  // 批量永久删除
  const handleBatchPermanentlyDelete = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`确定要永久删除选中的 ${selectedItems.size} 篇文章吗？此操作无法撤销！`)) return

    try {
      for (const id of selectedItems) {
        await fetchAPI(`/daily-articles/${id}`, { method: 'DELETE' })
      }
      setSelectedItems(new Set())
      loadData()
    } catch (error) {
      console.error('Failed to batch permanently delete articles:', error)
      alert('批量永久删除失败')
    }
  }

  // 编辑文章
  const handleEdit = (article: DailyArticle | ArticleDraft) => {
    setEditingArticle(article)
    setShowEditModal(true)
  }

  // 保存编辑
  const handleSaveEdit = async (updatedArticle: Partial<DailyArticle | ArticleDraft>) => {
    if (!editingArticle) return

    try {
      await fetchAPI(`/daily-articles/${editingArticle.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedArticle)
      })
      setShowEditModal(false)
      setEditingArticle(null)
      loadData()
    } catch (error) {
      console.error('Failed to save article:', error)
      alert('保存失败')
    }
  }

  // 创建新文章
  const handleCreate = async (newArticle: Partial<DailyArticle>) => {
    try {
      await fetchAPI('/daily-articles', {
        method: 'POST',
        body: JSON.stringify({
          ...newArticle,
          status: 'DRAFT',
          publishTime: new Date().toISOString(),
          images: newArticle.featuredImage ? [newArticle.featuredImage] : [],
          favoriteCount: 0
        })
      })
      setShowCreateModal(false)
      setCurrentPage(1)
      loadData()
    } catch (error) {
      console.error('Failed to create article:', error)
      alert('创建失败')
    }
  }

  // 页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 选择/取消选择项目
  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    const items = activeTab === 'articles' ? articles : drafts
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(item => item.id)))
    }
  }

  // 获取可用来源（动态从数据中提取 + 已知来源）
  const getAvailableSources = (): string[] => {
    const sources = new Set<string>()
    const allItems = activeTab === 'articles' ? articles : (activeTab === 'drafts' ? drafts : [])
    allItems.forEach((item: any) => {
      const src = item.source
      if (src && src.trim()) sources.add(src.trim())
    })
    // 始终包含已知来源
    ;['ArchDaily', 'ArchPosition', 'SEU', 'AP News', 'Reuters', 'AI生成'].forEach(s => sources.add(s))
    return Array.from(sources).sort()
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      POLITICS: '政治',
      TECHNOLOGY: '科技',
      ECONOMY: '经济',
      CULTURE: '文化',
      SPORTS: '体育',
      SCIENCE: '科学',
      ENVIRONMENT: '环境',
      WORLD: '国际',
      OTHER: '其他',
    }
    return labels[category] || category
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge className="bg-green-500">已发布</Badge>
      case 'DRAFT':
        return <Badge className="bg-yellow-500">草稿</Badge>
      case 'ARCHIVED':
        return <Badge className="bg-slate-500">已归档</Badge>
      default:
        return <Badge>未知</Badge>
    }
  }

  const handleUnpublish = async (id: string) => {
    try {
      await fetchAPI(`/daily-articles/${id}/unpublish`, { method: 'PUT' })
      loadData()
    } catch (error) {
      console.error('Failed to unpublish article:', error)
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await fetchAPI(`/daily-articles/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PUBLISHED' })
      })
      loadData()
    } catch (error) {
      console.error('Failed to publish article:', error)
    }
  }

  const items = activeTab === 'articles' ? articles : drafts
  const isRecycleBin = showRecycleBin && activeTab === 'articles'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-slate-900">文章管理</h2>
        <div className="flex gap-2">
          {activeTab === 'articles' && (
            <>
              {!showRecycleBin && (
                <Button
                  variant="outline"
                  onClick={() => setShowRecycleBin(true)}
                >
                  <Recycle className="w-4 h-4 mr-2" />
                  回收站
                </Button>
              )}
              {showRecycleBin && (
                <Button
                  variant="outline"
                  onClick={() => setShowRecycleBin(false)}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  返回列表
                </Button>
              )}
            </>
          )}
          <Button
            className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            新建文章
          </Button>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedItems.size > 0 && (
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-slate-700">已选择 {selectedItems.size} 项</span>
          <div className="flex gap-2">
            {isRecycleBin ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBatchRestore}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  恢复
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchPermanentlyDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  永久删除
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBatchWithdrawToDraft}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  撤回为草稿
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchDelete}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  移入回收站
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedItems(new Set())}
            >
              取消选择
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="articles" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="articles">{showRecycleBin ? '回收站' : '已发布文章'}</TabsTrigger>
          <TabsTrigger value="drafts">草稿管理</TabsTrigger>
          <TabsTrigger value="history">历史记录</TabsTrigger>
          <TabsTrigger value="selection">精选编排</TabsTrigger>
        </TabsList>

        <TabsContent value="articles">
          <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.size === items.length && items.length > 0 ? (
                  <CheckSquare className="w-4 h-4 mr-2" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                全选
              </Button>
              <label className="text-sm font-medium text-slate-700">来源筛选：</label>
              <select
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm"
              >
                <option value="all">全部来源</option>
                <option value="__none__">未设置来源</option>
                {getAvailableSources().map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">日期筛选：</label>
              <select
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm"
              >
                <option value="all">全部日期</option>
                {getAvailableDates().map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article) => (
              <Card key={article.id} className={`hover:shadow-lg transition-all cursor-pointer flex flex-col relative ${selectedItems.has(article.id) ? 'ring-2 ring-rose-500' : ''}`}>
                {/* 选择复选框 - 放在右上角 */}
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectItem(article.id)
                    }}
                    className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg hover:bg-white transition-colors shadow-sm"
                  >
                    {selectedItems.has(article.id) ? (
                      <CheckSquare className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* 图片区域 */}
                {article.images && article.images.length > 0 ? (
                  <div className="aspect-[16/9] overflow-hidden rounded-t-lg" onClick={() => handleEdit(article)}>
                    <ImageCarousel images={article.images} alt={article.title} />
                  </div>
                ) : article.featuredImage ? (
                  <div className="aspect-[16/9] overflow-hidden rounded-t-lg" onClick={() => handleEdit(article)}>
                    <img
                      src={getImageUrl(article.featuredImage)}
                      alt={article.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=800';
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 rounded-t-lg flex items-center justify-center">
                    <FileText className="w-12 h-12 text-slate-400" />
                  </div>
                )}

                <CardContent className="p-4 flex-1 flex flex-col">
                  {/* 标签 - 放在图片下方 */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getStatusBadge(article.status)}
                    <Badge variant="secondary" className="text-xs">{getCategoryLabel(article.category)}</Badge>
                  </div>

                  {/* 标题 */}
                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 hover:text-rose-600 transition-colors" onClick={() => handleEdit(article)}>
                    {article.title}
                  </h3>

                  {/* 摘要 */}
                  <p className="text-slate-600 text-sm line-clamp-2 mb-3 flex-1">
                    {cleanHtmlTags(article.summary || '')}
                  </p>

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" />
                        {(article.favoriteCount || 0).toLocaleString()}
                      </span>
                      {article.author && (
                        <span className="flex items-center gap-1">
                          <span>✍️</span>
                          {article.author}
                        </span>
                      )}
                    </div>

                    {/* 操作按钮 - 放在右下角 */}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(article); }} title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {isRecycleBin ? (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={(e) => { e.stopPropagation(); handleRestore(article.id); }} title="恢复">
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={(e) => { e.stopPropagation(); handlePermanentlyDelete(article.id); }} title="永久删除">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700" onClick={(e) => { e.stopPropagation(); handleUnpublish(article.id); }} title="撤回为草稿">
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-700" onClick={(e) => { e.stopPropagation(); handleDelete(article.id); }} title="移入回收站">
                            <Archive className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="min-w-[40px]"
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts">
          <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.size === items.length && items.length > 0 ? (
                  <CheckSquare className="w-4 h-4 mr-2" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                全选
              </Button>
              {selectedItems.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchDelete}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  移入回收站
                </Button>
              )}
              <label className="text-sm font-medium text-slate-700">来源筛选：</label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm"
              >
                <option value="all">全部来源</option>
                <option value="ArchDaily">ArchDaily</option>
                <option value="SEU">SEU</option>
                <option value="ArchPosition">ArchPosition</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">日期筛选：</label>
              <select
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm"
              >
                <option value="all">全部日期</option>
                {getAvailableDates().map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.map((draft) => (
              <Card key={draft.id} className={`hover:shadow-lg transition-all cursor-pointer flex flex-col relative ${selectedItems.has(draft.id) ? 'ring-2 ring-rose-500' : ''}`}>
                {/* 选择复选框 - 放在右上角 */}
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectItem(draft.id)
                    }}
                    className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg hover:bg-white transition-colors shadow-sm"
                  >
                    {selectedItems.has(draft.id) ? (
                      <CheckSquare className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* 图片区域 */}
                {draft.images && draft.images.length > 0 ? (
                  <div className="aspect-[16/9] overflow-hidden rounded-t-lg" onClick={() => handleEdit(draft)}>
                    <ImageCarousel images={draft.images} alt={draft.title} />
                  </div>
                ) : draft.featuredImage ? (
                  <div className="aspect-[16/9] overflow-hidden rounded-t-lg" onClick={() => handleEdit(draft)}>
                    <img
                      src={getImageUrl(draft.featuredImage)}
                      alt={draft.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=800';
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 rounded-t-lg flex items-center justify-center">
                    <FileText className="w-12 h-12 text-slate-400" />
                  </div>
                )}

                <CardContent className="p-4 flex-1 flex flex-col">
                  {/* 标签 - 放在图片下方 */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className="bg-yellow-500 text-xs">草稿</Badge>
                    <Badge variant="secondary" className="text-xs">{getCategoryLabel(draft.category)}</Badge>
                    {draft.source && <Badge variant="outline" className="text-xs">{draft.source}</Badge>}
                  </div>

                  {/* 标题 */}
                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 hover:text-rose-600 transition-colors" onClick={() => handleEdit(draft)}>
                    {draft.title}
                  </h3>

                  {/* 摘要 */}
                  <p className="text-slate-600 text-sm line-clamp-2 mb-3 flex-1">
                    {cleanHtmlTags(draft.summary || '')}
                  </p>

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t">
                    <div className="flex items-center gap-3">
                      {draft.author && (
                        <span className="flex items-center gap-1">
                          <span>✍️</span>
                          {draft.author}
                        </span>
                      )}
                      {draft.sourceUrl && (
                        <a
                          href={draft.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          原文
                        </a>
                      )}
                    </div>

                    {/* 操作按钮 - 放在右下角 */}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={(e) => { e.stopPropagation(); handlePublish(draft.id); }} title="发布">
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(draft); }} title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-700" onClick={(e) => { e.stopPropagation(); handleDelete(draft.id); }} title="移入回收站">
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="min-w-[40px]"
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="grid gap-4">
            {history.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row">
                  {item.images && item.images.length > 0 ? (
                    <div className="md:w-48 h-32 md:h-auto">
                      <ImageCarousel images={item.images} alt={item.title} />
                    </div>
                  ) : item.featuredImage ? (
                    <div className="md:w-48 h-32 md:h-auto">
                      <img
                        src={getImageUrl(item.featuredImage)}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=800';
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <CardHeader className="p-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-slate-500">已归档</Badge>
                          <Badge variant="secondary">{getCategoryLabel(item.category)}</Badge>
                          {item.source && <Badge variant="outline">{item.source}</Badge>}
                        </div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                      </CardHeader>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-0">
                      <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                        {cleanHtmlTags(item.summary || '')}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>📅 {new Date(item.archivedAt).toLocaleDateString()}</span>
                        {item.sourceUrl && (
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            原文链接
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ==================== 精选编排 ==================== */}
        <TabsContent value="selection">
          {loadingSelection ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 日期选择与操作栏 */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl border border-rose-100">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-rose-500" />
                  <label className="text-sm font-semibold text-slate-700">精选日期：</label>
                  <input
                    type="date"
                    value={selectionDate}
                    onChange={(e) => setSelectionDate(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-rose-500 text-sm px-3 py-1">
                    当前精选：{selectionArticles.length} 篇
                  </Badge>
                  {selectionArticles.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newDate = prompt('请输入新的发布日期 (YYYY-MM-DD):', selectionDate)
                        if (newDate) handleChangeSelectionDate(newDate)
                      }}
                    >
                      修改发布日期
                    </Button>
                  )}
                  {selectionArticles.length > 0 && admins.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`确认将所有精选文章的作者设为 ${admins[0].username}？`)) {
                          handleSetAdminAsAuthor(selectionArticles.map((a: any) => a.id))
                        }
                      }}
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      设管理员为作者
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                    onClick={() => setShowAddModal(true)}
                  >
                    <FolderPlus className="w-3.5 h-3.5 mr-1" />
                    添加文章到精选
                  </Button>
                </div>
              </div>

              {/* 当前精选文章列表 */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-rose-500" />
                  {selectionDate} 的每日精选
                </h3>

                {/* 精选编排批量操作栏 */}
                {selectionSelectedItems.size > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 flex items-center justify-between">
                    <span className="text-sm text-orange-700">已选择 {selectionSelectedItems.size} 篇</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBatchWithdrawFromSelection}
                        className="text-orange-600 border-orange-300 hover:bg-orange-100"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        批量撤回为草稿
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectionSelectedItems(new Set())}
                      >
                        取消选择
                      </Button>
                    </div>
                  </div>
                )}

                {selectionArticles.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">该日期暂无精选文章</p>
                    <p className="text-slate-400 text-sm mt-1">点击"添加文章到精选"开始编排</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectionSelectedItems.size === selectionArticles.length) {
                            setSelectionSelectedItems(new Set())
                          } else {
                            setSelectionSelectedItems(new Set(selectionArticles.map((a: any) => a.id)))
                          }
                        }}
                      >
                        {selectionSelectedItems.size === selectionArticles.length && selectionArticles.length > 0 ? (
                          <CheckSquare className="w-4 h-4 mr-2" />
                        ) : (
                          <Square className="w-4 h-4 mr-2" />
                        )}
                        全选
                      </Button>
                    </div>
                  <div className="space-y-2">
                    {selectionArticles.map((article: any, idx: number) => (
                      <div
                        key={article.id}
                        className={`flex items-center gap-3 p-3 bg-white rounded-xl border hover:shadow-sm transition-shadow group ${selectionSelectedItems.has(article.id) ? 'border-orange-300 ring-1 ring-orange-200' : 'border-slate-200'}`}
                      >
                        {/* 复选框 */}
                        <button
                          onClick={() => {
                            const next = new Set(selectionSelectedItems)
                            if (next.has(article.id)) {
                              next.delete(article.id)
                            } else {
                              next.add(article.id)
                            }
                            setSelectionSelectedItems(next)
                          }}
                          className="flex-shrink-0"
                        >
                          {selectionSelectedItems.has(article.id) ? (
                            <CheckSquare className="w-5 h-5 text-orange-500" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                        {/* 序号 - 前三名标记为首页展示 */}
                        <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          idx < 3
                            ? 'bg-gradient-to-br from-rose-400 to-orange-400 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-500'
                        }`} title={idx < 3 ? `排名 ${idx + 1}，将展示在首页每日精选` : `排名 ${idx + 1}`}>
                          {idx + 1}
                        </span>
                        {/* 缩略图 */}
                        <div className="flex-shrink-0 w-16 h-10 rounded overflow-hidden bg-slate-100">
                          {article.images?.[0] || article.featuredImage ? (
                            <img
                              src={getImageUrl(article.images?.[0] || article.featuredImage)}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=400';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                        </div>
                        {/* 标题和信息 */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-800 truncate">{article.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <Badge variant="secondary" className="text-xs">{getCategoryLabel(article.category)}</Badge>
                            {article.source && <span className="text-slate-400">{article.source}</span>}
                            {article.author && <span className="text-slate-400">作者: {article.author}</span>}
                          </div>
                        </div>
                        {/* 操作按钮 */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleMoveArticle(article.id, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:text-slate-300 disabled:hover:bg-transparent"
                            title="上移"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveArticle(article.id, 'down')}
                            disabled={idx === selectionArticles.length - 1}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:text-slate-300 disabled:hover:bg-transparent"
                            title="下移"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(article)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleWithdrawFromSelection(article.id)}
                            className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500"
                            title="撤回为草稿"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 添加文章到精选的弹窗 */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">添加文章到精选 ({selectionDate})</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {/* 搜索和筛选 */}
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={poolSearch}
                      onChange={(e) => setPoolSearch(e.target.value)}
                      placeholder="搜索文章标题..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                  <select
                    value={poolStatusFilter}
                    onChange={(e) => setPoolStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="all">全部状态</option>
                    <option value="PUBLISHED">已发布</option>
                    <option value="DRAFT">草稿</option>
                  </select>
                </div>

                {/* 文章列表 */}
                <div className="flex-1 overflow-y-auto p-4">
                  {poolArticles
                    .filter((a: any) => {
                      if (poolStatusFilter !== 'all' && a.status !== poolStatusFilter) return false
                      if (poolSearch) {
                        return a.title.toLowerCase().includes(poolSearch.toLowerCase())
                      }
                      return true
                    })
                    .slice(0, 50)
                    .map((article: any) => (
                      <div
                        key={article.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
                        onClick={() => {
                          handleAddToSelection([article.id])
                          setShowAddModal(false)
                        }}
                      >
                        <div className="flex-shrink-0 w-12 h-8 rounded overflow-hidden bg-slate-100">
                          {article.images?.[0] || article.featuredImage ? (
                            <img
                              src={getImageUrl(article.images?.[0] || article.featuredImage)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="w-3 h-3 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-slate-800 truncate">{article.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <Badge
                              variant="secondary"
                              className={`text-xs ${article.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}
                            >
                              {article.status === 'DRAFT' ? '草稿' : '已发布'}
                            </Badge>
                            {article.source && <span>{article.source}</span>}
                          </div>
                        </div>
                        <Send className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                      </div>
                    ))
                  }
                </div>

                <div className="px-6 py-3 border-t border-slate-100 text-sm text-slate-500">
                  共 {poolArticles.length} 篇可选文章 · 点击即可加入精选
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 编辑模态框 */}
      {showEditModal && editingArticle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-[80%] max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  setShowExitConfirm(true)
                } else {
                  setShowEditModal(false)
                  setEditingArticle(null)
                  setHasUnsavedChanges(false)
                }
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              title="关闭"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-semibold mb-4 pr-8">编辑文章</h3>
            <EditArticleForm
              article={editingArticle}
              admins={admins}
              onSave={handleSaveEdit}
              onChange={() => setHasUnsavedChanges(true)}
              onCancel={() => {
                if (hasUnsavedChanges) {
                  setShowExitConfirm(true)
                } else {
                  setShowEditModal(false)
                  setEditingArticle(null)
                  setHasUnsavedChanges(false)
                }
              }}
            />
          </div>
        </div>
      )}

      {/* 退出确认弹窗 */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-3">确认退出</h3>
            <p className="text-slate-600 mb-6">您有未保存的修改，确定要退出吗？</p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowExitConfirm(false)}
              >
                继续编辑
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowExitConfirm(false)
                  setShowEditModal(false)
                  setEditingArticle(null)
                  setHasUnsavedChanges(false)
                }}
              >
                放弃修改
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 新建模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-[80%] max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              title="关闭"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-semibold mb-4 pr-8">新建文章</h3>
            <CreateArticleForm
              admins={admins}
              onSave={handleCreate}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// 编辑文章表单组件
function EditArticleForm({ article, admins, onSave, onChange, onCancel }: {
  article: DailyArticle | ArticleDraft
  admins: any[]
  onSave: (article: Partial<DailyArticle | ArticleDraft>) => void
  onChange?: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(article.title)
  const [content, setContent] = useState(article.content)
  const [summary, setSummary] = useState(article.summary || '')
  const [category, setCategory] = useState(article.category)
  const [author, setAuthor] = useState(article.author || '')
  const [photographer, setPhotographer] = useState(article.photographer || '')
  const [source, setSource] = useState(article.source || '')
  const [sourceUrl, setSourceUrl] = useState(article.sourceUrl || '')
  const [featuredImage, setFeaturedImage] = useState(article.featuredImage || '')
  const [images, setImages] = useState<string[]>(
    Array.isArray((article as any).images) ? (article as any).images : []
  )
  const [useAdminAuthor, setUseAdminAuthor] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverMessage, setCoverMessage] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imagesMessage, setImagesMessage] = useState('')

  // 监听所有字段变化
  useEffect(() => {
    if (onChange) onChange()
  }, [title, content, summary, category, author, photographer, source, sourceUrl, featuredImage, images, onChange])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingFile(true)
    setUploadMessage('')

    try {
      // 使用新的文件提取函数（支持文件夹）
      const { extractFilesFromFileList } = await import('../../utils/fileParser')
      const { mdFile, imageFiles } = extractFilesFromFileList(files)

      if (!mdFile) {
        setUploadMessage('未找到Markdown文件（.md），请确保文件夹中包含.md文件')
        setUploadingFile(false)
        return
      }

      console.log('找到Markdown文件:', mdFile.name)
      console.log('检测到图片文件:', Array.from(imageFiles.keys()))

      const { parseMarkdownFile } = await import('../../utils/fileParser')

      const parsedContent = await parseMarkdownFile(
        mdFile,
        imageFiles,
        (progressMsg) => {
          setUploadMessage(progressMsg)
        }
      )

      // 插入到现有内容之后
      const newContent = content ? content + '\n\n' + parsedContent : parsedContent
      setContent(newContent)
      setUploadMessage('Markdown文件解析成功，图片已自动上传！')
      console.log('内容已更新')
    } catch (error) {
      console.error('文件上传失败:', error)
      setUploadMessage('文件上传失败: ' + (error as Error).message)
    } finally {
      setUploadingFile(false)
    }
    e.target.value = ''
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    setCoverMessage('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('source', '每日精选封面上传')
      const res = await fetch('/api/image-library', { method: 'POST', body: formData })
      const data: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `上传失败（${res.status}）`)
      }
      if (data?.localPath) {
        setFeaturedImage(data.localPath)
        setCoverMessage('封面上传成功')
        setImages((prev) => {
          if (prev.includes(data.localPath)) return prev
          return [data.localPath, ...prev]
        })
      } else {
        throw new Error('上传成功但未返回图片路径')
      }
    } catch (err) {
      setCoverMessage((err as Error).message)
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImages(true)
    setImagesMessage('')
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('image', file)
        formData.append('source', '每日精选图片上传')
        const res = await fetch('/api/image-library', { method: 'POST', body: formData })
        const data: any = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `上传失败（${res.status}）`)
        if (!data?.localPath) throw new Error('上传成功但未返回图片路径')
        uploaded.push(data.localPath)
      }
      setImages((prev) => {
        const next = [...prev]
        uploaded.forEach((p) => {
          if (!next.includes(p)) next.push(p)
        })
        return next
      })
      if (!featuredImage && uploaded[0]) {
        setFeaturedImage(uploaded[0])
      }
      setImagesMessage(`已上传 ${uploaded.length} 张图片`)
    } catch (err) {
      setImagesMessage((err as Error).message)
    } finally {
      setUploadingImages(false)
      e.target.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalAuthor = useAdminAuthor && admins.length > 0 ? admins[0].username : author
    onSave({
      title,
      content,
      summary,
      category,
      author: finalAuthor,
      photographer,
      source,
      sourceUrl,
      featuredImage,
      images
    })
  }

  const handleInputChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setter(e.target.value)
    if (onChange) onChange()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">标题</label>
        <input
          type="text"
          value={title}
          onChange={handleInputChange(setTitle)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">分类</label>
        <select
          value={category}
          onChange={handleInputChange(setCategory)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          required
        >
          <option value="POLITICS">政治</option>
          <option value="TECHNOLOGY">科技</option>
          <option value="ECONOMY">经济</option>
          <option value="CULTURE">文化</option>
          <option value="SPORTS">体育</option>
          <option value="SCIENCE">科学</option>
          <option value="ENVIRONMENT">环境</option>
          <option value="WORLD">国际</option>
          <option value="OTHER">其他</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">摘要</label>
        <textarea
          value={summary}
          onChange={handleInputChange(setSummary)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          rows={6}
        />
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="text-sm font-semibold text-slate-900">图片</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">上传封面（单张）</div>
              <label className={`block w-full px-4 py-3 rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer ${uploadingCover ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="text-sm text-slate-700">选择图片上传并自动生成地址</div>
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
              {coverMessage && (
                <div className={`text-sm ${coverMessage.includes('成功') ? 'text-green-600' : 'text-rose-600'}`}>
                  {coverMessage}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">上传图片集（多张）</div>
              <label className={`block w-full px-4 py-3 rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer ${uploadingImages ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="text-sm text-slate-700">选择多张图片上传并自动生成地址</div>
                <input type="file" accept="image/*" multiple onChange={handleImagesUpload} className="hidden" />
              </label>
              {imagesMessage && (
                <div className={`text-sm ${imagesMessage.includes('上传') || imagesMessage.includes('已') ? 'text-green-600' : 'text-rose-600'}`}>
                  {imagesMessage}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            {featuredImage ? (
              <img src={getImageUrl(featuredImage)} alt="封面预览" className="w-full h-[200px] object-cover" />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">暂无封面</div>
            )}
          </div>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((src) => (
              <div key={src} className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setFeaturedImage(src)}
                  className="absolute left-2 top-2 text-xs font-semibold px-2 py-1 rounded-full bg-black/55 text-white hover:bg-black/70 transition-colors"
                >
                  设为封面
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImages((prev) => prev.filter((p) => p !== src))
                    if (featuredImage === src) {
                      setFeaturedImage((prev) => {
                        const next = images.filter((p) => p !== src)[0] || ''
                        return next
                      })
                    }
                  }}
                  className="absolute right-2 top-2 w-8 h-8 rounded-full bg-black/55 text-white hover:bg-black/70 transition-colors flex items-center justify-center"
                  aria-label="移除图片"
                >
                  <X className="w-4 h-4" />
                </button>
                <img src={getImageUrl(src)} alt="图片" className="w-full h-[120px] object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 文件上传 */}
      <div>
        <label className="block text-sm font-medium mb-1">导入内容</label>
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
                disabled={uploadingFile}
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
                disabled={uploadingFile}
              />
            </div>
          </label>
        </div>
        {uploadingFile && <p className="text-sm text-blue-600 mt-2">处理中...</p>}
        {uploadMessage && <p className="text-sm text-green-600 mt-2">{uploadMessage}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">内容</label>
        <textarea
          value={content}
          onChange={handleInputChange(setContent)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          rows={15}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">作者</label>
          <div className="space-y-2">
            <input
              type="text"
              value={author}
              onChange={handleInputChange(setAuthor)}
              placeholder="自定义作者名称"
              disabled={useAdminAuthor}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
            />
            {admins.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useAdminAuthor"
                  checked={useAdminAuthor}
                  onChange={(e) => {
                    setUseAdminAuthor(e.target.checked)
                    if (e.target.checked && admins.length > 0) {
                      setAuthor(admins[0].username)
                    }
                    if (onChange) onChange()
                  }}
                  className="rounded border-slate-300"
                />
                <label htmlFor="useAdminAuthor" className="text-sm text-slate-600">
                  使用当前管理员 ({admins[0].username})
                </label>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">摄影师</label>
          <input
            type="text"
            value={photographer}
            onChange={handleInputChange(setPhotographer)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">来源</label>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">原文链接</label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600">
          保存
        </Button>
      </div>
    </form>
  )
}

// 新建文章表单组件
function CreateArticleForm({ admins, onSave, onCancel }: {
  admins: any[]
  onSave: (article: Partial<DailyArticle>) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [summary, setSummary] = useState('')
  const [category, setCategory] = useState<Category>('OTHER')
  const [author, setAuthor] = useState('')
  const [photographer, setPhotographer] = useState('')
  const [source, setSource] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [useAdminAuthor, setUseAdminAuthor] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverMessage, setCoverMessage] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imagesMessage, setImagesMessage] = useState('')

  // 如果有管理员，默认使用管理员名称
  useEffect(() => {
    if (admins.length > 0 && !author) {
      setUseAdminAuthor(true)
      setAuthor(admins[0].username)
    }
  }, [admins, author])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingFile(true)
    setUploadMessage('')

    try {
      // 使用新的文件提取函数（支持文件夹）
      const { extractFilesFromFileList } = await import('../../utils/fileParser')
      const { mdFile, imageFiles } = extractFilesFromFileList(files)

      if (!mdFile) {
        setUploadMessage('未找到Markdown文件（.md），请确保文件夹中包含.md文件')
        setUploadingFile(false)
        return
      }

      console.log('找到Markdown文件:', mdFile.name)
      console.log('检测到图片文件:', Array.from(imageFiles.keys()))

      const { parseMarkdownFile } = await import('../../utils/fileParser')

      const parsedContent = await parseMarkdownFile(
        mdFile,
        imageFiles,
        (progressMsg) => {
          setUploadMessage(progressMsg)
        }
      )

      setContent(parsedContent)
      setUploadMessage('Markdown文件解析成功，图片已自动上传！')
      console.log('内容已更新')
    } catch (error) {
      console.error('文件上传失败:', error)
      setUploadMessage('文件上传失败: ' + (error as Error).message)
    } finally {
      setUploadingFile(false)
    }
    e.target.value = ''
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    setCoverMessage('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('source', '每日精选封面上传')
      const res = await fetch('/api/image-library', { method: 'POST', body: formData })
      const data: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `上传失败（${res.status}）`)
      }
      if (data?.localPath) {
        setFeaturedImage(data.localPath)
        setCoverMessage('封面上传成功')
        setImages((prev) => {
          if (prev.includes(data.localPath)) return prev
          return [data.localPath, ...prev]
        })
      } else {
        throw new Error('上传成功但未返回图片路径')
      }
    } catch (err) {
      setCoverMessage((err as Error).message)
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImages(true)
    setImagesMessage('')
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('image', file)
        formData.append('source', '每日精选图片上传')
        const res = await fetch('/api/image-library', { method: 'POST', body: formData })
        const data: any = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `上传失败（${res.status}）`)
        if (!data?.localPath) throw new Error('上传成功但未返回图片路径')
        uploaded.push(data.localPath)
      }
      setImages((prev) => {
        const next = [...prev]
        uploaded.forEach((p) => {
          if (!next.includes(p)) next.push(p)
        })
        return next
      })
      if (!featuredImage && uploaded[0]) setFeaturedImage(uploaded[0])
      setImagesMessage(`已上传 ${uploaded.length} 张图片`)
    } catch (err) {
      setImagesMessage((err as Error).message)
    } finally {
      setUploadingImages(false)
      e.target.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalAuthor = useAdminAuthor && admins.length > 0 ? admins[0].username : author
    onSave({
      title,
      content,
      summary,
      category,
      author: finalAuthor,
      photographer,
      source,
      sourceUrl,
      featuredImage,
      images
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">标题 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">分类</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        >
          <option value="POLITICS">政治</option>
          <option value="TECHNOLOGY">科技</option>
          <option value="ECONOMY">经济</option>
          <option value="CULTURE">文化</option>
          <option value="SPORTS">体育</option>
          <option value="SCIENCE">科学</option>
          <option value="ENVIRONMENT">环境</option>
          <option value="WORLD">国际</option>
          <option value="OTHER">其他</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">摘要</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          rows={6}
        />
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="text-sm font-semibold text-slate-900">图片</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">上传封面（单张）</div>
              <label className={`block w-full px-4 py-3 rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer ${uploadingCover ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="text-sm text-slate-700">选择图片上传并自动生成地址</div>
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
              {coverMessage && (
                <div className={`text-sm ${coverMessage.includes('成功') ? 'text-green-600' : 'text-rose-600'}`}>
                  {coverMessage}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">上传图片集（多张）</div>
              <label className={`block w-full px-4 py-3 rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer ${uploadingImages ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="text-sm text-slate-700">选择多张图片上传并自动生成地址</div>
                <input type="file" accept="image/*" multiple onChange={handleImagesUpload} className="hidden" />
              </label>
              {imagesMessage && (
                <div className={`text-sm ${imagesMessage.includes('上传') || imagesMessage.includes('已') ? 'text-green-600' : 'text-rose-600'}`}>
                  {imagesMessage}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            {featuredImage ? (
              <img src={getImageUrl(featuredImage)} alt="封面预览" className="w-full h-[200px] object-cover" />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">暂无封面</div>
            )}
          </div>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((src) => (
              <div key={src} className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setFeaturedImage(src)}
                  className="absolute left-2 top-2 text-xs font-semibold px-2 py-1 rounded-full bg-black/55 text-white hover:bg-black/70 transition-colors"
                >
                  设为封面
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImages((prev) => prev.filter((p) => p !== src))
                    if (featuredImage === src) {
                      setFeaturedImage(() => {
                        const next = images.filter((p) => p !== src)[0] || ''
                        return next
                      })
                    }
                  }}
                  className="absolute right-2 top-2 w-8 h-8 rounded-full bg-black/55 text-white hover:bg-black/70 transition-colors flex items-center justify-center"
                  aria-label="移除图片"
                >
                  <X className="w-4 h-4" />
                </button>
                <img src={getImageUrl(src)} alt="图片" className="w-full h-[120px] object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 文件上传 */}
      <div>
        <label className="block text-sm font-medium mb-1">导入内容</label>
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
                disabled={uploadingFile}
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
                disabled={uploadingFile}
              />
            </div>
          </label>
        </div>
        {uploadingFile && <p className="text-sm text-blue-600 mt-2">处理中...</p>}
        {uploadMessage && <p className="text-sm text-green-600 mt-2">{uploadMessage}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">内容 *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          rows={15}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">作者</label>
          <div className="space-y-2">
            <input
              type="text"
              value={author}
              onChange={(e) => {
                setAuthor(e.target.value)
                setUseAdminAuthor(false)
              }}
              placeholder="自定义作者名称"
              disabled={useAdminAuthor}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
            />
            {admins.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useAdminAuthorCreate"
                  checked={useAdminAuthor}
                  onChange={(e) => {
                    setUseAdminAuthor(e.target.checked)
                    if (e.target.checked && admins.length > 0) {
                      setAuthor(admins[0].username)
                    }
                  }}
                  className="rounded border-slate-300"
                />
                <label htmlFor="useAdminAuthorCreate" className="text-sm text-slate-600">
                  使用当前管理员 ({admins[0].username})
                </label>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">摄影师</label>
          <input
            type="text"
            value={photographer}
            onChange={(e) => setPhotographer(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">来源</label>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">原文链接</label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600">
          创建
        </Button>
      </div>
    </form>
  )
}

export default DailyArticlesAdmin
