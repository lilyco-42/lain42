import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Heart, Bookmark, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useAuthStore } from "@/stores/auth";
import type { PostDetail } from "@/types";
import { CATEGORIES } from "@/types";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const p = await api.get<PostDetail>(`/posts/${id}`);
      setLiked(p.is_liked);
      setLikesCount(p.likes_count);
      return p;
    },
    enabled: !!id,
  });

  const handleLike = async () => {
    if (!isAuthenticated) return;
    const res = await api.post<{ liked: boolean; likes_count: number }>(`/posts/${id}/like`);
    setLiked(res.liked);
    setLikesCount(res.likes_count);
  };

  const copyContent = (content: string, path: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(path);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  if (isLoading) return <Layout><div className="flex justify-center py-20">加载中...</div></Layout>;
  if (!post) return <Layout><div className="text-center py-20">帖子不存在</div></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Badge variant="outline" className="mb-2">
            {CATEGORIES[post.category] || post.category}
          </Badge>
          <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
          <p className="text-muted-foreground mb-4">{post.description}</p>

          <div className="flex items-center gap-3">
            <Link to={`/user/${post.author.username}`} className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.author.avatar_url} />
                <AvatarFallback>{post.author.display_name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{post.author.display_name}</span>
            </Link>
            <span className="text-sm text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString("zh-CN")}
            </span>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              variant={liked ? "default" : "outline"}
              size="sm"
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 mr-1 ${liked ? "fill-current" : ""}`} />
              {likesCount}
            </Button>
            <Button variant="outline" size="sm">
              <Bookmark className="h-4 w-4 mr-1" />
              收藏
            </Button>
          </div>
        </div>

        <Separator className="mb-6" />

        {post.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {post.images.map((img) => (
              <img
                key={img.id}
                src={img.url_600}
                alt=""
                className="rounded-lg object-cover w-full cursor-pointer hover:opacity-90"
                onClick={() => window.open(img.url_original, "_blank")}
              />
            ))}
          </div>
        )}

        {post.config_files.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3">配置文件</h2>
            <div className="space-y-3">
              {post.config_files.map((file, idx) => (
                <Card key={idx}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted rounded-t-lg">
                      <code className="text-sm">{file.path}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyContent(file.content, file.path)}
                      >
                        {copiedFile === file.path ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-sm">
                      <code>{file.content}</code>
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <Link to={`/tag/${tag}`} key={tag}>
                <Badge variant="secondary">{tag}</Badge>
              </Link>
            ))}
          </div>
        )}

        <Separator className="mb-8" />

        {post.content && (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </Layout>
  );
}
