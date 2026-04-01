import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DailyArticle as DailyArticleType, Category, ArticleStatus } from '../types'
import { api } from '../lib/api'
import { ChevronLeft, ChevronRight, Star, ArrowRight, Share2, Link, MessageCircle, Copy, Check } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import { Dialog, DialogContent } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

// 清理HTML标签的辅助函数
function cleanHtmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 图片查看器组件
function ImageViewer({ images, alt, initialIndex, isOpen, onClose }: {
  images: string[];
  alt: string;
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (!isOpen) return
    setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)))
  }, [initialIndex, isOpen, images.length])

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[96vw] h-[92vh] p-0 overflow-hidden bg-black border-none">
        <div className="relative h-full">
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={images[currentIndex]}
              alt={alt}
              className="max-h-[92vh] w-auto max-w-[96vw] object-contain"
            />
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-5 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/15 transition-colors backdrop-blur"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-5 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/15 transition-colors backdrop-blur"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2.5">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex ? "bg-white w-8" : "bg-white/50 w-2"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setVisible(true)
        })
      },
      { threshold: 0.18 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {children}
    </div>
  )
}

function ArticleMedia({
  images,
  title,
  onOpen,
}: {
  images: string[]
  title: string
  onOpen: (index: number) => void
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [images.length, title])

  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <div className="text-slate-400 text-lg">暂无图片</div>
      </div>
    )
  }

  const prev = () => setIndex((p) => (p === 0 ? images.length - 1 : p - 1))
  const next = () => setIndex((p) => (p === images.length - 1 ? 0 : p + 1))

  return (
    <div className="relative aspect-video w-full overflow-hidden cursor-pointer" onClick={() => onOpen(index)}>
      {images.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={src}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading={i === index ? 'eager' : 'lazy'}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/15 transition-colors backdrop-blur"
            aria-label="上一张"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/15 transition-colors backdrop-blur"
            aria-label="下一张"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIndex(i) }}
                className={`h-2 rounded-full transition-all ${i === index ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/70 w-2'}`}
                aria-label={`切换到第${i + 1}张`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const DailyArticles = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [articles, setArticles] = useState<DailyArticleType[]>([])
  const [loading, setLoading] = useState(true)
  const [favoritedArticles, setFavoritedArticles] = useState<Set<string>>(new Set())
  const [shareMenuArticleId, setShareMenuArticleId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedImageArticle, setSelectedImageArticle] = useState<{ images: string[]; title: string } | null>(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [availableDates, setAvailableDates] = useState<Array<{ date: string; count: number }>>([])
  const selectedDate = searchParams.get('date') || ''

  useEffect(() => {
    loadAvailableDates()
    loadFavorites()
  }, [])

  useEffect(() => {
    loadArticles(selectedDate)
  }, [selectedDate])

  const loadArticles = async (date?: string) => {
    setLoading(true)
    try {
      const response: any = await api.dailyArticles.getAll({ status: 'PUBLISHED', date: date || undefined, limit: 9 })
      const apiArticles = response.data || []
      const processedArticles = apiArticles.map((article: any) => ({
        ...article,
        category: article.category as Category,
        status: article.status as ArticleStatus,
        views: article.views || 0,
        // 确保有图片数组
        images: article.images && article.images.length > 0 
          ? article.images 
          : article.featuredImage 
            ? [article.featuredImage] 
            : [],
        // 计算显示的收藏数
        displayFavoriteCount: (article.virtualBaseCount || 0) + (article.favoriteCount || 0)
      }))
      setArticles(processedArticles)
    } catch (error) {
      console.error('Failed to load articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableDates = async () => {
    try {
      const res: any = await api.dailyArticles.getAvailableDates({ status: 'PUBLISHED', limit: 120 })
      const dates = res.data || []
      setAvailableDates(dates)
      if (!searchParams.get('date') && dates.length > 0) {
        setSearchParams(prev => {
          const next = new URLSearchParams(prev)
          next.set('date', dates[0].date)
          return next
        })
      }
    } catch (error) {
      console.error('Failed to load available dates:', error)
    }
  }

  const loadFavorites = async () => {
    const token = localStorage.getItem('user_token')
    if (!token) return

    try {
      const res = await api.dailyArticles.getFavorites()
      const favoriteIds = res.data?.map((f: any) => f.articleId) || []
      setFavoritedArticles(new Set(favoriteIds))
    } catch (error) {
      console.error('Failed to load favorites:', error)
    }
  }

  const handleFavorite = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const token = localStorage.getItem('user_token')
    if (!token) {
      alert('请先登录后再收藏')
      return
    }

    try {
      const result = await api.dailyArticles.favorite(articleId)
      
      // 更新本地状态
      const newFavorited = new Set(favoritedArticles)
      const updatedArticles = articles.map(article => {
        if (article.id === articleId) {
          const isFavorited = result.favorite
          if (isFavorited) {
            newFavorited.add(articleId)
            return {
              ...article,
              favoriteCount: (article.favoriteCount || 0) + 1,
              displayFavoriteCount: article.displayFavoriteCount + 1
            }
          } else {
            newFavorited.delete(articleId)
            return {
              ...article,
              favoriteCount: Math.max(0, (article.favoriteCount || 0) - 1),
              displayFavoriteCount: article.displayFavoriteCount - 1
            }
          }
        }
        return article
      })
      
      setFavoritedArticles(newFavorited)
      setArticles(updatedArticles)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      alert('操作失败，请重试')
    }
  }

  const handleCopyLink = async (article: DailyArticleType) => {
    const url = `${window.location.origin}/daily?date=${selectedDate}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(article.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedId(article.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
    setShareMenuArticleId(null)
  }

  const handleShareQQ = (article: DailyArticleType) => {
    const url = encodeURIComponent(`${window.location.origin}/daily?date=${selectedDate}`)
    const title = encodeURIComponent(article.title)
    window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}&summary=`, '_blank', 'width=600,height=500')
    setShareMenuArticleId(null)
  }

  const openImageViewer = (article: DailyArticleType, index: number) => {
    const images = (article.images && article.images.length > 0)
      ? article.images
      : article.featuredImage
        ? [article.featuredImage]
        : []
    setSelectedImageArticle({ images, title: article.title })
    setImageIndex(index)
  }

  const formatChineseDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
    return {
      main: `公元${year}年${month}月${day}日，${weekdays[date.getDay()]}`,
      english: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
  }

  const formatViews = (views: number) => {
    if (views >= 10000) {
      return `${(views / 10000).toFixed(1)}万`
    }
    return views.toLocaleString()
  }

  // 获取显示的文本（优先显示摘要，如果没有则显示部分内容）
  const getDisplayText = (article: DailyArticleType) => {
    if (article.summary && article.summary.trim()) {
      return article.summary
    }
    // 如果摘要为空，显示部分内容（前300个字符）
    const cleanContent = cleanHtmlTags(article.content || '')
    return cleanContent.length > 300 ? cleanContent.substring(0, 300) + '...' : cleanContent
  }

  const dateInfo = useMemo(() => {
    if (!selectedDate) return formatChineseDate(new Date().toISOString())
    return formatChineseDate(`${selectedDate}T00:00:00.000Z`)
  }, [selectedDate])

  // 加载状态
  if (loading) {
    return (
      <div className="py-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-10">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mx-auto w-full lg:w-[60%] bg-card rounded-2xl overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-8 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
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
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-accent tracking-wider uppercase">Daily Picks</span>
            <button
              onClick={() => navigate('/past-selections')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
            >
              往期精选
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-4xl lg:text-5xl font-serif font-semibold text-foreground mt-2">每日精选</h2>
          <div className="w-fit">
            <Select
              value={selectedDate || (availableDates[0]?.date || '')}
              onValueChange={(value) => {
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev)
                  if (value) next.set('date', value)
                  else next.delete('date')
                  return next
                })
              }}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="选择日期" />
              </SelectTrigger>
              <SelectContent>
                {availableDates.map(d => (
                  <SelectItem key={d.date} value={d.date}>
                    {d.date}（{d.count}篇）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:justify-end">
          <div className="sm:text-right">
            <p className="text-2xl lg:text-3xl font-serif text-foreground">{dateInfo.main}</p>
            <p className="text-lg text-muted-foreground mt-1">{dateInfo.english}</p>
          </div>
        </div>
      </div>

      {/* 文章列表 - 单列显示，响应式宽度 */}
      <div className="space-y-12">
        {articles.map((article) => (
          <Reveal key={article.id}>
            <article className="group mx-auto w-full max-w-5xl bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
              <ArticleMedia
                images={(article.images && article.images.length > 0)
                  ? article.images
                  : article.featuredImage
                    ? [article.featuredImage]
                    : []}
                title={article.title}
                onOpen={(idx) => openImageViewer(article, idx)}
              />

              <div className="p-8 md:p-10">
                <div className="flex items-start gap-3 mb-6">
                  <h3 className="text-3xl md:text-4xl font-serif font-semibold text-slate-900 leading-tight flex-1">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShareMenuArticleId(shareMenuArticleId === article.id ? null : article.id)
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      {shareMenuArticleId === article.id && (
                        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-2 w-44 z-50">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleShareQQ(article) }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4 text-blue-500" />
                            转发到QQ
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyLink(article) }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            {copiedId === article.id ? (
                              <><Check className="w-4 h-4 text-green-500" /> 已复制链接</>
                            ) : (
                              <><Link className="w-4 h-4 text-slate-400" /> 复制链接</>
                            )}
                          </button>
                          <div className="mx-4 my-1 border-t border-slate-100" />
                          <button
                            onClick={(e) => { e.stopPropagation(); setShareMenuArticleId(null) }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Copy className="w-4 h-4 text-slate-400" />
                            微信（请复制链接后打开微信发送）
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleFavorite(article.id, e)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        favoritedArticles.has(article.id)
                          ? 'bg-rose-500 text-white hover:bg-rose-600'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${favoritedArticles.has(article.id) ? 'fill-white' : ''}`} />
                      <span>{article.displayFavoriteCount?.toLocaleString() || 0}</span>
                    </button>
                  </div>
                </div>

                {article.author && (
                  <div className="mb-6 text-sm text-slate-500">
                    <span>✍️ {article.author}</span>
                  </div>
                )}

                <div className="text-slate-700 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                  {getDisplayText(article)}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      {/* 空状态 */}
      {!loading && articles.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">暂无文章</p>
        </div>
      )}

      {/* 图片查看器 */}
      {selectedImageArticle && (
        <ImageViewer
          images={selectedImageArticle.images}
          alt={selectedImageArticle.title}
          initialIndex={imageIndex}
          isOpen={!!selectedImageArticle}
          onClose={() => setSelectedImageArticle(null)}
        />
      )}
    </div>
  )
}

export default DailyArticles
