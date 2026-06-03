export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export interface AuthorBrief {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export interface PostListItem {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  category: string;
  tags: string[];
  author: AuthorBrief;
  likes_count: number;
  created_at: string;
}

export interface ImageItem {
  id: string;
  url_original: string;
  url_600: string;
  url_300: string;
}

export interface PostDetail {
  id: string;
  title: string;
  description: string;
  content: string;
  cover_image: string;
  config_files: { path: string; content: string; language: string }[];
  category: string;
  tags: string[];
  author: AuthorBrief;
  images: ImageItem[];
  likes_count: number;
  created_at: string;
  updated_at: string;
  is_liked: boolean;
}

export interface PostListPage {
  items: PostListItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  is_subscribed: boolean;
  post_count: number;
  created_at: string;
}

export const CATEGORIES: Record<string, string> = {
  software: "开源/小众软件",
  desktop: "桌面美化/Ricing",
  "dev-env": "开发环境",
  terminal: "终端配置",
  editor: "编辑器配置",
  system: "系统配置",
  "book-source": "书源/阅读源",
  other: "其他",
};
