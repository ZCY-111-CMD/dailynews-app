import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import { useIsMobile } from '../hooks/use-mobile'

interface HeaderProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  variant?: 'default' | 'overlay'
}

const navItems = [
  { label: '首页', id: 'home', href: '/' },
  { label: '每日精选', id: 'daily', href: '/daily' },
  { label: '实时快讯', id: 'breaking', href: '/breaking' },
  { label: '深度解读', id: 'long', href: '/long-reads' },
  { label: '专题栏目', id: 'topics', href: '/special-topics' },
  { label: '个人中心', id: 'settings', href: '/settings' },
]

const Header = ({ activeTab, setActiveTab, variant = 'default' }: HeaderProps) => {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isMobile = useIsMobile()
  const userToken = localStorage.getItem('user_token')
  const [isSolid, setIsSolid] = useState(variant !== 'overlay')

  useEffect(() => {
    if (variant !== 'overlay') return
    const onScroll = () => {
      setIsSolid(window.scrollY > Math.max(80, window.innerHeight * 0.55))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [variant])

  const handleTabClick = (tabId: string, href: string) => {
    console.log('Header: 点击标签页', tabId)

    // 个人中心需要登录
    if (tabId === 'settings' && !userToken) {
      console.log('Header: 跳转到登录页')
      navigate('/login')
      setIsMenuOpen(false)
      return
    }

    console.log('Header: 跳转到路径', href)
    navigate(href)
    setIsMenuOpen(false)
  }

  return (
    <header
      className={
        variant === 'overlay'
          ? `fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isSolid ? 'bg-background/80 backdrop-blur-xl border-b border-border' : 'bg-transparent'}`
          : 'sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border'
      }
    >
      <div
        className={
          variant === 'overlay'
            ? 'w-full px-6 lg:px-14 xl:px-16'
            : 'mx-auto w-full max-w-wide px-4 sm:px-6 lg:px-8 xl:px-10'
        }
      >
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo - v0格式 */}
          <a
            href="/"
            className="flex items-center gap-2"
            onClick={(e) => {
              e.preventDefault()
              handleTabClick('home', '/')
            }}
          >
            <span
              className={
                variant === 'overlay' && !isSolid
                  ? 'text-3xl lg:text-4xl tracking-wide text-white'
                  : 'text-3xl lg:text-4xl tracking-wide text-foreground'
              }
              style={{ fontFamily: "'Noto Serif SC', 'SimSun', '宋体', 'STSong', serif" }}
            >
              远望
            </span>
            <span
              className={
                variant === 'overlay' && !isSolid
                  ? 'text-lg lg:text-base text-white/80 self-end mb-0.5'
                  : 'text-lg lg:text-base text-muted-foreground self-end mb-0.5'
              }
              style={{ fontFamily: "'Baskerville', 'Baskerville Old Face', 'Garamond', 'Georgia', serif" }}
            >
              briefs.icu
            </span>
          </a>

          {/* 桌面端导航 - 移到右侧 */}
          <nav className="hidden lg:flex items-center gap-10 xl:gap-14">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id, item.href)}
                className={
                  variant === 'overlay' && !isSolid
                    ? `text-base font-semibold transition-colors ${
                        activeTab === item.id ? 'text-white' : 'text-white/85 hover:text-white'
                      }`
                    : `text-base font-semibold transition-colors ${
                        activeTab === item.id ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
                      }`
                }
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* 只保留移动端菜单按钮 */}
          <button
            className={
              variant === 'overlay' && !isSolid
                ? 'lg:hidden w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur'
                : 'lg:hidden w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors'
            }
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? '关闭菜单' : '打开菜单'}
          >
            {isMenuOpen ? (
              <X className={variant === 'overlay' && !isSolid ? 'w-5 h-5 text-white' : 'w-5 h-5 text-foreground'} />
            ) : (
              <Menu className={variant === 'overlay' && !isSolid ? 'w-5 h-5 text-white' : 'w-5 h-5 text-foreground'} />
            )}
          </button>
        </div>

        {/* 移动端菜单 */}
        {isMenuOpen && (
          <nav
            className={
              variant === 'overlay' && !isSolid
                ? 'lg:hidden py-4 border-t border-white/15 bg-background/80 backdrop-blur-xl'
                : 'lg:hidden py-4 border-t border-border'
            }
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id, item.href)}
                  className={`px-4 py-3 text-left rounded-xl transition-colors ${
                    activeTab === item.id
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header
