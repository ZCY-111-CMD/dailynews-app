import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, Star, ArrowLeft, Flame } from 'lucide-react'
import { api } from '../lib/api'
import { Skeleton } from '../components/ui/skeleton'

const formatTime = (dateString: string) => {
  const now = new Date()
  const date = new Date(dateString)
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours === 0) {
    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes}分钟前`
  }
  return `${hours}小时前`
}

  const BreakingNewsDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [news, setNews] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [favorited, setFavorited] = useState(false)
  const [displayFavoriteCount, setDisplayFavoriteCount] = useState(0)

  useEffect(() => {
    if (id) {
      loadNews(id)
    }
  }, [id])

  const loadNews = async (newsId: string) => {
    try {
      const res = await api.breakingNews.getById(newsId)
      setNews(res)
      // 计算显示的收藏数 = 虚拟基数 + 真实收藏数
      setDisplayFavoriteCount((res.virtualBaseCount || 0) + (res.favoriteCount || 0))
    } catch (error) {
      console.error('Failed to load news:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()

    const token = localStorage.getItem('user_token')
    if (!token) {
      alert('请先登录后再进行收藏操作')
      navigate('/login')
      return
    }

    try {
      if (favorited) {
        await api.breakingNews.unfavorite(id!)
        setFavorited(false)
        // 收藏数-1
        setDisplayFavoriteCount(prev => prev - 1)
      } else {
        await api.breakingNews.favorite(id!)
        setFavorited(true)
        // 收藏数+1
        setDisplayFavoriteCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Toggle favorite failed:', error)
    }
  }

  // 加载状态
  if (loading) {
    return (
      <div className="py-12">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="max-w-5xl mx-auto bg-card rounded-3xl p-8 shadow-sm">
          <Skeleton className="h-8 w-3/4 mb-6" />
          <Skeleton className="h-6 w-full mb-4" />
          <Skeleton className="h-6 w-full mb-4" />
          <Skeleton className="h-6 w-2/3 mb-6" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }

  if (!news) {
    return (
      <div className="py-12">
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">快讯不存在</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12">
      {/* 标题区域 */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/breaking')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">返回列表</span>
        </button>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
          <Flame className="w-5 h-5 text-accent" />
        </div>
        <div>
          <span className="text-sm font-medium text-accent tracking-wider uppercase">Breaking News</span>
          <h2 className="text-3xl lg:text-4xl font-serif font-semibold text-foreground">实时热点</h2>
        </div>
      </div>

      {/* 详情内容 */}
      <div className="max-w-5xl mx-auto bg-card rounded-3xl p-8 lg:p-12 shadow-sm">
        {/* 标题 */}
        <h1 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-6">
          {news.title}
        </h1>

        {/* 元信息 */}
        <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-border">
          {news.category && (
            <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-lg">
              {news.category}
            </span>
          )}
          <span className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            {formatTime(news.publishTime)}
          </span>
          <button
            onClick={handleToggleFavorite}
            className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors"
          >
            <Star
              className={`w-4 h-4 ${favorited ? 'fill-accent text-accent' : ''}`}
            />
            {displayFavoriteCount}
          </button>
        </div>

        {/* 内容 */}
        <div className="prose prose-lg max-w-none">
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {news.content}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BreakingNewsDetail
