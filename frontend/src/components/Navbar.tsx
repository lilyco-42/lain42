import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import { useState } from "react";
import { Plus, Search } from "lucide-react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50">
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-xl border-b border-border/50" />

      <div className="relative flex h-14 items-center px-5 gap-4 max-w-[1600px] mx-auto">
        {/* Logo — bold red accent */}
        <Link to="/" className="shrink-0">
          <span className="text-xl font-extrabold tracking-tight">
            <span className="text-primary">Lain</span>
            <span className="text-foreground">42</span>
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="搜索配置、标签、软件..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-9 bg-secondary/50 border-border/50 rounded-xl text-sm focus-visible:ring-primary/30"
            />
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <>
              <Button
                size="sm"
                onClick={() => navigate("/publish")}
                className="rounded-xl font-medium shadow-none bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                发布
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-border hover:ring-primary/50 transition-all">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                      {user?.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl mt-2">
                  <DropdownMenuItem onClick={() => navigate(`/user/${user?.username}`)}>
                    我的主页
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    设置
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>退出</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/login")}
                className="rounded-xl text-sm"
              >
                登录
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/login")}
                className="rounded-xl font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                注册
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
