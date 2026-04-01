import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ArrowRight } from 'lucide-react'
import { api } from '../lib/api'
import { Skeleton } from '../components/ui/skeleton'

interface DateGroup {
  date: string
  label: string
  labelEn: string
  count: number
  coverImage: string | null
  articles: any[]
}

function cleanHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

const PastSelections = () => {
  const navigate = useNavigate()
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // 获取大量文章，按日期分组
      const response: any = await api.dailyArticles.getAll({ status: 'PUBLISHED', limit: 300 })
      const articles = response.data || []

      // 按日期分组
      const groups = new Map<string, any[]>()

      articles.forEach((article: any) => {
        const dateStr = article.publishTime
          ? new Date(article.publishTime).toISOString().slice(0, 10)
          : article.createdAt
            ? new Date(article.createdAt).toISOString().slice(0, 10)
            : 'unknown'

        if (!groups.has(dateStr)) {
          groups.set(dateStr, [])
        }
        groups.get(dateStr)!.push(article)
      })

      // 排序日期（最新在前）
      const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a))

      const result: DateGroup[] = sortedDates.map(dateStr => {
        const dateArticles = groups.get(dateStr)!
        const date = new Date(`${dateStr}T00:00:00.000Z`)
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
        const month = date.getMonth() + 1
        const day = date.getDate()

        // 封面图：取第一篇有图文章的第一张图
        let coverImage: string | null = null
        for (const a of dateArticles) {
          const imgs = a.images && a.images.length > 0 ? a.images : a.featuredImage ? [a.featuredImage] : []
          if (imgs.length > 0) {
            coverImage = imgs[0]
            break
          }
        }

        // 取前两篇标题作为摘要
        const titles = dateArticles.slice(0, 2).map((a: any) => a.title).join(' / ')

        return {
          date: dateStr,
          label: `${month}月${day}日 ${weekdays[date.getDay()]}`,
          labelEn: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'short' }),
          count: dateArticles.length,
          coverImage,
          articles: dateArticles,
        }
      })

      setDateGroups(result)
    } catch (error) {
      console.error('Failed to load past selections:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="py-12">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card rounded-3xl overflow-hidden">
              <Skeleton className="aspect-[3/2] w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
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
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <div>
              <span className="text-sm font-medium text-accent tracking-wider uppercase">Past Selections</span>
              <h2 className="text-3xl lg:text-4xl font-serif font-semibold text-foreground">往期精选</h2>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
          >
            返回首页
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dateGroups.map((group) => (
            <article
              key={group.date}
              className="group bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/daily?date=${group.date}`)}
            >
              {group.coverImage ? (
                <div className="relative aspect-[3/2] overflow-hidden">
                  <img
                    src={group.coverImage}
                    alt={group.label}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <h3 className="text-2xl font-serif font-bold text-card mb-1">
                      {group.label}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-card/80">
                      <Calendar className="w-4 h-4" />
                      <span>{group.labelEn}</span>
                      <span className="flex items-center gap-1">
                        {group.count} 篇精选
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[3/2] overflow-hidden bg-gradient-to-br from-accent/20 via-secondary/40 to-background flex items-center justify-center">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-accent/50 mx-auto mb-2" />
                    <h3 className="text-2xl font-serif font-bold text-foreground">{group.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{group.count} 篇精选</p>
                  </div>
                </div>
              )}
              <div className="p-5">
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
                  {cleanHtmlTags(group.articles[0]?.summary || group.articles[0]?.content?.substring(0, 100) || '')}
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-accent group-hover:gap-3 transition-all">
                  查看当日精选
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </article>
          ))}
        </div>

        {dateGroups.length === 0 && (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">暂无往期精选</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default PastSelections
