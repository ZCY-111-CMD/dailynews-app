import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, ArrowRight, Star } from 'lucide-react'
import { SpecialTopic as SpecialTopicType, ArticleStatus } from '../types'
import { api } from '../lib/api'
import { Skeleton } from '../components/ui/skeleton'

const SpecialTopics = () => {
  const navigate = useNavigate()
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTopics()
    loadFavorites()
  }, [])

  const loadTopics = async () => {
    try {
      const response: any = await api.specialTopics.getAll({ status: 'PUBLISHED' })
      setTopics(response.data || [])
    } catch (error) {
      console.error('Failed to load topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFavorites = async () => {
    const token = localStorage.getItem('user_token')
    if (!token) return
    try {
      const res: any = await api.specialTopics.getFavorites()
      const ids = (res.data || []).map((f: any) => f.id)
      setFavoritedIds(new Set(ids))
    } catch (error) {
      console.error('Failed to load favorites:', error)
    }
  }

  const handleFavorite = async (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const token = localStorage.getItem('user_token')
    if (!token) { alert('请先登录后再收藏'); navigate('/login'); return }

    try {
      if (favoritedIds.has(topicId)) {
        await api.specialTopics.unfavorite(topicId)
        setFavoritedIds(prev => { const n = new Set(prev); n.delete(topicId); return n })
        setTopics(prev => prev.map(t => t.id === topicId ? { ...t, displayFavoriteCount: t.displayFavoriteCount - 1 } : t))
      } else {
        await api.specialTopics.favorite(topicId)
        setFavoritedIds(prev => new Set(prev).add(topicId))
        setTopics(prev => prev.map(t => t.id === topicId ? { ...t, displayFavoriteCount: t.displayFavoriteCount + 1 } : t))
      }
    } catch (error) {
      console.error('Favorite failed:', error)
    }
  }

  // 加载状态
  if (loading) {
    return (
      <div className="py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-40" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 hidden lg:block" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-3xl overflow-hidden">
              <Skeleton className="aspect-[3/2] w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
            <Layers className="w-5 h-5 text-accent" />
          </div>
          <div>
            <span className="text-sm font-medium text-accent tracking-wider uppercase">Special Topics</span>
            <h2 className="text-3xl lg:text-4xl font-serif font-semibold text-foreground">专题栏目</h2>
          </div>
        </div>
        <button
          onClick={() => console.log('查看全部专题')}
          className="hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
        >
          全部专题
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 专题列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map((topic) => (
          <article
            key={topic.id}
            className="group bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => navigate(`/special-topics/${topic.slug}`)}
          >
            {/* 图片 */}
            {topic.coverImage && (
              <div className="relative aspect-[3/2] overflow-hidden">
                <img
                  src={topic.coverImage}
                  alt={topic.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h3 className="text-2xl font-serif font-bold text-card mb-2">
                    {topic.title}
                  </h3>
                </div>
              </div>
            )}

            {/* 描述 */}
            <div className="p-6">
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
                {topic.description}
              </p>
              <div className="flex items-center justify-between">
                <button
                  onClick={(e) => handleFavorite(topic.id, e)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    favoritedIds.has(topic.id)
                      ? 'bg-rose-500 text-white hover:bg-rose-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${favoritedIds.has(topic.id) ? 'fill-white' : ''}`} />
                  {((topic.displayFavoriteCount || 0)).toLocaleString()}
                </button>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-accent group-hover:gap-3 transition-all">
                进入专题
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
            </div>
          </article>
        ))}
      </div>

      {/* 移动端查看更多 */}
      <button
        onClick={() => console.log('查看全部专题')}
        className="lg:hidden flex items-center justify-center gap-2 mt-6 py-3 text-sm font-medium text-muted-foreground hover:text-accent transition-colors w-full"
      >
        查看全部专题
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* 空状态 */}
      {!loading && topics.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">暂无专题报道</p>
        </div>
      )}
    </div>
  )
}

export default SpecialTopics
