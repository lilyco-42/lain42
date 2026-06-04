import { useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import ConfigCard from "@/components/ConfigCard";
import { CATEGORIES } from "@/types";
import type { PostListItem, PostListPage } from "@/types";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, string> = {
  software: "💎",
  desktop: "🎨",
  "dev-env": "⚙️",
  terminal: "⬛",
  editor: "✏️",
  system: "🖥",
  "book-source": "📚",
  other: "📦",
};

export default function HomePage() {
  const { slug: categorySlug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tag = searchParams.get("tag") || undefined;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["posts", categorySlug, tag],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set("page", String(pageParam));
      params.set("per_page", "20");
      if (categorySlug) params.set("category", categorySlug);
      if (tag) params.set("tag", tag);
      return api.get<PostListPage>(`/posts?${params}`);
    },
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1;
      return nextPage * lastPage.per_page < lastPage.total ? nextPage : undefined;
    },
    initialPageParam: 1,
  });

  const observer = useRef<IntersectionObserver | null>(null);
  const lastCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const allPosts: PostListItem[] = data?.pages.flatMap((p) => p.items) ?? [];
  const isAll = !categorySlug && !tag;
  const isFirstPage = !data || data.pages[0]?.page === 1;

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        {/* ── Hero header ── */}
        {isAll && isFirstPage && (
          <div className="py-8 md:py-12 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2">
              发现 & 分享<span className="text-primary">配置</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              Arch ricing · Windows 美化 · 开发环境 · 终端 · 编辑器 · 书源
            </p>
          </div>
        )}

        {/* ── Category pills (Pinterest style) ── */}
        <div className="flex items-center gap-2 pb-4 overflow-x-auto scrollbar-none -mx-1 px-1">
          <Button
            variant={isAll ? "default" : "secondary"}
            size="sm"
            onClick={() => navigate("/")}
            className={cn(
              "rounded-full px-4 text-xs font-medium shrink-0 h-8",
              isAll ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-3 w-3 mr-1.5" />
            全部
          </Button>
          {Object.entries(CATEGORIES).map(([key, label]) => {
            const active = categorySlug === key;
            return (
              <Button
                key={key}
                variant={active ? "default" : "secondary"}
                size="sm"
                onClick={() => { navigate(`/category/${key}`); }}
                className={cn(
                  "rounded-full px-4 text-xs font-medium shrink-0 h-8 transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                )}
              >
                <span className="mr-1">{CATEGORY_ICONS[key] || ""}</span>
                {label}
              </Button>
            );
          })}
        </div>

        {/* ── Active filter badge ── */}
        {tag && (
          <div className="pb-4 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">标签筛选:</span>
            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-0.5 text-xs font-medium">
              #{tag}
              <button onClick={() => navigate("/")} className="ml-1 hover:text-primary/70">&times;</button>
            </span>
          </div>
        )}

        {/* ── Content ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">加载配置中...</span>
          </div>
        ) : allPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">暂无配置分享</p>
            <Button size="sm" onClick={() => navigate("/publish")} className="rounded-xl mt-1">
              发布第一个配置
            </Button>
          </div>
        ) : (
          <>
            {/* Grid info */}
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs text-muted-foreground">
                {allPosts.length} 个配置
              </span>
            </div>

            {/* Masonry grid */}
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4">
              {allPosts.map((post, index) => (
                <div
                  key={post.id}
                  ref={index === allPosts.length - 8 ? lastCardRef : undefined}
                >
                  <ConfigCard post={post} />
                </div>
              ))}
            </div>
          </>
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-16" />
      </div>
    </Layout>
  );
}
