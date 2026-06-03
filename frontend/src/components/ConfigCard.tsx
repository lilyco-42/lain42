import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import type { PostListItem } from "@/types";

export default function ConfigCard({ post }: { post: PostListItem }) {
  return (
    <Link to={`/post/${post.id}`}>
      <Card className="overflow-hidden break-inside-avoid mb-4 group hover:shadow-md transition-shadow">
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            loading="lazy"
            className="w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-40 bg-muted flex items-center justify-center text-muted-foreground">
            无封面图
          </div>
        )}
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2 mb-1">{post.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {post.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={post.author.avatar_url} />
                <AvatarFallback className="text-[10px]">
                  {post.author.display_name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {post.author.display_name}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Heart className="h-3 w-3" />
              {post.likes_count}
            </div>
          </div>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
