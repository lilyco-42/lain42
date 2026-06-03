import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import ConfigCard from "@/components/ConfigCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User, PostListItem } from "@/types";

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();

  const { data: user } = useQuery({
    queryKey: ["user", username],
    queryFn: () => api.get<User>(`/users/${username}`),
    enabled: !!username,
  });

  const { data: posts } = useQuery({
    queryKey: ["user-posts", username],
    queryFn: () => api.get<PostListItem[]>(`/users/${username}/posts`),
    enabled: !!username,
  });

  if (!user) return <Layout><div className="text-center py-20">用户不存在</div></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="text-xl">{user.display_name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{user.display_name}</h1>
            <p className="text-muted-foreground">@{user.username}</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4">发布的配置 ({posts?.length || 0})</h2>
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
          {posts?.map((post) => (
            <ConfigCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
