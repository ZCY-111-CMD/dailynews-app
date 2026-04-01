import { useEffect } from 'react'

export function useScrollReveal(containerRef: React.RefObject<HTMLElement | null>, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const container = containerRef.current
    if (!container) return

    const items = container.querySelectorAll('.reveal-item')
    if (items.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = el.dataset.revealDelay || '0'
            setTimeout(() => el.classList.add('revealed'), parseInt(delay))
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    )

    items.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [containerRef, enabled])
}
