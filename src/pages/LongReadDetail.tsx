import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { LongRead as LongReadType } from '../types'
import { Calendar, Star, ArrowLeft } from 'lucide-react'
import { useScrollReveal } from '../hooks/use-scroll-reveal'
import { marked } from 'marked'

const slugify = (input: string) => {
  const base = (input || '')
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'section'
}

const parseArticle = (dirty: string) => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(dirty || '', 'text/html')

    const blockedTags = ['script', 'iframe', 'object', 'embed', 'link', 'style', 'meta']
    blockedTags.forEach(tag => {
      doc.querySelectorAll(tag).forEach(el => el.remove())
    })

    doc.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        const name = attr.name.toLowerCase()
        const value = attr.value || ''

        if (name.startsWith('on')) {
          el.removeAttribute(attr.name)
          return
        }

        if (name === 'style') {
          el.removeAttribute(attr.name)
          return
        }

        if ((name === 'href' || name === 'src' || name === 'xlink:href') && value.trim().toLowerCase().startsWith('javascript:')) {
          el.removeAttribute(attr.name)
        }
      })
    })

    const toc: Array<{ id: string; text: string; level: number }> = []
    const used = new Map<string, number>()
    doc.querySelectorAll('h2, h3').forEach((node) => {
      const text = (node.textContent || '').trim()
      if (!text) return
      let id = slugify(text)
      const count = used.get(id) || 0
      used.set(id, count + 1)
      if (count > 0) id = `${id}-${count + 1}`
      node.setAttribute('id', id)
      toc.push({ id, text, level: node.tagName === 'H2' ? 2 : 3 })
    })

    return { html: doc.body.innerHTML, toc }
  } catch {
    return { html: '', toc: [] as Array<{ id: string; text: string; level: number }> }
  }
}

const LongReadDetail = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [read, setRead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [favorited, setFavorited] = useState(false)
  const [displayFavoriteCount, setDisplayFavoriteCount] = useState(0)
  const articleRef = useRef<HTMLElement>(null)
  useScrollReveal(articleRef, !loading)

  const parsed = useMemo(() => {
    let rawContent = read?.content || ''
    if (!rawContent && read?.contentMarkdown) {
      rawContent = marked(read.contentMarkdown) as string
    }
    if (!rawContent) return { html: '', toc: [] as Array<{ id: string; text: string; level: number }> }
    return parseArticle(rawContent)
  }, [read?.content, read?.contentMarkdown])

  useEffect(() => {
    if (!read) return
    const onScroll = () => {
      const docEl = document.documentElement
      const scrollTop = docEl.scrollTop || document.body.scrollTop
      const scrollHeight = docEl.scrollHeight || document.body.scrollHeight
      const clientHeight = docEl.clientHeight || window.innerHeight
      const total = Math.max(1, scrollHeight - clientHeight)
      setProgress(Math.min(1, Math.max(0, scrollTop / total)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [read?.id])

  useEffect(() => {
    if (slug) {
      loadRead(slug)
    }
  }, [slug])

  const loadRead = async (slug: string) => {
    try {
      const response: any = await api.longReads.getBySlug(slug)
      setRead(response.data)
      setDisplayFavoriteCount(response.data.displayFavoriteCount || 0)
      // 检查是否已收藏
      const token = localStorage.getItem('user_token')
      if (token) {
        try {
          const favRes: any = await api.longReads.getFavorites({ limit: 1000 })
          const ids = (favRes.data || []).map((f: any) => f.id)
          setFavorited(ids.includes(response.data.id))
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load long read:', err)
      setError('加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const token = localStorage.getItem('user_token')
    if (!token) { alert('请先登录后再进行收藏操作'); navigate('/login'); return }
    try {
      if (favorited) {
        await api.longReads.unfavorite(read.id)
        setFavorited(false)
        setDisplayFavoriteCount(prev => prev - 1)
      } else {
        await api.longReads.favorite(read.id)
        setFavorited(true)
        setDisplayFavoriteCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Toggle favorite failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    )
  }

  if (error || !read) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">{error || '文章未找到'}</p>
        <button
          onClick={() => navigate('/long-reads')}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
        >
          返回列表
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-rose-500 to-orange-500"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <article ref={articleRef} className="mx-auto max-w-wide py-10">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 xl:col-span-8">
            <button
              onClick={() => navigate('/long-reads')}
              className="flex items-center gap-2 text-slate-600 hover:text-rose-600 transition-colors"
            >
              <ArrowLeft size={20} />
              返回列表
            </button>

            {read.coverImage && (
              <div className="reveal-item mt-6 relative h-60 sm:h-80 lg:h-[520px] overflow-hidden rounded-3xl" data-reveal-delay="0">
                <img
                  src={read.coverImage}
                  alt={read.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-white/85">深度解读</span>
                  </div>
                  <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold tracking-tight text-white">
                    {read.title}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(read.publishTime)}</span>
                    </div>
                    <button
                      onClick={handleToggleFavorite}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        favorited ? 'bg-rose-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${favorited ? 'fill-white' : ''}`} />
                      {displayFavoriteCount.toLocaleString()} 收藏
                    </button>
                  </div>
                </div>
              </div>
            )}

            {read.author && (
              <div className="reveal-item mt-6 flex items-center gap-3 p-5 bg-gradient-to-r from-rose-50 to-orange-50 rounded-2xl" data-reveal-delay="100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white text-lg font-bold">
                  {read.author.charAt(0)}
                </div>
                <div>
                  <div className="text-xs text-slate-500">作者</div>
                  <div className="text-lg font-semibold text-slate-900">{read.author}</div>
                </div>
              </div>
            )}

            <div className="reveal-item mt-8 prose prose-lg max-w-none" data-reveal-delay="200">
              <div dangerouslySetInnerHTML={{ __html: parsed.html }} />
            </div>
          </div>

          <aside className="hidden xl:block col-span-4">
            <div className="sticky top-24 space-y-4">
              <div className="reveal-item rounded-3xl bg-card p-6 shadow-sm border border-border" data-reveal-delay="150">
                <div className="text-sm font-medium text-foreground">目录</div>
                <div className="mt-4 space-y-2">
                  {parsed.toc.length === 0 ? (
                    <div className="text-sm text-muted-foreground">暂无目录</div>
                  ) : (
                    parsed.toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={`block text-sm transition-colors hover:text-accent ${
                          item.level === 3 ? 'pl-4 text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {item.text}
                      </a>
                    ))
                  )}
                </div>
              </div>

              <div className="reveal-item rounded-3xl bg-card p-6 shadow-sm border border-border" data-reveal-delay="250">
                <div className="text-sm font-medium text-foreground">阅读提示</div>
                <div className="mt-3 text-sm text-muted-foreground">
                  滚动查看进度条，点击目录可快速跳转到对应段落。
                </div>
              </div>
            </div>
          </aside>
        </div>
      </article>
    </>
  )
}

export default LongReadDetail
