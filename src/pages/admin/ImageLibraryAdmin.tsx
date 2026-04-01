import { useEffect, useState } from 'react'
import { ImageLibrary } from '../../types'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Plus, Trash2, Star, Upload, Search, Edit, RotateCcw, Recycle, CheckSquare, Square } from 'lucide-react'
import { fetchAPI } from '../../lib/api'

const ImageLibraryAdmin = () => {
  const [images, setImages] = useState<ImageLibrary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [activeSource, setActiveSource] = useState('all')
  const [activeDate, setActiveDate] = useState('all')
  const [showRecycleBin, setShowRecycleBin] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingImage, setEditingImage] = useState<ImageLibrary | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    loadImages()
    setSelectedItems(new Set())
  }, [activeSource, activeDate, showFavorites, currentPage, showRecycleBin])

  const loadImages = async () => {
    try {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE
      const isDeleted = showRecycleBin ? '&showDeleted=true' : ''
      const response = await fetchAPI<{ data: any[], total: number }>(
        `/image-library?limit=${ITEMS_PER_PAGE}&offset=${offset}${showFavorites ? '&favorite=true' : ''}${isDeleted}`
      )
      const apiImages = response.data || []
      setImages(apiImages)
      setTotalPages(Math.ceil(response.total / ITEMS_PER_PAGE))
    } catch (error) {
      console.error('Failed to load images:', error)
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (id: string) => {
    try {
      const image = images.find(img => img.id === id)
      if (image) {
        await fetchAPI(`/image-library/${id}/favorite`, {
          method: 'PATCH'
        })
        setImages(images.map(img =>
          img.id === id ? { ...img, isFavorite: !img.isFavorite } : img
        ))
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const deleteImage = async (id: string) => {
    if (!confirm('确定要将这张图片移入回收站吗？')) return

    try {
      await fetchAPI(`/image-library/${id}`, { method: 'DELETE' })
      setImages(images.filter(img => img.id !== id))
    } catch (error) {
      console.error('Failed to delete image:', error)
      alert('删除失败')
    }
  }

  const restoreImage = async (id: string) => {
    try {
      await fetchAPI(`/image-library/${id}/restore`, { method: 'POST' })
      setImages(images.filter(img => img.id !== id))
    } catch (error) {
      console.error('Failed to restore image:', error)
      alert('恢复失败')
    }
  }

  const permanentlyDeleteImage = async (id: string) => {
    if (!confirm('确定要永久删除这张图片吗？此操作无法撤销！')) return

    try {
      await fetchAPI(`/image-library/${id}/permanent`, { method: 'DELETE' })
      setImages(images.filter(img => img.id !== id))
    } catch (error) {
      console.error('Failed to permanently delete image:', error)
      alert('永久删除失败')
    }
  }

  const recycleBin = () => {
    setShowRecycleBin(!showRecycleBin)
  }

  // 编辑图片
  const handleEdit = (image: ImageLibrary) => {
    setEditingImage(image)
    setShowEditModal(true)
  }

  // 保存编辑
  const handleSaveEdit = async (updatedImage: Partial<ImageLibrary>) => {
    if (!editingImage) return

    try {
      await fetchAPI(`/image-library/${editingImage.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedImage)
      })
      setShowEditModal(false)
      setEditingImage(null)
      loadImages()
    } catch (error) {
      console.error('Failed to save image:', error)
      alert('保存失败')
    }
  }

  // 批量删除（软删除）
  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`确定要将选中的 ${selectedItems.size} 张图片移入回收站吗？`)) return

    try {
      for (const id of selectedItems) {
        await fetchAPI(`/image-library/${id}`, { method: 'DELETE' })
      }
      setSelectedItems(new Set())
      setCurrentPage(1)
      loadImages()
    } catch (error) {
      console.error('Failed to batch delete images:', error)
      alert('批量删除失败')
    }
  }

  // 批量恢复
  const handleBatchRestore = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`确定要恢复选中的 ${selectedItems.size} 张图片吗？`)) return

    try {
      for (const id of selectedItems) {
        await fetchAPI(`/image-library/${id}/restore`, { method: 'POST' })
      }
      setSelectedItems(new Set())
      loadImages()
    } catch (error) {
      console.error('Failed to batch restore images:', error)
      alert('批量恢复失败')
    }
  }

  // 批量永久删除
  const handleBatchPermanentlyDelete = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`确定要永久删除选中的 ${selectedItems.size} 张图片吗？此操作无法撤销！`)) return

    try {
      for (const id of selectedItems) {
        await fetchAPI(`/image-library/${id}/permanent`, { method: 'DELETE' })
      }
      setSelectedItems(new Set())
      loadImages()
    } catch (error) {
      console.error('Failed to batch permanently delete images:', error)
      alert('批量永久删除失败')
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
    if (selectedItems.size === images.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(images.map(item => item.id)))
    }
  }

  // 按来源分组
  const imagesBySource = images.reduce((acc, image) => {
    const source = (image.source && typeof image.source === 'string' && image.source.trim()) ? image.source : '未知来源'
    if (!acc[source]) {
      acc[source] = []
    }
    acc[source].push(image)
    return acc
  }, {} as Record<string, ImageLibrary[]>)

  // 按日期分组
  const imagesByDate = images.reduce((acc, image) => {
    let date = '未知日期'
    if (image.createdAt && typeof image.createdAt === 'string') {
      const d = new Date(image.createdAt)
      if (!isNaN(d.getTime())) {
        date = d.toISOString().split('T')[0]
      }
    }
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(image)
    return acc
  }, {} as Record<string, ImageLibrary[]>)

  // 获取所有来源
  const sources = Object.keys(imagesBySource)

  const dates = Object.keys(imagesByDate)

  const currentItems = images

  const filteredImages = currentItems.filter((img) => {
    const matchesSearch = searchTerm === '' ||
      img.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesFavorite = !showFavorites || img.isFavorite
    const matchesSource = activeSource === 'all' || img.source === activeSource

    const imageDate = img.createdAt ? new Date(img.createdAt).toISOString().split('T')[0] : ''
    const matchesDate = activeDate === 'all' || imageDate === activeDate

    return matchesSearch && matchesFavorite && matchesSource && matchesDate
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    )
  }

  if (showRecycleBin) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-slate-900">回收站</h2>
          <Button onClick={() => recycleBin()}>
            <RotateCcw className="w-4 h-4 mr-2" />
            返回图片库
          </Button>
        </div>

        {/* 批量操作栏 */}
        {selectedItems.size > 0 && (
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-slate-700">已选择 {selectedItems.size} 项</span>
            <div className="flex gap-2">
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

        {filteredImages.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Recycle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p>回收站为空</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.size === filteredImages.length && filteredImages.length > 0 ? (
                  <CheckSquare className="w-4 h-4 mr-2" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                全选
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredImages.map((image) => (
                <Card key={image.id} className={`overflow-hidden group hover:shadow-lg transition-all ${selectedItems.has(image.id) ? 'ring-2 ring-rose-500' : ''}`}>
                  <div className="relative aspect-square">
                    <img
                      src={image.localPath.startsWith('http://') || image.localPath.startsWith('https://') ? image.localPath : image.localPath}
                      alt={image.caption || '图片'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => restoreImage(image.id)}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        恢复
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => permanentlyDeleteImage(image.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => handleSelectItem(image.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        {selectedItems.has(image.id) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      {image.caption && (
                        <p className="text-sm font-medium text-slate-900 line-clamp-2 flex-1">
                          {image.caption}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-semibold text-slate-900">图片库管理</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRecycleBin(true)}
          >
            <Recycle className="w-4 h-4 mr-2" />
            回收站
          </Button>
          <Button
            className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 to-orange-600"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            上传图片
          </Button>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedItems.size > 0 && (
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-slate-700">已选择 {selectedItems.size} 项</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBatchDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              移入回收站
            </Button>
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

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索图片..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFavorites ? "default" : "secondary"}
            onClick={() => setShowFavorites(!showFavorites)}
            className={showFavorites ? "bg-yellow-500 hover:bg-yellow-600" : ""}
          >
            <Star className="w-4 h-4 mr-2" />
            仅显示收藏
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeSource} onValueChange={(value) => { setActiveSource(value); setCurrentPage(1) }} className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          <TabsTrigger value="all">全部</TabsTrigger>
          {sources.map((source) => (
            <TabsTrigger key={source} value={source} className="text-sm">
              {source}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Tabs defaultValue="all" value={activeDate} onValueChange={(value) => { setActiveDate(value); setCurrentPage(1) }} className="w-full mt-4">
        <TabsList className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          <TabsTrigger value="all">全部日期</TabsTrigger>
          {dates.map((date) => (
            <TabsTrigger key={date} value={date} className="text-sm">
              {date}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
        >
          {selectedItems.size === filteredImages.length && filteredImages.length > 0 ? (
            <CheckSquare className="w-4 h-4 mr-2" />
          ) : (
            <Square className="w-4 h-4 mr-2" />
          )}
          全选
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredImages.map((image) => (
          <Card key={image.id} className={`overflow-hidden group hover:shadow-lg transition-all ${selectedItems.has(image.id) ? 'ring-2 ring-rose-500' : ''}`}>
            <div className="relative aspect-square">
              <img
                src={image.localPath.startsWith('http://') || image.localPath.startsWith('https://') ? image.localPath : image.localPath}
                alt={image.caption || '图片'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=800';
                }}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleEdit(image)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={image.isFavorite ? "default" : "secondary"}
                  onClick={() => toggleFavorite(image.id)}
                  className={image.isFavorite ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                >
                  <Star className={`w-4 h-4 ${image.isFavorite ? "fill-current" : ""}`} />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteImage(image.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="absolute top-2 right-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-full p-1 ${image.isFavorite ? 'text-yellow-500' : 'text-white'}`}
                  onClick={() => toggleFavorite(image.id)}
                >
                  <Star className={`w-5 h-5 ${image.isFavorite ? 'fill-yellow-500' : ''}`} />
                </Button>
              </div>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => handleSelectItem(image.id)}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                  {selectedItems.has(image.id) ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
                {image.caption && (
                  <p className="text-sm font-medium text-slate-900 line-clamp-2 flex-1">
                    {image.caption}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {image.tags.slice(0, 3).map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              {image.source && (
                <p className="text-xs text-slate-500">来源: {image.source}</p>
              )}
              {image.photographer && (
                <p className="text-xs text-slate-500">📷 {image.photographer}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredImages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">没有找到匹配的图片</p>
        </div>
      )}

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

      {/* 上传模态框 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">上传图片</h3>
            <UploadImageForm
              onSave={() => {
                setShowUploadModal(false)
                setCurrentPage(1)
                loadImages()
              }}
              onCancel={() => setShowUploadModal(false)}
            />
          </div>
        </div>
      )}

      {/* 编辑模态框 */}
      {showEditModal && editingImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">编辑图片</h3>
            <EditImageForm
              image={editingImage}
              onSave={handleSaveEdit}
              onCancel={() => {
                setShowEditModal(false)
                setEditingImage(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// 上传图片表单组件
function UploadImageForm({ onSave, onCancel }: {
  onSave: () => void
  onCancel: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [photographer, setPhotographer] = useState('')
  const [source, setSource] = useState('')
  const [tags, setTags] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      alert('请选择图片文件')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('caption', caption)
      formData.append('photographer', photographer)
      formData.append('source', source)
      formData.append('tags', JSON.stringify(tags.split(',').map(t => t.trim()).filter(t => t)))

      const response = await fetch('/api/image-library', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        onSave()
      } else {
        throw new Error('上传失败')
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">图片文件 *</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">说明</label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
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
        <label className="block text-sm font-medium mb-1">标签 (用逗号分隔)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          placeholder="例如: 建筑, 现代, 水泥"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
          取消
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600"
          disabled={uploading}
        >
          {uploading ? '上传中...' : '上传'}
        </Button>
      </div>
    </form>
  )
}

// 编辑图片表单组件
function EditImageForm({ image, onSave, onCancel }: {
  image: ImageLibrary
  onSave: (image: Partial<ImageLibrary>) => void
  onCancel: () => void
}) {
  const [caption, setCaption] = useState(image.caption || '')
  const [photographer, setPhotographer] = useState(image.photographer || '')
  const [source, setSource] = useState(image.source || '')
  const [tags, setTags] = useState(image.tags.join(', '))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      caption,
      photographer,
      source,
      tags: tags.split(',').map(t => t.trim()).filter(t => t)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">说明</label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
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
        <label className="block text-sm font-medium mb-1">标签 (用逗号分隔)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          placeholder="例如: 建筑, 现代, 水泥"
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

export default ImageLibraryAdmin
