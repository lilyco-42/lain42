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
import { Plus } from "lucide-react";

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
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4 max-w-[1600px] mx-auto">
        <Link to="/" className="text-xl font-bold shrink-0">
          Lain42
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <Input
            placeholder="搜索配置..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
        </form>

        <div className="flex items-center gap-3 ml-auto">
          {isAuthenticated ? (
            <>
              <Button size="sm" variant="outline" onClick={() => navigate("/publish")}>
                <Plus className="h-4 w-4 mr-1" />
                发布
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback>{user?.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
            <Button size="sm" onClick={() => navigate("/login")}>
              登录
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
