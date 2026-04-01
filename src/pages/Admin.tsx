import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { LogOut, LayoutDashboard } from 'lucide-react'
import DailyArticlesAdmin from './admin/DailyArticlesAdmin'
import BreakingNewsAdmin from './admin/BreakingNewsAdmin'
import ImageLibraryAdmin from './admin/ImageLibraryAdmin'
import AdminUsers from './admin/AdminUsers'
import LongReadsAdmin from './admin/LongReadsAdmin'
import SpecialTopicsAdmin from './admin/SpecialTopicsAdmin'

const Admin = () => {
  const [adminRole, setAdminRole] = useState<string>('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const role = localStorage.getItem('admin_role')
    if (!token) {
      window.location.href = '/admin-login'
    } else {
      setAdminRole(role || '')
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_role')
    window.location.href = '/admin-login'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
                <LayoutDashboard className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">管理后台</h1>
                <p className="text-xs text-muted-foreground">
                  {adminRole === 'SUPER_ADMIN' ? '超级管理员' : '副管理员'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="container mx-auto px-4 lg:px-6 xl:px-8 py-8">
        <Tabs defaultValue="articles" className="w-full">
          <TabsList className="bg-card border border-border rounded-2xl p-1 w-full mb-8">
            <TabsTrigger 
              value="articles"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-xl"
            >
              每日精选
            </TabsTrigger>
            <TabsTrigger 
              value="breaking"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-xl"
            >
              实时快讯
            </TabsTrigger>
            <TabsTrigger 
              value="long-reads"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-xl"
            >
              深度解读
            </TabsTrigger>
            <TabsTrigger 
              value="topics"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-xl"
            >
              专题栏目
            </TabsTrigger>
            <TabsTrigger 
              value="images"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-xl"
            >
              图片库
            </TabsTrigger>
            {adminRole === 'SUPER_ADMIN' && (
              <TabsTrigger 
                value="admins"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-xl"
              >
                管理员
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="articles">
            <DailyArticlesAdmin />
          </TabsContent>

          <TabsContent value="breaking">
            <BreakingNewsAdmin />
          </TabsContent>

          <TabsContent value="long-reads">
            <LongReadsAdmin />
          </TabsContent>

          <TabsContent value="topics">
            <SpecialTopicsAdmin />
          </TabsContent>

          <TabsContent value="images">
            <ImageLibraryAdmin />
          </TabsContent>

          {adminRole === 'SUPER_ADMIN' && (
            <TabsContent value="admins">
              <AdminUsers />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

export default Admin
