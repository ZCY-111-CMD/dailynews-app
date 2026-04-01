import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock } from 'lucide-react';
import { api } from '../lib/api';

interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
}

interface FavoriteItem {
  id: string;
  title: string;
  content?: string;
  type: string;
  favoriteCount?: number;
  displayFavoriteCount?: number;
  publishTime?: string;
  createdAt?: string;
  favoritedAt: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    phone: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'favorites'
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (activeTab === 'favorites' && user) {
      fetchFavorites();
    }
  }, [activeTab, user]);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('user_token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch('/api/auth-new/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setFormData({
          email: data.user.email || '',
          phone: data.user.phone || ''
        });
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      setFavoritesLoading(true);
      const token = localStorage.getItem('user_token');

      // 并行获取所有类型的收藏
      const [bnRes, daRes, lrRes, stRes] = await Promise.allSettled([
        fetch('/api/breaking-news/favorites/list', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/daily-articles/favorites', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/long-reads/favorites/list', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/special-topics/favorites/list', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      ]);

      const allFavorites: FavoriteItem[] = [];

      // 实时快讯
      if (bnRes.status === 'fulfilled' && bnRes.value.data) {
        allFavorites.push(...bnRes.value.data.map((f: any) => ({ ...f, type: 'breaking' })));
      }
      // 每日精选
      if (daRes.status === 'fulfilled' && daRes.value.data) {
        allFavorites.push(...daRes.value.data.map((f: any) => ({
          id: f.articleId || f.id,
          title: f.article?.title || f.title,
          content: f.article?.content || f.content,
          displayFavoriteCount: (f.article?.virtualBaseCount || 0) + (f.article?.favoriteCount || 0),
          publishTime: f.article?.publishTime || f.publishTime,
          favoritedAt: f.createdAt,
          type: 'daily'
        })));
      }
      // 深度解读
      if (lrRes.status === 'fulfilled' && lrRes.value.data) {
        allFavorites.push(...lrRes.value.data.map((f: any) => ({ ...f, type: 'longRead' })));
      }
      // 专题栏目
      if (stRes.status === 'fulfilled' && stRes.value.data) {
        allFavorites.push(...stRes.value.data.map((f: any) => ({ ...f, type: 'specialTopic' })));
      }

      // 按收藏时间排序
      allFavorites.sort((a, b) => new Date(b.favoritedAt).getTime() - new Date(a.favoritedAt).getTime());
      setFavorites(allFavorites);
    } catch (error) {
      console.error('获取收藏列表失败:', error);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleUnfavorite = async (item: FavoriteItem) => {
    try {
      const token = localStorage.getItem('user_token');
      let url = '';
      if (item.type === 'breaking') url = `/api/breaking-news/${item.id}/favorite`;
      else if (item.type === 'daily') url = `/api/daily-articles/${item.id}/favorite`;
      else if (item.type === 'longRead') url = `/api/long-reads/${item.id}/favorite`;
      else if (item.type === 'specialTopic') url = `/api/special-topics/${item.id}/favorite`;

      if (!url) return;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setFavorites(favorites.filter(f => !(f.id === item.id && f.type === item.type)));
      }
    } catch (error) {
      console.error('取消收藏失败:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFavoriteTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}分钟前收藏`;
    }
    return `${hours}小时前收藏`;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('user_token');

      const response = await fetch('/api/auth-new/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMessage('更新成功');
        fetchUser();
      } else {
        const data = await response.json();
        setMessage(data.error || '更新失败');
      }
    } catch (error) {
      setMessage('更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage('新密码长度至少6位');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('user_token');

      const response = await fetch('/api/auth-new/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        setMessage('密码修改成功');
        setPasswordForm({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const data = await response.json();
        setMessage(data.error || '密码修改失败');
      }
    } catch (error) {
      setMessage('密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_role');
    window.location.href = '/';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">设置</h1>

        {/* 标签切换 */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            个人信息
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            我的收藏
          </button>
        </div>

        {/* 个人信息 */}
        {activeTab === 'profile' && (
          <>
            {/* 用户信息 */}
            <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">账号信息</h2>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">用户名:</span>
              <span className="font-medium">{user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">邮箱:</span>
              <span className="font-medium">{user.email || '未设置'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">手机号:</span>
              <span className="font-medium">{user.phone || '未设置'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">角色:</span>
              <span className="font-medium">{user.role === 'SUPER_ADMIN' ? '超级管理员' : user.role === 'SUB_ADMIN' ? '副管理员' : '用户'}</span>
            </div>
          </div>
        </div>

        {/* 更新联系方式 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">更新联系方式</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入邮箱"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                手机号
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入手机号"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </form>
        </div>

        {/* 修改密码 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">修改密码</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                旧密码
              </label>
              <input
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入旧密码"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新密码
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入新密码（至少6位）"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                确认新密码
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="再次输入新密码"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '修改中...' : '修改密码'}
            </button>
          </form>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            退出登录
          </button>
        </div>
          </>
        )}

          {/* 我的收藏 */}
          {activeTab === 'favorites' && (
            <div className="max-w-4xl mx-auto">
              {favoritesLoading ? (
                <div className="text-center py-12 text-gray-600">加载中...</div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <p className="text-lg mb-4">暂无收藏</p>
                  <p className="text-sm">点击文章旁的星星图标来收藏喜欢的内容</p>
                </div>
              ) : (
                <div className="space-y-4">
                {favorites.map((item, idx) => {
                  const typeLabels: Record<string, string> = {
                    breaking: '实时快讯',
                    daily: '每日精选',
                    longRead: '深度解读',
                    specialTopic: '专题栏目'
                  };
                  const typeColors: Record<string, string> = {
                    breaking: 'bg-orange-100 text-orange-700',
                    daily: 'bg-blue-100 text-blue-700',
                    longRead: 'bg-rose-100 text-rose-700',
                    specialTopic: 'bg-purple-100 text-purple-700'
                  };
                  const handleClick = () => {
                    if (item.type === 'breaking') navigate(`/breaking-news/${item.id}`);
                    else if (item.type === 'daily') navigate(`/daily?date=`);
                    else if (item.type === 'longRead') navigate(`/long-reads/${(item as any).slug}`);
                    else if (item.type === 'specialTopic') navigate(`/special-topics/${(item as any).slug}`);
                  };
                  return (
                  <div
                    key={`${item.type}-${item.id}-${idx}`}
                    className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeColors[item.type] || 'bg-gray-100 text-gray-700'}`}>
                            {typeLabels[item.type] || item.type}
                          </span>
                        </div>
                        <h3
                          className="text-lg font-semibold text-gray-800 mb-2 cursor-pointer hover:text-accent transition-colors"
                          onClick={handleClick}
                        >
                          {item.title}
                        </h3>
                        {item.content && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {item.content.replace(/<[^>]*>/g, '')}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {item.publishTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(item.publishTime)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {formatFavoriteTime(item.favoritedAt)}
                          </span>
                          {item.displayFavoriteCount !== undefined && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {item.displayFavoriteCount.toLocaleString()} 人收藏
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnfavorite(item)}
                        className="ml-4 px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        取消收藏
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 消息提示 */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg ${message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
