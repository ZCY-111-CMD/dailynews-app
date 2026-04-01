import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X } from 'lucide-react';

interface AdminUser {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: 'SUPER_ADMIN' | 'SUB_ADMIN';
  createdBy?: string;
  createdAt: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [message, setMessage] = useState('');

  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    avatar: '',
    role: 'SUB_ADMIN'
  });

  const [editForm, setEditForm] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    avatar: '',
    role: 'SUB_ADMIN'
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // 每次使用时重新获取,避免过期
  const getCurrentAdminId = () => localStorage.getItem('admin_id');
  const getCurrentAdminRole = () => localStorage.getItem('admin_role');

  useEffect(() => {
    checkAuth();
    fetchAdmins();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin-login';
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin-users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const json = await response.json();
        setAdmins(json.data || json || []);
      } else if (response.status === 403) {
        navigate('/admin-login');
      }
    } catch (error) {
      console.error('获取管理员列表失败:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (createForm.password.length < 6) {
      setMessage('密码长度至少6位');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        setMessage('创建成功');
        setShowCreateModal(false);
        setCreateForm({ username: '', password: '', email: '', phone: '', avatar: '', role: 'SUB_ADMIN' });
        fetchAdmins();
      } else {
        const data = await response.json();
        setMessage(data.error || '创建失败');
      }
    } catch (error) {
      setMessage('创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (editForm.password && editForm.password.length < 6) {
      setMessage('密码长度至少6位');
      setLoading(false);
      return;
    }

    const currentAdminId = getCurrentAdminId();
    const currentAdminRole = getCurrentAdminRole();
    const isCurrentUser = selectedAdmin?.id === currentAdminId;
    const isEditingSelf = localStorage.getItem('editing_current_user') === 'true';

    console.log('处理更新请求:', {
      selectedId: selectedAdmin?.id,
      currentAdminId,
      isCurrentUser,
      currentAdminRole,
      isEditingSelf
    });

    try {
      const token = localStorage.getItem('admin_token');

      // 构建更新数据
      const updateData: any = {
        username: editForm.username,
        email: editForm.email,
        phone: editForm.phone,
        avatar: editForm.avatar,
      };

      // 只有输入密码时才更新密码
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      // 只有不是编辑自己或自己是超级管理员时才能修改角色
      if (!isEditingSelf && currentAdminRole === 'SUPER_ADMIN') {
        updateData.role = editForm.role;
      }

      const response = await fetch(`/api/admin-users/${selectedAdmin?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        setMessage('更新成功');
        setShowEditModal(false);
        setSelectedAdmin(null);
        setAvatarPreview(null);
        fetchAdmins();
      } else {
        const data = await response.json();
        console.error('更新失败:', data);
        setMessage(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新失败:', error);
      setMessage('更新失败');
    } finally {
      setLoading(false);
      localStorage.removeItem('editing_current_user');
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`确定要删除管理员 ${username} 吗？`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin-users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage('删除成功');
        fetchAdmins();
      } else {
        const data = await response.json();
        setMessage(data.error || '删除失败');
      }
    } catch (error) {
      setMessage('删除失败');
    }
  };

  const openEditModal = (admin: AdminUser) => {
    const currentAdminId = getCurrentAdminId();
    const isCurrentUser = admin.id === currentAdminId;

    console.log('打开编辑模态框:', { adminId: admin.id, currentAdminId, isCurrentUser });

    setSelectedAdmin(admin);
    setEditForm({
      username: admin.username,
      password: '',
      email: admin.email || '',
      phone: admin.phone || '',
      avatar: admin.avatar || '',
      role: admin.role
    });
    setAvatarPreview(admin.avatar || null);

    // 存储是否是当前用户
    localStorage.setItem('editing_current_user', isCurrentUser ? 'true' : 'false');

    setShowEditModal(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setMessage('请上传图片文件');
      return;
    }

    // 验证文件大小(5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('图片大小不能超过5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/avatar-upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.url || data.path;
        console.log('头像上传成功,URL:', imageUrl);
        setEditForm({ ...editForm, avatar: imageUrl });
        setAvatarPreview(imageUrl);
        setMessage('头像上传成功');
      } else {
        const errorData = await response.json();
        console.error('头像上传失败:', errorData);
        setMessage('头像上传失败: ' + (errorData.error || '未知错误'));
      }
    } catch (error) {
      console.error('头像上传失败:', error);
      setMessage('头像上传失败');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">管理员管理</h1>
          {getCurrentAdminRole() === 'SUPER_ADMIN' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              添加管理员
            </button>
          )}
        </div>

        {/* 管理员列表 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建者</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {admin.avatar ? (
                        <img src={admin.avatar} alt={admin.username} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {admin.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">{admin.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {admin.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {admin.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      admin.role === 'SUPER_ADMIN'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {admin.role === 'SUPER_ADMIN' ? '超级管理员' : '副管理员'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {admin.createdBy || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(admin.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => openEditModal(admin)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      编辑
                    </button>
                    {getCurrentAdminRole() === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleDelete(admin.id, admin.username)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 创建管理员模态框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">添加管理员</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                  <input
                    type="text"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码（至少6位）</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="SUB_ADMIN">副管理员</option>
                    <option value="SUPER_ADMIN">超级管理员</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">头像</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  {createForm.avatar && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={createForm.avatar} alt="头像预览" className="w-16 h-16 rounded-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, avatar: '' })}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? '创建中...' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 编辑管理员模态框 */}
        {showEditModal && selectedAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">编辑管理员</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新密码（留空则不修改）</label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                {/* 只有超级管理员且不是编辑自己时才显示角色选择 */}
                {getCurrentAdminRole() === 'SUPER_ADMIN' && selectedAdmin.id !== getCurrentAdminId() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="SUB_ADMIN">副管理员</option>
                      <option value="SUPER_ADMIN">超级管理员</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">头像</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  {avatarPreview && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={avatarPreview} alt="头像预览" className="w-16 h-16 rounded-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, avatar: '' });
                          setAvatarPreview(null);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? '更新中...' : '更新'}
                  </button>
                </div>
              </form>
            </div>
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
