import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, ChevronDown, Star } from 'lucide-react'
import { BreakingNews as BreakingNewsType } from '../types'
import { api } from '../lib/api'
import { Skeleton } from '../components/ui/skeleton'

const BreakingNews = () => {
  const navigate = useNavigate()
  const [news, setNews] = useState<BreakingNewsType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [favoritedNews, setFavoritedNews] = useState<Set<string>>(new Set())

  // 初始化日期为当日
  useEffect(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    setSelectedDate(`${year}-${month}-${day}`)
  }, [])

  useEffect(() => {
    loadNews()
    loadFavorites()
  }, [])

  // 当日期选择改变时重新加载
  useEffect(() => {
    loadNews()
  }, [selectedDate])

  const loadFavorites = async () => {
    const token = localStorage.getItem('user_token')
    if (!token) return

    try {
      const res = await api.breakingNews.getFavorites()
      // res.data 中直接包含 breakingNews 对象,使用其 id
      const favoriteIds = res.data?.map((f: any) => f.id) || []
      console.log('Loaded favorite IDs:', favoriteIds)
      setFavoritedNews(new Set(favoriteIds))
    } catch (error) {
      console.error('Failed to load favorites:', error)
    }
  }

  const loadNews = async () => {
    try {
      // 获取最新的快讯，如果选择了特定日期则按日期筛选
      const params: any = { limit: 50 }

      // 如果选择了日期，则按日期筛选
      if (selectedDate) {
        params.date = selectedDate
      }

      const res = await api.breakingNews.getAll(params)
      const allNews = res.data || []

      // 为每条新闻计算显示收藏数
      const newsWithCount = allNews.map((item) => ({
        ...item,
        displayFavoriteCount: (item.virtualBaseCount || 0) + (item.favoriteCount || 0)
      }))

      // 按重要性排序
      setNews(newsWithCount)
    } catch (error) {
      console.error('Failed to load news:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatHeat = (heat: number) => {
    if (heat >= 10000) {
      return `${(heat / 10000).toFixed(1)}万`
    }
    return heat.toString()
  }

  const categories = ['全部', '全球焦点', '全球城市', '自然与环境', '科技前沿', '体育赛事', '财经资讯', '文化社会']

  const filteredNews = news.filter(item => {
    const matchCategory = selectedCategory === '全部' || item.category === selectedCategory
    const matchDate = !selectedDate || item.publishTime.startsWith(selectedDate)
    return matchCategory && matchDate
  })

  const handleToggleFavorite = async (newsId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const token = localStorage.getItem('user_token')
    if (!token) {
      // 显示登录提示
      alert('请先登录后再进行收藏操作')
      window.location.href = '/login'
      return
    }

    try {
      if (favoritedNews.has(newsId)) {
        await api.breakingNews.unfavorite(newsId)
        setFavoritedNews(prev => {
          const next = new Set(prev)
          next.delete(newsId)
          return next
        })
        // 收藏数-1（只更新本地显示）
        setNews(prev => prev.map(item =>
          item.id === newsId
            ? { ...item, displayFavoriteCount: (item.displayFavoriteCount || 0) - 1 }
            : item
        ))
      } else {
        await api.breakingNews.favorite(newsId)
        setFavoritedNews(prev => new Set(prev).add(newsId))
        // 收藏数+1（只更新本地显示）
        setNews(prev => prev.map(item =>
          item.id === newsId
            ? { ...item, displayFavoriteCount: (item.displayFavoriteCount || 0) + 1 }
            : item
        ))
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
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="bg-card rounded-3xl p-6 lg:p-8 shadow-sm">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-start gap-4 py-4 border-b border-border last:border-0">
              <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
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
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
          <Flame className="w-5 h-5 text-accent" />
        </div>
        <div>
          <span className="text-sm font-medium text-accent tracking-wider uppercase">Breaking News</span>
          <h2 className="text-3xl lg:text-4xl font-serif font-semibold text-foreground">实时快讯</h2>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* 主题筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">主题:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 日期筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">日期:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded-lg"
            >
              全部
            </button>
          )}
        </div>
      </div>

      {/* 热点列表 */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-card rounded-3xl p-6 lg:p-8 shadow-sm">
        {filteredNews.map((item, index) => (
          <div
            key={item.id}
            className="flex items-start gap-4 py-5 border-b border-border last:border-0 group cursor-pointer"
            onClick={() => navigate(`/breaking-news/${item.id}`)}
          >
            {/* 排名 */}
            <span
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold ${
                index < 3
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {index + 1}
            </span>

            {/* 内容区域 */}
            <div className="flex-1 min-w-0">
              {/* 标题 */}
              <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                {item.title}
              </h3>

              {/* 内容摘要，字体稍深的灰色 */}
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {item.content}
              </p>

              {/* 底部信息 */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {item.category && (
                  <span className="text-muted-foreground text-xs flex items-center">
                    <span className="text-lg font-bold leading-none">·</span> {item.category}
                  </span>
                )}
                <button
                  onClick={(e) => handleToggleFavorite(item.id, e)}
                  className="flex items-center gap-1 hover:text-accent transition-colors"
                >
                  <Star
                    className={`w-3 h-3 ${favoritedNews.has(item.id) ? 'fill-accent text-accent' : ''}`}
                  />
                  {formatHeat(item.displayFavoriteCount || 0)}
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* 空状态 */}
      {!loading && filteredNews.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">暂无快讯</p>
        </div>
      )}
    </div>
  )
}

export default BreakingNews
