export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum Category {
  POLITICS = 'POLITICS',
  TECHNOLOGY = 'TECHNOLOGY',
  ECONOMY = 'ECONOMY',
  CULTURE = 'CULTURE',
  SPORTS = 'SPORTS',
  SCIENCE = 'SCIENCE',
  ENVIRONMENT = 'ENVIRONMENT',
  WORLD = 'WORLD',
  OTHER = 'OTHER',
}

export interface DailyArticle {
  id: string;
  title: string;
  content: string;
  summary?: string;
  publishTime: string;
  category: Category;
  views: number;
  photographer?: string;
  author?: string;
  featuredImage?: string;
  images: string[];
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BreakingNews {
  id: string;
  title: string;
  content: string;
  publishTime: string;
  sourceUrl?: string;
  category: string;
  sortOrder?: number;
  favoriteCount?: number; // 真实收藏数
  virtualBaseCount?: number; // 虚拟收藏基数
  displayFavoriteCount?: number; // 显示收藏数 = virtualBaseCount + favoriteCount
  source?: string;
  createdAt: string;
  updatedAt: string;
  favoritedAt?: string;
}

export interface BreakingNewsDraft {
  id: string;
  newsId?: string;
  title: string;
  content: string;
  publishTime: string;
  sourceUrl?: string;
  isImportant: boolean;
  sortOrder?: number;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LongRead {
  id: string;
  title: string;
  slug: string;
  content: string;
  coverImage?: string;
  category: Category;
  publishTime: string;
  views: number;
  author?: string;
  timelineEvents?: any;
  relatedArticles: string[];
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialTopic {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage?: string;
  content: string;
  author?: string;
  articles: string[];
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EncyclopediaEntry {
  id: string;
  name: string;
  slug: string;
  summary: string;
  content: string;
  coverImage?: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface ImageLibrary {
  id: string;
  originalUrl?: string;
  localPath: string;
  thumbnailPath?: string;
  caption?: string;
  photographer?: string;
  source?: string;
  tags: string[];
  isFavorite: boolean;
  articleId?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
}
