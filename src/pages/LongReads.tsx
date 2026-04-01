import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Star, ArrowRight } from 'lucide-react'
import { LongRead as LongReadType, Category, ArticleStatus } from '../types'
import { api } from '../lib/api'
import { Skeleton } from '../components/ui/skeleton'

const LongReads = () => {
  const navigate = useNavigate()
  const [reads, setReads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadReads()
    loadFavorites()
  }, [])

  const loadReads = async () => {
    try {
      const response: any = await api.longReads.getAll({ status: 'PUBLISHED' })
      setReads(response.data || [])
    } catch (error) {
      console.error('Failed to load reads:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFavorites = async () => {
    const token = localStorage.getItem('user_token')
    if (!token) return
    try {
      const res: any = await api.longReads.getFavorites()
      const ids = (res.data || []).map((f: any) => f.id)
      setFavoritedIds(new Set(ids))
    } catch (error) {
      console.error('Failed to load favorites:', error)
    }
  }

  const handleFavorite = async (readId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const token = localStorage.getItem('user_token')
    if (!token) { alert('请先登录后再收藏'); navigate('/login'); return }

    try {
      if (favoritedIds.has(readId)) {
        await api.longReads.unfavorite(readId)
        setFavoritedIds(prev => { const n = new Set(prev); n.delete(readId); return n })
        setReads(prev => prev.map(r => r.id === readId ? { ...r, displayFavoriteCount: r.displayFavoriteCount - 1 } : r))
      } else {
        await api.longReads.favorite(readId)
        setFavoritedIds(prev => new Set(prev).add(readId))
        setReads(prev => prev.map(r => r.id === readId ? { ...r, displayFavoriteCount: r.displayFavoriteCount + 1 } : r))
      }
    } catch (error) {
      console.error('Favorite failed:', error)
    }
  }

  // 加载状态
  if (loading) {
    return (
      <div className="py-12">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-3xl overflow-hidden">
              <Skeleton className="aspect-[3/2] w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="py-12">
      {/* 标题区域 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
          <BookOpen className="w-5 h-5 text-accent" />
        </div>
        <div>
          <span className="text-sm font-medium text-accent tracking-wider uppercase">In-Depth</span>
          <h2 className="text-3xl lg:text-4xl font-serif font-semibold text-foreground">深度解读</h2>
        </div>
      </div>

      {/* 文章列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reads.map((read) => (
          <article
            key={read.id}
            className="group bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => navigate(`/long-reads/${read.slug}`)}
          >
            {/* 图片 */}
            {read.coverImage && (
              <div className="relative aspect-[3/2] overflow-hidden">
                <img
                  src={read.coverImage}
                  alt={read.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
              </div>
            )}

            {/* 内容 */}
            <div className="p-6">
              <h3 className="text-xl font-serif font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 mb-3">
                {read.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-4">
                {read.content.substring(0, 200).replace(/<[^>]*>/g, '')}...
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{read.author || '编辑'}</span>
                  <button
                    onClick={(e) => handleFavorite(read.id, e)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      favoritedIds.has(read.id)
                        ? 'bg-rose-500 text-white hover:bg-rose-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Star className={`w-3 h-3 ${favoritedIds.has(read.id) ? 'fill-white' : ''}`} />
                    {(read.displayFavoriteCount || 0).toLocaleString()}
                  </button>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  阅读全文
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* 空状态 */}
      {!loading && reads.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">暂无深度解读文章</p>
        </div>
      )}
    </div>
  )
}

export default LongReads
