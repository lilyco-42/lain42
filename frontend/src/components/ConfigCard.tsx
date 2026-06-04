import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye } from "lucide-react";
import type { PostListItem } from "@/types";

export default function ConfigCard({ post }: { post: PostListItem }) {
  return (
    <Link to={`/post/${post.id}`} className="block group">
      <Card className="overflow-hidden border-0 shadow-none bg-card hover:shadow-xl hover:shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 rounded-2xl">
        {/* Image container with Pinterest-style overlay */}
        <div className="relative w-full overflow-hidden bg-muted">
          {post.cover_image ? (
            <>
              <img
                src={post.cover_image}
                alt={post.title}
                loading="lazy"
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                <p className="text-white text-xs font-medium line-clamp-2">
                  {post.description || post.title}
                </p>
              </div>
            </>
          ) : (
            <div className="w-full min-h-[120px] flex items-center justify-center bg-gradient-to-br from-muted to-accent/20">
              <span className="text-muted-foreground text-sm font-medium">Lain42</span>
            </div>
          )}

          {/* Stats overlay top-right */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-white text-xs">
                <Heart className="h-3 w-3" />
                {post.likes_count}
              </span>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="px-3.5 pt-3 pb-3.5">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug mb-1 group-hover:text-primary transition-colors">
            {post.title}
          </h3>

          {/* Author row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-5 w-5 ring-1 ring-border shrink-0">
                <AvatarImage src={post.author.avatar_url} />
                <AvatarFallback className="text-[10px] bg-accent text-accent-foreground">
                  {post.author.display_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {post.author.display_name}
              </span>
            </div>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5 font-normal bg-secondary/50 hover:bg-secondary text-muted-foreground"
                >
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
