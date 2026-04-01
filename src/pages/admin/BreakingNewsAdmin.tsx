import { useState, useEffect } from 'react';
import { BreakingNews } from '../../types';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit,
  RefreshCw,
  FileText,
  Sparkles,
} from 'lucide-react';

const BreakingNewsAdmin = () => {
  const [news, setNews] = useState<BreakingNews[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<BreakingNews | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    category: '全球焦点' as string,
    sourceUrl: '',
  });
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    loadNews();
  }, [selectedDate]);

  const loadNews = async () => {
    try {
      setLoading(true);
      const response: any = await api.breakingNews.getAll({
        date: selectedDate,
        limit: 50,
      });
      setNews(response.data || []);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === news.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(news.map((item) => item.id));
    }
  };

  const handleDelete = async () => {
    try {
      if (selectedIds.length === 1) {
        await api.breakingNews.delete(selectedIds[0]);
      } else {
        await api.breakingNews.batchDelete(selectedIds);
      }
      setDeleteDialogOpen(false);
      setSelectedIds([]);
      loadNews();
    } catch (error) {
      console.error('Failed to delete news:', error);
      alert('删除失败');
    }
  };

  const handleEdit = (item: BreakingNews) => {
    setSelectedNews(item);
    setEditForm({
      title: item.title,
      content: item.content,
      category: item.category || '全球焦点',
      sourceUrl: item.sourceUrl || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (!selectedNews) return;

      await api.breakingNews.update(selectedNews.id, editForm);
      setEditDialogOpen(false);
      setSelectedNews(null);
      loadNews();
    } catch (error) {
      console.error('Failed to update news:', error);
      alert('更新失败');
    }
  };

  const handleAddToArticleDraft = async (item: BreakingNews) => {
    try {
      // 创建文章草稿
      await api.dailyArticles.create({
        title: item.title,
        content: item.content,
        summary: item.content.substring(0, 200),
        publishTime: new Date().toISOString(),
        category: 'OTHER',
        images: [],
        favoriteCount: 0,
      });

      // 删除快讯
      await api.breakingNews.delete(item.id);

      alert('已加入到文章草稿，该快讯已移除');
      loadNews();
    } catch (error) {
      console.error('Failed to add to article draft:', error);
      alert('操作失败');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newOrder = [...news];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];

    const items = newOrder.map((item, idx) => ({
      id: item.id,
      sortOrder: idx,
    }));

    try {
      await api.breakingNews.reorder(items);
      loadNews();
    } catch (error) {
      console.error('Failed to reorder:', error);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === news.length - 1) return;

    const newOrder = [...news];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

    const items = newOrder.map((item, idx) => ({
      id: item.id,
      sortOrder: idx,
    }));

    try {
      await api.breakingNews.reorder(items);
      loadNews();
    } catch (error) {
      console.error('Failed to reorder:', error);
    }
  };

  const handleAIGenerate = async () => {
    if (!confirm('确定要使用AI生成今日快讯吗?这可能需要1-2分钟。')) return;

    try {
      setLoading(true);
      const response = await fetch('/api/breaking-news/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok) {
        alert(`生成成功! 共${data.count}条新快讯,今日总共${data.total}条`);
        loadNews();
      } else {
        alert(`生成失败: ${data.error}`);
      }
    } catch (error) {
      console.error('AI生成失败:', error);
      alert('AI生成失败,请检查网络和API密钥');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">实时快讯管理</h1>
          <p className="text-slate-600 mt-1">管理和编辑AI生成的实时快讯</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAIGenerate}
            disabled={loading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI生成
          </Button>
          <Button
            variant="outline"
            onClick={loadNews}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label>选择日期</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>快讯列表 ({news.length})</CardTitle>
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除选中 ({selectedIds.length})
              </Button>
            )}
          </div>
        </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                </div>
              ) : news.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  暂无快讯，点击上方按钮AI生成
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 py-2 border-b">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === news.length && news.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">全选</span>
                  </div>
                  {news.map((item, index) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        selectedIds.includes(item.id)
                          ? 'bg-rose-50 border-rose-200'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelect(item.id)}
                          className="w-4 h-4 mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {item.category && (
                              <Badge variant="secondary">{item.category}</Badge>
                            )}
                            <Badge variant="outline">{formatDate(item.publishTime)}</Badge>
                            {item.source && (
                              <Badge variant="outline">{item.source}</Badge>
                            )}
                          </div>
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-sm text-slate-600">{item.content}</p>
                          {item.sourceUrl && (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              查看来源
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === news.length - 1}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddToArticleDraft(item)}
                            title="加入到文章草稿"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.length} 条快讯吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑快讯</DialogTitle>
            <DialogDescription>修改快讯的标题、内容和属性</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="content">内容</Label>
              <Textarea
                id="content"
                value={editForm.content}
                onChange={(e) =>
                  setEditForm({ ...editForm, content: e.target.value })
                }
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="category">领域分类</Label>
              <select
                id="category"
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="全球焦点">全球焦点</option>
                <option value="全球城市">全球城市</option>
                <option value="自然与环境">自然与环境</option>
                <option value="科技前沿">科技前沿</option>
                <option value="体育赛事">体育赛事</option>
                <option value="财经资讯">财经资讯</option>
                <option value="文化社会">文化社会</option>
              </select>
            </div>
            <div>
              <Label htmlFor="sourceUrl">来源链接</Label>
              <Input
                id="sourceUrl"
                value={editForm.sourceUrl}
                onChange={(e) =>
                  setEditForm({ ...editForm, sourceUrl: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedNews(null);
              }}
            >
              取消
            </Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BreakingNewsAdmin;
