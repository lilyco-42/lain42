import { useRef, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import ConfigCard from "@/components/ConfigCard";
import { CATEGORIES } from "@/types";
import type { PostListItem, PostListPage } from "@/types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { slug: categorySlug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
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

  const currentTab = categorySlug || "all";

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 py-4">
        {/* Category Tabs */}
        <Tabs value={currentTab} className="mb-6">
          <ScrollArea>
            <TabsList className="h-9">
              <TabsTrigger value="all" onClick={() => { window.location.href = "/"; }}>
                全部
              </TabsTrigger>
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  onClick={() => { window.location.href = `/category/${key}`; }}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Tabs>

        {tag && (
          <div className="mb-4 text-sm text-muted-foreground">
            标签: <span className="font-medium text-foreground">{tag}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : allPosts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            暂无配置分享，去<a href="/publish" className="text-primary underline mx-1">发布</a>第一个吧
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4">
            {allPosts.map((post, index) => (
              <div
                key={post.id}
                ref={index === allPosts.length - 5 ? lastCardRef : undefined}
              >
                <ConfigCard post={post} />
              </div>
            ))}
          </div>
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
    </Layout>
  );
}
