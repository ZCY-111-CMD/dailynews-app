import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, ArrowLeft } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!formData.username || !formData.password) {
      setMessage('用户名和密码必填');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth-new/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_role', data.admin.role);
        localStorage.setItem('admin_id', data.admin.id);
        localStorage.setItem('admin_username', data.admin.username);
        navigate('/admin');
      } else {
        setMessage(data.error || '登录失败');
      }
    } catch (error) {
      setMessage('登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">
              管理员登录
            </h1>
          </div>
          <p className="text-muted-foreground">
            仅授权管理员可访问后台管理系统
          </p>
        </div>

        {/* 卡片 */}
        <div className="bg-card rounded-3xl shadow-lg p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                用户名
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-accent/50 focus:bg-secondary transition-colors text-foreground placeholder:text-muted-foreground"
                  placeholder="输入管理员用户名"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-accent/50 focus:bg-secondary transition-colors text-foreground placeholder:text-muted-foreground"
                  placeholder="输入密码"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 返回用户登录 */}
          <div className="mt-6 pt-6 border-t border-border">
            <button
              onClick={() => (window.location.href = '/login')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-muted text-muted-foreground rounded-xl hover:bg-secondary hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回用户登录
            </button>
          </div>

          {/* 消息提示 */}
          {message && (
            <div className={`mt-4 p-4 rounded-xl ${
              message.includes('成功') 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
