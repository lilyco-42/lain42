import { useAuthStore } from "@/stores/auth";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SettingsPage() {
  const { user, logout } = useAuthStore();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">设置</h1>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
            <CardDescription>你的账户信息</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback>{user?.display_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user?.display_name}</p>
              <p className="text-sm text-muted-foreground">@{user?.username}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>客户端下载</CardTitle>
            <CardDescription>下载 Rust TUI 客户端实现配置自动同步</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a href="/download/lain-linux-amd64" target="_blank" rel="noreferrer">
              <Button variant="outline">Linux x64</Button>
            </a>
            <a href="/download/lain-macos-arm64" target="_blank" rel="noreferrer">
              <Button variant="outline">macOS ARM</Button>
            </a>
            <a href="/download/lain-windows-amd64.exe" target="_blank" rel="noreferrer">
              <Button variant="outline">Windows x64</Button>
            </a>
          </CardContent>
        </Card>

        <Button variant="destructive" onClick={logout}>退出登录</Button>
      </div>
    </Layout>
  );
}
