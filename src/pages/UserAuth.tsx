import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Phone, Lock, Shield } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
}

export default function UserAuth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [usePhone, setUsePhone] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [loginForm, setLoginForm] = useState({
    email: '',
    phone: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  });

  const handleSendVerification = async () => {
    if (!registerForm.email && !registerForm.phone) {
      setMessage('请先填写邮箱或手机号');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth-new/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerForm.email || undefined,
          phone: registerForm.phone || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationSent(true);
        setMessage(data.message);
      } else {
        setMessage(data.error || '发送失败');
      }
    } catch (error) {
      setMessage('发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!loginForm.email && !loginForm.phone) {
      setMessage('邮箱或手机号必填其一');
      setLoading(false);
      return;
    }

    if (!loginForm.password) {
      setMessage('密码必填');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth-new/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email || undefined,
          phone: loginForm.phone || undefined,
          password: loginForm.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user_token', data.token);
        localStorage.setItem('user_role', data.user.role);
        window.location.href = '/';
      } else {
        setMessage(data.error || '登录失败');
      }
    } catch (error) {
      setMessage('登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    if (registerForm.password.length < 6) {
      setMessage('密码长度至少6位');
      setLoading(false);
      return;
    }

    if (!registerForm.email && !registerForm.phone) {
      setMessage('邮箱或手机号必填其一');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth-new/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerForm.username,
          email: registerForm.email || undefined,
          phone: registerForm.phone || undefined,
          password: registerForm.password,
          verificationCode: registerForm.verificationCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('注册成功，请登录');
        setIsLogin(true);
      } else {
        setMessage(data.error || '注册失败');
      }
    } catch (error) {
      setMessage('注册失败');
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
              {isLogin ? (
                <LogIn className="w-6 h-6 text-accent" />
              ) : (
                <UserPlus className="w-6 h-6 text-accent" />
              )}
            </div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">
              {isLogin ? '欢迎回来' : '创建账号'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {isLogin ? '登录您的账号以继续' : '注册新账号开始您的阅读之旅'}
          </p>
        </div>

        {/* 卡片 */}
        <div className="bg-card rounded-3xl shadow-lg p-8">
          {/* 登录表单 */}
          {isLogin && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {usePhone ? '手机号' : '邮箱'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {usePhone ? (
                      <Phone className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    type={usePhone ? 'tel' : 'email'}
                    value={usePhone ? loginForm.phone : loginForm.email}
                    onChange={(e) => setLoginForm({
                      ...loginForm,
                      [usePhone ? 'phone' : 'email']: e.target.value,
                      [usePhone ? 'email' : 'phone']: ''
                    })}
                    className="w-full pl-10 pr-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-accent/50 focus:bg-secondary transition-colors text-foreground placeholder:text-muted-foreground"
                    placeholder={usePhone ? '输入手机号' : '输入邮箱'}
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
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
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

              {/* 切换登录方式 */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setUsePhone(!usePhone)}
                  className="text-sm text-accent hover:underline"
                >
                  使用{usePhone ? '邮箱' : '手机号'}登录
                </button>
              </div>
            </form>
          )}

          {/* 注册表单 */}
          {!isLogin && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-accent/50 focus:bg-secondary transition-colors text-foreground placeholder:text-muted-foreground"
                  placeholder="输入用户名"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  邮箱（可选）
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-accent/50 focus:bg-secondary transition-colors text-foreground placeholder:text-muted-foreground"
                    placeholder="输入邮箱"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  手机号（可选）
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <input
                    type="tel"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-accent/50 focus:bg-secondary transition-colors text-foreground placeholder:text-muted-foreground"
                    placeholder="输入手机号"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  密码（至少6位）
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-accent/50 focus:bg-secondary transition-colors text-foreground placeholder:text-muted-foreground"
                    placeholder="输入密码"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  确认密码
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <input
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-accent/50 focus:bg-secondary transition-colors text-foreground placeholder:text-muted-foreground"
                    placeholder="再次输入密码"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {(registerForm.email || registerForm.phone) && !verificationSent && (
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={loading}
                  className="w-full py-3 bg-secondary text-foreground rounded-xl hover:bg-secondary/70 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '发送中...' : '发送验证码'}
                </button>
              )}

              {verificationSent && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    验证码
                  </label>
                  <input
                    type="text"
                    value={registerForm.verificationCode}
                    onChange={(e) => setRegisterForm({ ...registerForm, verificationCode: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-accent/50 focus:bg-secondary transition-colors text-foreground placeholder:text-muted-foreground"
                    placeholder="输入验证码"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? '注册中...' : '注册'}
              </button>
            </form>
          )}

          {/* 切换登录/注册 */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-center text-muted-foreground">
              {isLogin ? (
                <>
                  还没有账号？
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setVerificationSent(false);
                      setMessage('');
                    }}
                    className="ml-1 text-accent hover:underline font-medium"
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号？
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setVerificationSent(false);
                      setMessage('');
                    }}
                    className="ml-1 text-accent hover:underline font-medium"
                  >
                    立即登录
                  </button>
                </>
              )}
            </p>
          </div>

          {/* 管理员登录入口 */}
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => navigate('/admin-login')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-muted text-muted-foreground rounded-xl hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Shield className="w-4 h-4" />
              管理员登录
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
