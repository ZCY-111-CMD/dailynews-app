import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './components/ui/dialog'
import { Button } from './components/ui/button'
import Header from './components/Header'
import Home from './pages/Home'
import DailyArticles from './pages/DailyArticles'
import BreakingNews from './pages/BreakingNews'
import BreakingNewsDetail from './pages/BreakingNewsDetail'
import LongReads from './pages/LongReads'
import SpecialTopics from './pages/SpecialTopics'
import LongReadDetail from './pages/LongReadDetail'
import SpecialTopicDetail from './pages/SpecialTopicDetail'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import UserAuth from './pages/UserAuth'
import AdminLogin from './pages/AdminLogin'
import PastSelections from './pages/PastSelections'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('daily')
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [hasShownPrompt, setHasShownPrompt] = useState(false)

  // 浏览10秒后弹出登录提示
  useEffect(() => {
    console.log('App: 检查登录提示条件', {
      pathname: location.pathname,
      hasShownPrompt,
      userToken: localStorage.getItem('user_token')
    });

    const userToken = localStorage.getItem('user_token')

    // 已登录或管理后台或登录页面不需要弹出提示
    if (userToken ||
        location.pathname === '/admin' ||
        location.pathname === '/admin-login' ||
        location.pathname === '/login') {
      console.log('App: 跳过登录提示');
      return
    }

    // 如果已经弹出过，不再弹出
    if (hasShownPrompt) {
      console.log('App: 已显示过提示，跳过');
      return
    }

    console.log('App: 10秒后将显示登录提示');
    const timer = setTimeout(() => {
      console.log('App: 显示登录提示弹窗');
      setShowLoginPrompt(true)
      setHasShownPrompt(true)
    }, 10000) // 10秒

    return () => clearTimeout(timer)
  }, [location.pathname, hasShownPrompt])

  useEffect(() => {
    const path = location.pathname
    const adminToken = localStorage.getItem('admin_token')

    // 管理后台路由
    if (path === '/admin') {
      if (!adminToken) {
        navigate('/admin-login', { replace: true })
      }
      return
    }

    if (path === '/admin-login') {
      return
    }

    if (path === '/login') {
      return
    }

    // 设置页面路由
    if (path === '/settings') {
      const userToken = localStorage.getItem('user_token')
      if (!userToken) {
        navigate('/login', { replace: true })
      } else {
        setActiveTab('settings')
      }
      return
    }

    // 其他路由
    if (path === '/' || path === '/home') {
      setActiveTab('home')
    } else if (path === '/daily') {
      setActiveTab('daily')
    } else if (path === '/breaking') {
      setActiveTab('breaking')
    } else if (path === '/long-reads') {
      setActiveTab('long')
    } else if (path === '/special-topics') {
      setActiveTab('topics')
    }
  }, [location.pathname, navigate])

  const renderContent = () => {
    const path = location.pathname

    if (path === '/admin') {
      return <Admin />
    }

    if (path === '/admin-login') {
      return <AdminLogin />
    }

    if (path === '/login') {
      return <UserAuth />
    }

    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/daily" element={<DailyArticles />} />
        <Route path="/breaking" element={<BreakingNews />} />
        <Route path="/breaking-news/:id" element={<BreakingNewsDetail />} />
        <Route path="/long-reads" element={<LongReads />} />
        <Route path="/long-reads/:slug" element={<LongReadDetail />} />
        <Route path="/special-topics" element={<SpecialTopics />} />
        <Route path="/special-topics/:slug" element={<SpecialTopicDetail />} />
        <Route path="/past-selections" element={<PastSelections />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Home />} />
      </Routes>
    )
  }

  const isRouteAdmin = location.pathname === '/admin' || location.pathname === '/admin-login'
  const isRouteAuth = location.pathname === '/login'
  const isDetailPage = location.pathname.includes('/long-reads/') || location.pathname.includes('/special-topics/')
  const isHomeRoute = location.pathname === '/' || location.pathname === '/home'

  return (
    <div className="min-h-screen bg-background">
      {!isRouteAdmin && !isDetailPage && (
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          variant={isHomeRoute ? 'overlay' : 'default'}
        />
      )}
      <main className="mx-auto w-full max-w-wide px-4 sm:px-6 lg:px-8 xl:px-10">
        {renderContent()}
      </main>

      {/* 登录提示弹窗 */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
              欢迎来到 DailyNews
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              注册登录即可收藏文章、管理阅读列表，享受个性化新闻推荐
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                <span className="text-sm text-slate-700">收藏感兴趣的文章</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                <span className="text-sm text-slate-700">管理个人阅读列表</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                <span className="text-sm text-slate-700">获取个性化新闻推荐</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLoginPrompt(false)}
              className="w-full sm:w-auto"
            >
              稍后再说
            </Button>
            <Button
              onClick={() => {
                setShowLoginPrompt(false)
                navigate('/login')
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600"
            >
              立即注册/登录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
