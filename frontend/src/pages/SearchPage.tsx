import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import ConfigCard from "@/components/ConfigCard";
import { Loader2 } from "lucide-react";
import type { PostListPage, PostListItem } from "@/types";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["search", q],
      queryFn: async ({ pageParam = 1 }) =>
        api.get<PostListPage>(`/search?q=${encodeURIComponent(q)}&page=${pageParam}`),
      getNextPageParam: (last) =>
        (last.page + 1) * last.per_page < last.total ? last.page + 1 : undefined,
      initialPageParam: 1,
      enabled: !!q,
    });

  const posts: PostListItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">搜索结果: "{q}"</h1>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">没有找到相关配置</div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
            {posts.map((post) => (
              <ConfigCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
