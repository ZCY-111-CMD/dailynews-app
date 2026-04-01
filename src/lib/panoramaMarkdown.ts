import { marked } from 'marked'

marked.use({
  gfm: true,
  breaks: true,
})

export type PanoramaTocItem = { id: string; text: string; level: number }

/**
 * Typora 中若把「原始 HTML」放在 ``` 围栏内，Markdown 会渲染成代码块而非 DOM。
 * 对已知的全景组件 class 自动拆围栏，便于正确走 HTML 管道。
 */
export function unwrapBriefHtmlCodeFences(markdown: string): string {
  const re = /^```[ \t]*(?:[^\r\n]*)[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm
  return markdown.replace(re, (full, body: string) => {
    const t = body.trim()
    if (!t.startsWith('<')) return full
    const low = t.toLowerCase()
    if (!low.includes('brief-timeline') && !low.includes('brief-h2-outline')) return full
    return `\n\n${t}\n\n`
  })
}

export function slugifyHeading(input: string): string {
  const base = (input || '')
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'section'
}

function sanitizeArticleDom(doc: Document) {
  const blockedTags = ['script', 'iframe', 'object', 'embed', 'link', 'style', 'meta']
  blockedTags.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove())
  })

  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
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

      if (
        (name === 'href' || name === 'src' || name === 'xlink:href') &&
        value.trim().toLowerCase().startsWith('javascript:')
      ) {
        el.removeAttribute(attr.name)
      }
    })
  })
}

/** 全宽图：在 Markdown 里写 ![](url "fullbleed") */
function applyPanoramaFigureTransforms(doc: Document) {
  doc.querySelectorAll('img[title="fullbleed"]').forEach((img) => {
    img.removeAttribute('title')
    const fig = doc.createElement('figure')
    fig.className = 'panorama-fullbleed'
    const parent = img.parentElement
    if (parent?.tagName === 'P' && parent.childElementCount === 1) {
      parent.replaceWith(fig)
      fig.appendChild(img)
    } else if (parent) {
      parent.insertBefore(fig, img)
      fig.appendChild(img)
    }
  })

  doc.querySelectorAll('blockquote').forEach((bq) => {
    bq.classList.add('panorama-pullquote', 'brief-quote')
  })
}

/**
 * 将正文拆成「卡片模块」：首个 ## 前的内容为导语卡片；每个 ## 开启新卡片；全宽图与时间轴保持独立通栏
 */
function wrapBriefModules(doc: Document) {
  const body = doc.body
  const nodes = Array.from(body.children)
  if (nodes.length === 0) return

  const out: HTMLElement[] = []
  let cur: HTMLElement | null = null

  const closeCur = () => {
    if (cur && cur.childElementCount > 0) out.push(cur)
    cur = null
  }

  for (const el of nodes) {
    if (el.classList.contains('panorama-fullbleed')) {
      closeCur()
      out.push(el as HTMLElement)
      continue
    }
    if (el.classList.contains('brief-timeline')) {
      closeCur()
      out.push(el as HTMLElement)
      continue
    }
    if (el.tagName === 'H2') {
      closeCur()
      cur = doc.createElement('section')
      cur.className = 'brief-module'
      cur.appendChild(el)
    } else {
      if (!cur) {
        cur = doc.createElement('section')
        cur.className = 'brief-module brief-module--lead'
      }
      cur.appendChild(el)
    }
  }
  closeCur()

  body.replaceChildren(...out)
}

function assignHeadingIdsAndToc(doc: Document): PanoramaTocItem[] {
  const toc: PanoramaTocItem[] = []
  const used = new Map<string, number>()
  doc.querySelectorAll('h2, h3, h4').forEach((node) => {
    const text = (node.textContent || '').trim()
    if (!text) return
    let id = slugifyHeading(text)
    const count = used.get(id) || 0
    used.set(id, count + 1)
    if (count > 0) id = `${id}-${count + 1}`
    node.setAttribute('id', id)
    const level = node.tagName === 'H2' ? 2 : node.tagName === 'H3' ? 3 : 4
    toc.push({ id, text, level })
  })
  return toc
}

export function parseLegacyArticleHtml(dirty: string): { html: string; toc: PanoramaTocItem[] } {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(dirty || '', 'text/html')
    sanitizeArticleDom(doc)
    applyPanoramaFigureTransforms(doc)
    const toc = assignHeadingIdsAndToc(doc)
    wrapBriefModules(doc)
    return { html: doc.body.innerHTML, toc }
  } catch {
    return { html: '', toc: [] }
  }
}

export function parsePanoramaMarkdown(markdown: string): { html: string; toc: PanoramaTocItem[] } {
  try {
    const md = unwrapBriefHtmlCodeFences(markdown || '')
    const raw = marked.parse(md, { async: false }) as string
    const parser = new DOMParser()
    const doc = parser.parseFromString(raw, 'text/html')
    sanitizeArticleDom(doc)
    applyPanoramaFigureTransforms(doc)
    const toc = assignHeadingIdsAndToc(doc)
    wrapBriefModules(doc)
    return { html: doc.body.innerHTML, toc }
  } catch {
    return { html: '', toc: [] }
  }
}

export function resolvePanoramaSource(contentMarkdown?: string | null, contentHtml?: string | null) {
  const md = (contentMarkdown || '').trim()
  if (md.length > 0) return { mode: 'markdown' as const, markdown: md }
  return { mode: 'html' as const, html: contentHtml || '' }
}
