import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
import OsDetector from "@/components/OsDetector";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
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

  const isOwner = user?.id === post.author.id;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Badge className="mb-3 rounded-full px-3 py-0.5 bg-primary/10 text-primary border-0 text-xs font-medium">
            {CATEGORIES[post.category] || post.category}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 text-foreground">{post.title}</h1>

          {post.category === "dev-env" && <OsDetector tags={post.tags} />}
          <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{post.description}</p>

          <div className="flex items-center gap-3 mb-4">
            <Link to={`/user/${post.author.username}`} className="flex items-center gap-2.5 group">
              <Avatar className="h-9 w-9 ring-2 ring-border group-hover:ring-primary/30 transition-all">
                <AvatarImage src={post.author.avatar_url} />
                <AvatarFallback className="bg-accent text-accent-foreground text-xs">{post.author.display_name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <span className="text-sm font-semibold group-hover:text-primary transition-colors">{post.author.display_name}</span>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex gap-2 mt-2">
            <Button
              variant={liked ? "default" : "secondary"}
              size="sm"
              onClick={handleLike}
              className="rounded-full font-medium"
            >
              <Heart className={`h-4 w-4 mr-1.5 ${liked ? "fill-current" : ""}`} />
              {likesCount}
            </Button>
            <Button variant="secondary" size="sm" className="rounded-full font-medium">
              <Bookmark className="h-4 w-4 mr-1.5" />
              收藏
            </Button>
            {isOwner && (
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="secondary" size="sm"
                  className="rounded-full font-medium"
                  onClick={() => navigate(`/edit/${post.id}`)}>
                  编辑
                </Button>
                <Button
                  variant="secondary" size="sm"
                  className="rounded-full font-medium text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    if (confirm("确定删除这个帖子吗？")) {
                      await api.delete(`/posts/${post.id}`);
                      navigate("/");
                    }
                  }}>
                  删除
                </Button>
              </div>
            )}
          </div>
        </div>

        <Separator className="mb-6" />

        {(post.images.length > 0 || post.cover_image) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {post.images.length > 0 ? post.images.map((img) => (
              <div key={img.id} className="overflow-hidden rounded-2xl cursor-pointer group/img bg-muted">
                <img
                  src={img.url_600}
                  alt=""
                  loading="lazy"
                  className="w-full h-64 object-cover transition-all duration-700 group-hover/img:scale-105"
                  style={{ filter: "blur(10px)" }}
                  onLoad={(e) => { (e.target as HTMLImageElement).style.filter = "blur(0)"; }}
                  onClick={() => window.open(img.url_original, "_blank")}
                />
              </div>
            )) : (
              <div className="overflow-hidden rounded-2xl bg-muted col-span-full">
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full max-h-96 object-cover transition-all duration-700"
                  style={{ filter: "blur(10px)" }}
                  onLoad={(e) => { (e.target as HTMLImageElement).style.filter = "blur(0)"; }}
                />
              </div>
            )}
          </div>
        )}

        {post.config_files.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full" />
              配置文件
            </h2>
            <div className="space-y-3">
              {post.config_files.map((file, idx) => (
                <Card key={idx} className="rounded-xl overflow-hidden border-border/50 shadow-none">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50">
                      <code className="text-xs font-mono text-foreground/80">{file.path}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyContent(file.content, file.path)}
                        className="h-7 rounded-lg text-xs"
                      >
                        {copiedFile === file.path ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-xs leading-relaxed bg-card">
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
          <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary prose-img:rounded-2xl">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        )}

        <div className="h-16" />
      </div>
    </Layout>
  );
}
