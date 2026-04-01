import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DailyArticle as DailyArticleType, Category, ArticleStatus } from '../types'
import { BreakingNews as BreakingNewsType, LongRead as LongReadType, SpecialTopic as SpecialTopicType } from '../types'
import { api } from '../lib/api'
import { ChevronLeft, ChevronRight, Calendar, Clock, Layers, BookOpen, TrendingUp, Flame, User, ArrowRight, Star } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'

// 清理HTML标签
function cleanHtmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 图片轮播组件
function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-t-3xl group">
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={image}
            alt={alt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ))}

      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            aria-label="上一张"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            aria-label="下一张"
          >
            <ChevronRight className="w-6 h-6 text-foreground" />
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2.5">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-card w-8"
                    : "bg-card/50 hover:bg-card/70 w-3"
                }`}
                aria-label={`切换到第${index + 1}张图片`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DailyPicksHero({
  items,
  activeIndex,
  onPrev,
  onNext,
  onSelect,
  onOpenAll,
  dateMain,
  dateEn,
  onOpenYesterday,
  yesterdayLabel,
}: {
  items: Array<{ title: string; summary?: string; content?: string; images?: string[] }>
  activeIndex: number
  onPrev: () => void
  onNext: () => void
  onSelect: (index: number) => void
  onOpenAll: () => void
  dateMain: string
  dateEn: string
  onOpenYesterday: () => void
  yesterdayLabel: string
}) {
  const active = items[activeIndex]
  const excerpt = active?.summary || (active?.content ? cleanHtmlTags(active.content) : '')
  const thumbStripRef = useRef<HTMLDivElement | null>(null)
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([])
  const prevCoverRef = useRef<string | null>(null)
  const wipeTimerRef = useRef<number | null>(null)
  const [wipeSrc, setWipeSrc] = useState<string | null>(null)
  const [wipeKey, setWipeKey] = useState(0)

  const dragRef = useRef<{
    active: boolean
    startX: number
    startScrollLeft: number
    moved: boolean
  }>({ active: false, startX: 0, startScrollLeft: 0, moved: false })

  // 主区域拖拽切换文章
  const heroDragRef = useRef<{
    active: boolean
    startX: number
    moved: boolean
  }>({ active: false, startX: 0, moved: false })

  const titleChars = useMemo(() => {
    const text = active?.title || ''
    return Array.from(text)
  }, [active?.title])

  useEffect(() => {
    const el = thumbRefs.current[activeIndex]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeIndex])

  useEffect(() => {
    const current = active?.images?.[0] || null
    const prev = prevCoverRef.current
    prevCoverRef.current = current
    if (!prev || prev === current) return
    setWipeSrc(prev)
    setWipeKey(k => k + 1)
    if (wipeTimerRef.current) window.clearTimeout(wipeTimerRef.current)
    wipeTimerRef.current = window.setTimeout(() => {
      setWipeSrc(null)
      wipeTimerRef.current = null
    }, 780)
    return () => {
      if (wipeTimerRef.current) window.clearTimeout(wipeTimerRef.current)
      wipeTimerRef.current = null
    }
  }, [active?.images, activeIndex])

  const snapThumbToNearest = () => {
    const strip = thumbStripRef.current
    if (!strip) return
    const stripRect = strip.getBoundingClientRect()
    const centerX = stripRect.left + stripRect.width / 2
    let bestIdx = 0
    let bestDist = Number.POSITIVE_INFINITY
    thumbRefs.current.forEach((btn, idx) => {
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const c = r.left + r.width / 2
      const dist = Math.abs(c - centerX)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = idx
      }
    })
    onSelect(bestIdx)
  }

  return (
    <div
      className="relative min-h-[92vh] lg:min-h-[100vh] select-none"
      onPointerDown={(e) => {
        // 仅处理主区域拖拽（非按钮、非缩略图区域）
        if ((e.target as HTMLElement).closest('button, a, [data-no-drag]')) return
        heroDragRef.current.active = true
        heroDragRef.current.startX = e.clientX
        heroDragRef.current.moved = false
      }}
      onPointerMove={(e) => {
        if (!heroDragRef.current.active) return
        const dx = e.clientX - heroDragRef.current.startX
        if (Math.abs(dx) > 30) heroDragRef.current.moved = true
      }}
      onPointerUp={(e) => {
        if (!heroDragRef.current.active) return
        heroDragRef.current.active = false
        if (heroDragRef.current.moved) {
          const dx = e.clientX - heroDragRef.current.startX
          if (dx < -50) {
            onNext()
          } else if (dx > 50) {
            onPrev()
          }
        }
      }}
      onPointerCancel={() => {
        heroDragRef.current.active = false
      }}
    >
      <div className="absolute inset-0">
        {items.map((it, idx) => {
          const src = it.images?.[0]
          return (
            <div
              key={`${it.title}-${idx}`}
              className={`absolute inset-0 transition-opacity duration-700 ${
                idx === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {src ? (
                <img
                  src={src}
                  alt={it.title}
                  className={`h-full w-full object-cover ${idx === activeIndex ? 'hero-kenburns' : ''}`}
                  loading={idx === activeIndex ? 'eager' : 'lazy'}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-accent/20 via-secondary/40 to-background" />
              )}
            </div>
          )
        })}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />

        {wipeSrc && (
          <div key={wipeKey} className="absolute inset-0 hero-wipe">
            <img src={wipeSrc} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
          </div>
        )}
      </div>

      {/* 箭头导航 - 使用 z-30 确保在最上层 */}
      {items.length > 1 && (
        <>
          <button
            onClick={onPrev}
            className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            aria-label="上一条精选"
          >
            <ChevronLeft className="h-6 w-6 lg:h-7 lg:w-7" />
          </button>
          <button
            onClick={onNext}
            className="absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            aria-label="下一条精选"
          >
            <ChevronRight className="h-6 w-6 lg:h-7 lg:w-7" />
          </button>
        </>
      )}

      {/* 日期 - 右上角，贴近导航栏下端 */}
      <div className="absolute top-20 lg:top-24 right-6 lg:right-14 xl:right-16 z-20 text-right pointer-events-none">
        <div className="font-serif text-xl lg:text-3xl font-semibold tracking-[0.15em] text-white/90">
          {dateMain}
        </div>
        <div className="font-serif italic text-xl lg:text-3xl font-light tracking-[0.08em] text-white/80 mt-1">
          {dateEn}
        </div>
      </div>

      {/* 左侧内容区 - 页面底部，从下往上生长 */}
      <div className="absolute bottom-8 lg:bottom-10 left-6 lg:left-14 xl:left-16 z-20 pointer-events-none max-w-xl flex flex-col justify-end">
        <div className="pointer-events-auto">
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-5xl font-semibold leading-[1.05] tracking-tight text-white">
            {titleChars.map((ch, i) => (
              <span
                key={`${active?.title}-${i}-${ch}`}
                className="hero-title-char"
                style={{ animationDelay: `${i * 26}ms` }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </h1>

          <p
            key={`${active?.title}-excerpt`}
            className="mt-3 max-w-xl text-sm sm:text-base lg:text-xl leading-relaxed text-white/90 font-medium line-clamp-3"
          >
            {excerpt}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={onOpenAll}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/22"
            >
              进入今日精选
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenYesterday}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3.5 text-sm font-semibold text-white/95 backdrop-blur transition-colors hover:bg-white/15"
            >
              往期精选
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 缩略图条 - 右侧底部，移动端隐藏 */}
      <div className="hidden sm:block absolute bottom-8 lg:bottom-10 right-6 lg:right-14 xl:right-16 z-20 pointer-events-auto max-w-[45vw] lg:max-w-[35vw]">
        <div
          ref={thumbStripRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory select-none"
          style={{ cursor: 'grab' }}
          data-no-drag="true"
          onPointerDown={(e) => {
            const strip = thumbStripRef.current
            if (!strip) return
            dragRef.current.active = true
            dragRef.current.startX = e.clientX
            dragRef.current.startScrollLeft = strip.scrollLeft
            dragRef.current.moved = false
            ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const strip = thumbStripRef.current
            if (!strip || !dragRef.current.active) return
            const dx = e.clientX - dragRef.current.startX
            if (Math.abs(dx) > 6) dragRef.current.moved = true
            strip.scrollLeft = dragRef.current.startScrollLeft - dx
          }}
          onPointerUp={(e) => {
            dragRef.current.active = false
            ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
            if (dragRef.current.moved) {
              window.setTimeout(() => snapThumbToNearest(), 50)
            }
          }}
          onPointerCancel={(e) => {
            dragRef.current.active = false
            try { ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId) } catch {}
          }}
        >
          {items.map((it, idx) => (
            <button
              ref={(el) => { thumbRefs.current[idx] = el }}
              key={`${it.title}-thumb-${idx}`}
              onClick={() => {
                if (dragRef.current.moved) return
                onSelect(idx)
              }}
              className={`relative shrink-0 overflow-hidden rounded-lg border transition-all snap-start ${
                idx === activeIndex ? 'border-white/70 ring-1 ring-white/30' : 'border-white/15 hover:border-white/30'
              }`}
              style={{ width: 140 }}
              aria-label={`切换到精选：${it.title}`}
            >
              <div className="aspect-[16/10] w-full">
                {it.images?.[0] ? (
                  <img
                    src={it.images[0]}
                    alt={it.title}
                    className={`h-full w-full object-cover ${idx === activeIndex ? 'scale-[1.02]' : ''}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-white/10" />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2 text-left">
                <div className="text-xs font-semibold text-white line-clamp-1">{it.title}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 指示器 - 页面底部居中 */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2 pointer-events-auto">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === activeIndex ? 'w-10 bg-white' : 'w-2 bg-white/55 hover:bg-white/75'
              }`}
              aria-label={`切换到第${idx + 1}条精选`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const Home = () => {
  const navigate = useNavigate()
  const [dailyArticles, setDailyArticles] = useState<DailyArticleType[]>([])
  const [breakingNews, setBreakingNews] = useState<BreakingNewsType[]>([])
  const [displayBreakingNews, setDisplayBreakingNews] = useState<any[]>([]) // 用于显示的数据
  const [longReads, setLongReads] = useState<LongReadType[]>([])
  const [specialTopics, setSpecialTopics] = useState<SpecialTopicType[]>([])
  const [loading, setLoading] = useState(true)
  const [favoritedNews, setFavoritedNews] = useState<Set<string>>(new Set())
  const [dailyPickIndex, setDailyPickIndex] = useState(0)
  const [dailyPickDate, setDailyPickDate] = useState<string>('')

  useEffect(() => {
    loadAllData()
    loadFavorites()
  }, [])

  useEffect(() => {
    if (dailyArticles.length <= 1) return
    const timer = window.setInterval(() => {
      setDailyPickIndex(prev => (prev + 1) % Math.min(3, dailyArticles.length))
    }, 6500)
    return () => window.clearInterval(timer)
  }, [dailyArticles.length])

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

  const loadAllData = async () => {
    try {
      console.log('开始加载首页数据...')
      let latestDate: string | undefined
      try {
        const datesRes: any = await api.dailyArticles.getAvailableDates({ status: 'PUBLISHED', limit: 30 })
        latestDate = datesRes?.data?.[0]?.date as string | undefined
      } catch (e) {
        console.error('加载每日精选日期失败:', e)
      }
      if (latestDate) setDailyPickDate(latestDate)

      const [dailyRes, breakingRes, longRes, topicRes] = await Promise.allSettled([
        api.dailyArticles.getAll({ status: 'PUBLISHED', date: latestDate, limit: 3 }),
        api.breakingNews.getLatest({ limit: 5 }), // 改用获取最新一期的API
        api.longReads.getAll({ status: 'PUBLISHED', limit: 2 }),
        api.specialTopics.getAll({ status: 'PUBLISHED', limit: 3 })
      ])

      const dailyData = dailyRes.status === 'fulfilled' ? (dailyRes.value?.data || []) : []
      const breakingData = breakingRes.status === 'fulfilled' ? (breakingRes.value?.data || []) : []
      const longData = longRes.status === 'fulfilled' ? (longRes.value?.data || []) : []
      const topicData = topicRes.status === 'fulfilled' ? (topicRes.value?.data || []) : []

      if (dailyRes.status === 'rejected') console.error('每日精选加载失败:', dailyRes.reason)
      if (breakingRes.status === 'rejected') console.error('快讯加载失败:', breakingRes.reason)
      if (longRes.status === 'rejected') console.error('深度解读加载失败:', longRes.reason)
      if (topicRes.status === 'rejected') console.error('专题加载失败:', topicRes.reason)

      console.log('快讯数量:', breakingData.length || 0)

      setDailyArticles((dailyData || []).map((a: any) => ({
        ...a,
        images: a.images && a.images.length > 0 ? a.images : a.featuredImage ? [a.featuredImage] : []
      })))
      setBreakingNews(breakingData || [])
      // 为每条新闻计算显示收藏数
      const newsWithCount = (breakingData || []).map((item: any) => ({
        ...item,
        displayFavoriteCount: (item.virtualBaseCount || 0) + (item.favoriteCount || 0)
      }))
      setDisplayBreakingNews(newsWithCount)
      console.log('设置的快讯数据:', newsWithCount)
      setLongReads(longData || [])
      setSpecialTopics(topicData || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
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

  const formatHeat = (heat: number) => {
    if (heat >= 10000) {
      return `${(heat / 10000).toFixed(1)}万`
    }
    return heat.toString()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayLabel = `${yesterday.getMonth() + 1}月${yesterday.getDate()}日`
  const yesterdayIso = yesterday.toISOString().slice(0, 10)

  const handleToggleFavorite = async (newsId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const token = localStorage.getItem('user_token')
    if (!token) {
      alert('请先登录后再进行收藏操作')
      navigate('/login')
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
        // 收藏数-1（本地更新displayBreakingNews）
        setDisplayBreakingNews(prev => prev.map(item =>
          item.id === newsId
            ? { ...item, displayFavoriteCount: (item.displayFavoriteCount || 0) - 1 }
            : item
        ))
        setBreakingNews(prev => prev.map(item =>
          item.id === newsId
            ? { ...item, displayFavoriteCount: (item.displayFavoriteCount || 0) - 1 }
            : item
        ))
      } else {
        await api.breakingNews.favorite(newsId)
        setFavoritedNews(prev => new Set(prev).add(newsId))
        // 收藏数+1（本地更新displayBreakingNews）
        setDisplayBreakingNews(prev => prev.map(item =>
          item.id === newsId
            ? { ...item, displayFavoriteCount: (item.displayFavoriteCount || 0) + 1 }
            : item
        ))
        setBreakingNews(prev => prev.map(item =>
          item.id === newsId
            ? { ...item, displayFavoriteCount: (item.displayFavoriteCount || 0) + 1 }
            : item
        ))
      }
    } catch (error) {
      console.error('Toggle favorite failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="py-12 space-y-12">
        {/* 每日精选骨架 */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-10">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex gap-5">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-3xl overflow-hidden">
                <Skeleton className="aspect-[3/2] w-full" />
                <div className="p-8 space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
          <div className="w-48 flex flex-col gap-4 shrink-0">
            <Skeleton className="w-48 aspect-[4/3] rounded-2xl" />
            <Skeleton className="w-48 aspect-[4/3] rounded-2xl" />
          </div>
        </div>

        {/* 分隔线 */}
        <div className="h-px bg-border" />

        {/* 实时热点骨架 */}
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="bg-card rounded-3xl p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-start gap-4 py-4 border-b border-border">
                <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="h-px bg-border" />

        {/* 深度解读骨架 */}
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-3xl overflow-hidden">
              <Skeleton className="aspect-[3/2] w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>

        {/* 分隔线 */}
        <div className="h-px bg-border" />

        {/* 专题报道骨架 */}
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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

  const dateInfo = formatChineseDate((dailyPickDate ? `${dailyPickDate}T00:00:00.000Z` : new Date().toISOString()))

  // 为实时快讯计算显示收藏数（虚拟基数 + 真实收藏数），使用displayBreakingNews
  const trendingItems = displayBreakingNews.slice(0, 5).map((item, index) => {
    return {
      id: item.id,
      title: item.title,
      content: item.content,
      heat: item.views || 100000 - index * 10000,
      displayFavoriteCount: item.displayFavoriteCount,
      category: item.category || ''
    }
  })

  return (
    <div className="space-y-12 pb-12">
      {/* ==================== 每日精选 ==================== */}
      <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
        <DailyPicksHero
          items={dailyArticles.slice(0, 3)}
          activeIndex={Math.min(dailyPickIndex, Math.max(0, dailyArticles.slice(0, 3).length - 1))}
          onPrev={() => setDailyPickIndex(prev => (prev === 0 ? Math.min(2, dailyArticles.slice(0, 3).length - 1) : prev - 1))}
          onNext={() => setDailyPickIndex(prev => (prev + 1) % Math.max(1, dailyArticles.slice(0, 3).length))}
          onSelect={(idx) => setDailyPickIndex(idx)}
          onOpenAll={() => navigate('/daily')}
          onOpenYesterday={() => navigate('/past-selections')}
          dateMain={dateInfo.main}
          dateEn={dateInfo.english}
          yesterdayLabel={yesterdayLabel}
        />
      </section>

      {/* 分隔线 */}
      <div className="h-px bg-border mt-0" />

      {/* ==================== 实时快讯 ==================== */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
            <Flame className="w-5 h-5 text-accent" />
          </div>
          <div>
            <span className="text-sm font-medium text-accent tracking-wider uppercase">Breaking News</span>
            <h2 className="text-3xl lg:text-4xl font-serif font-semibold text-foreground">实时快讯</h2>
          </div>
          <button
            onClick={() => navigate('/breaking')}
            className="ml-auto hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
          >
            查看更多
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="bg-card rounded-3xl p-6 lg:p-8 shadow-sm">
            {trendingItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 py-5 border-b border-border last:border-0 group cursor-pointer"
                  onClick={() => navigate(`/breaking-news/${item.id}`)}
                >
                  {/* 排名 */}
                  <span
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold ${
                      index < 3
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground"
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

                    {/* 内容 - 显示全部，不截断，字体稍深的灰色 */}
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

            {/* 查看更多按钮 */}
            <button
              onClick={() => navigate('/breaking')}
              className="mt-6 w-full py-3 bg-accent/10 hover:bg-accent/20 text-accent rounded-2xl transition-colors flex items-center justify-center gap-2 font-medium"
            >
              查看更多
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        {/* 移动端查看更多 */}
        <button
          onClick={() => navigate('/breaking')}
          className="lg:hidden flex items-center justify-center gap-2 mt-6 py-3 text-sm font-medium text-muted-foreground hover:text-accent transition-colors w-full"
        >
          查看更多热点
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* 分隔线 */}
      <div className="h-px bg-border" />

      {/* ==================== 深度解读 ==================== */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
            <BookOpen className="w-5 h-5 text-accent" />
          </div>
          <div>
            <span className="text-sm font-medium text-accent tracking-wider uppercase">In-Depth</span>
            <h2 className="text-3xl lg:text-4xl font-serif font-semibold text-foreground">深度解读</h2>
          </div>
          <button
            onClick={() => navigate('/long-reads')}
            className="ml-auto hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
          >
            查看更多
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {longReads.slice(0, 3).map((article) => (
            <article
              key={article.id}
              className="group bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/long-reads/${article.slug}`)}
            >
              {article.coverImage && (
                <div className="relative aspect-[3/2] overflow-hidden">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <h3 className="text-2xl font-serif font-bold text-card mb-2">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-card/80">
                      <User className="w-4 h-4" />
                      <span>{article.author || '编辑'}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(article.publishTime)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className="p-6">
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
                  {article.content.substring(0, 200).replace(/<[^>]*>/g, '')}...
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-accent group-hover:gap-3 transition-all">
                  阅读全文
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* 移动端查看更多 */}
        <button
          onClick={() => navigate('/long-reads')}
          className="lg:hidden flex items-center justify-center gap-2 mt-6 py-3 text-sm font-medium text-muted-foreground hover:text-accent transition-colors w-full"
        >
          查看更多深度解读
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* 分隔线 */}
      <div className="h-px bg-border" />

      {/* ==================== 专题报道 ==================== */}

      {/* 分隔线 */}
      <div className="h-px bg-border" />

      {/* ==================== 专题报道 ==================== */}
      <section>
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
            onClick={() => window.location.href = '/special-topics'}
            className="hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
          >
            全部专题
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialTopics.slice(0, 3).map((topic) => (
            <article
              key={topic.id}
              className="group bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/special-topics/${topic.slug}`)}
            >
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
                    <div className="flex items-center gap-2 text-sm text-card/80">
                      <User className="w-4 h-4" />
                      <span>{topic.author || '编辑'}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(topic.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className="p-6">
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
                  {topic.description}
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-accent group-hover:gap-3 transition-all">
                  进入专题
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* 移动端查看更多 */}
        <button
          onClick={() => navigate('/special-topics')}
          className="lg:hidden flex items-center justify-center gap-2 mt-6 py-3 text-sm font-medium text-muted-foreground hover:text-accent transition-colors w-full"
        >
          查看全部专题
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  )
}

export default Home
