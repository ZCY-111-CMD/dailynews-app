const API_BASE_URL = '/api';

export async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // 获取token并添加到headers
  const token = localStorage.getItem('user_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('Sending request with token:', token);
  }

  const response = await fetch(url, {
    headers,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  // DELETE请求返回204，不需要解析JSON
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  dailyArticles: {
    getAll: (params?: { status?: string; category?: string; date?: string; limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.category) searchParams.set('category', params.category);
      if (params?.date) searchParams.set('date', params.date);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      
      return fetchAPI(`/daily-articles?${searchParams}`);
    },
    getAvailableDates: (params?: { status?: string; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      return fetchAPI(`/daily-articles/available-dates?${searchParams}`);
    },
    getById: (id: string) => fetchAPI(`/daily-articles/${id}`),
    create: (data: any) => fetchAPI('/daily-articles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI(`/daily-articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/daily-articles/${id}`, { method: 'DELETE' }),
    favorite: (id: string) => fetchAPI(`/daily-articles/${id}/favorite`, { 
      method: 'POST'
    }),
    getFavorites: () => fetchAPI('/daily-articles/favorites'),
  },
  
  breakingNews: {
    getLatest: (params?: { limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      return fetchAPI(`/breaking-news/latest?${searchParams}`);
    },
    getAll: (params?: { important?: boolean; limit?: number; offset?: number; date?: string; category?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.important) searchParams.set('important', 'true');
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      if (params?.date) searchParams.set('date', params.date);
      if (params?.category) searchParams.set('category', params.category);

      return fetchAPI(`/breaking-news?${searchParams}`);
    },
    getById: (id: string) => fetchAPI(`/breaking-news/${id}`),
    create: (data: any) => fetchAPI('/breaking-news', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI(`/breaking-news/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/breaking-news/${id}`, { method: 'DELETE' }),
    reorder: (items: any[]) => fetchAPI('/breaking-news/reorder', { method: 'PATCH', body: JSON.stringify({ items }) }),
    batchDelete: (ids: string[]) => fetchAPI('/breaking-news/batch', { method: 'DELETE', body: JSON.stringify({ ids }) }),
    generate: () => fetchAPI('/breaking-news/generate', { method: 'POST' }),
    getDrafts: () => fetchAPI('/breaking-news/drafts/all'),
    publishDraft: (id: string) => fetchAPI(`/breaking-news/drafts/${id}/publish`, { method: 'POST' }),
    favorite: (id: string) => fetchAPI(`/breaking-news/${id}/favorite`, { method: 'POST' }),
    unfavorite: (id: string) => fetchAPI(`/breaking-news/${id}/favorite`, { method: 'DELETE' }),
    getFavorites: (params?: { limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      return fetchAPI(`/breaking-news/favorites/list?${searchParams}`);
    },
  },
  
  longReads: {
    getAll: (params?: { status?: string; category?: string; limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.category) searchParams.set('category', params.category);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());

      return fetchAPI(`/long-reads?${searchParams}`);
    },
    getById: (id: string) => fetchAPI(`/long-reads/${id}`),
    getBySlug: (slug: string) => fetchAPI(`/long-reads/slug/${slug}`),
    create: (data: any) => fetchAPI('/long-reads', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI(`/long-reads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/long-reads/${id}`, { method: 'DELETE' }),
    favorite: (id: string) => fetchAPI(`/long-reads/${id}/favorite`, { method: 'POST' }),
    unfavorite: (id: string) => fetchAPI(`/long-reads/${id}/favorite`, { method: 'DELETE' }),
    getFavorites: (params?: { limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      return fetchAPI(`/long-reads/favorites/list?${searchParams}`);
    },
  },
  
  specialTopics: {
    getAll: (params?: { status?: string; limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());

      return fetchAPI(`/special-topics?${searchParams}`);
    },
    getById: (id: string) => fetchAPI(`/special-topics/${id}`),
    getBySlug: (slug: string) => fetchAPI(`/special-topics/slug/${slug}`),
    create: (data: any) => fetchAPI('/special-topics', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI(`/special-topics/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/special-topics/${id}`, { method: 'DELETE' }),
    favorite: (id: string) => fetchAPI(`/special-topics/${id}/favorite`, { method: 'POST' }),
    unfavorite: (id: string) => fetchAPI(`/special-topics/${id}/favorite`, { method: 'DELETE' }),
    getFavorites: (params?: { limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      return fetchAPI(`/special-topics/favorites/list?${searchParams}`);
    },
  },
  
  encyclopedia: {
    getAll: (params?: { category?: string; search?: string; limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      
      return fetchAPI(`/encyclopedia?${searchParams}`);
    },
    getById: (id: string) => fetchAPI(`/encyclopedia/${id}`),
    getBySlug: (slug: string) => fetchAPI(`/encyclopedia/slug/${slug}`),
    create: (data: any) => fetchAPI('/encyclopedia', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI(`/encyclopedia/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/encyclopedia/${id}`, { method: 'DELETE' }),
  },
  
  imageLibrary: {
    getAll: (params?: { favorite?: boolean; tag?: string; articleId?: string; limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.favorite) searchParams.set('favorite', 'true');
      if (params?.tag) searchParams.set('tag', params.tag);
      if (params?.articleId) searchParams.set('articleId', params.articleId);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      
      return fetchAPI(`/image-library?${searchParams}`);
    },
    getById: (id: string) => fetchAPI(`/image-library/${id}`),
    upload: (formData: FormData) => fetch(`${API_BASE_URL}/image-library`, { method: 'POST', body: formData }),
    update: (id: string, data: any) => fetchAPI(`/image-library/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleFavorite: (id: string) => fetchAPI(`/image-library/${id}/favorite`, { method: 'PATCH' }),
    delete: (id: string) => fetchAPI(`/image-library/${id}`, { method: 'DELETE' }),
  },
  
  deepseek: {
    generateContent: (prompt: string, type?: string) => 
      fetchAPI('/deepseek/generate-content', { 
        method: 'POST', 
        body: JSON.stringify({ prompt, type }) 
      }),
    rewrite: (content: string, style?: string) => 
      fetchAPI('/deepseek/rewrite', { 
        method: 'POST', 
        body: JSON.stringify({ content, style }) 
      }),
  },
};
