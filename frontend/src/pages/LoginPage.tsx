import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { Github } from "lucide-react";

const PROVIDERS = [
  { provider: "github", name: "GitHub", icon: Github,
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || "",
    authorizeUrl: "https://github.com/login/oauth/authorize" },
  { provider: "gitee", name: "Gitee",
    clientId: import.meta.env.VITE_GITEE_CLIENT_ID || "",
    authorizeUrl: "https://gitee.com/oauth/authorize" },
  { provider: "gitcode", name: "GitCode",
    clientId: import.meta.env.VITE_GITCODE_CLIENT_ID || "",
    authorizeUrl: "https://gitcode.com/oauth/authorize" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { oauthLogin, passwordLogin, register, isAuthenticated } = useAuthStore();
  const [error, setError] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const provider = searchParams.get("provider");
    if (code && provider) oauthLogin(provider, code).then(() => navigate("/"));
  }, [searchParams, oauthLogin, navigate]);

  if (isAuthenticated) { navigate("/"); return null; }

  const handleOAuth = (p: string, u: string, id: string) => {
    const ri = `${window.location.origin}/login/callback?provider=${p}`;
    window.location.href = `${u}?client_id=${id}&redirect_uri=${encodeURIComponent(ri)}&scope=user`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try { await passwordLogin(loginEmail, loginPassword); navigate("/"); }
    catch (err: any) { setError(err.message || "登录失败"); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (regPassword.length < 8) { setError("密码至少 8 位"); return; }
    try { await register(regUsername, regEmail, regPassword); navigate("/"); }
    catch (err: any) { setError(err.message || "注册失败"); }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[85vh] px-4">
        <div className="w-full max-w-[360px]">

          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">
              <span className="text-primary">Lain</span><span className="text-foreground">42</span>
            </h1>
            <p className="text-sm text-muted-foreground">登录或注册，分享你的配置</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 rounded-xl p-1 h-10 bg-secondary/80">
              <TabsTrigger value="password" className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">登录</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">注册</TabsTrigger>
              <TabsTrigger value="oauth" className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">第三方</TabsTrigger>
            </TabsList>

            {/* ── Password Login ── */}
            <TabsContent value="password" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-3.5">
                <Input type="email" placeholder="邮箱地址" value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)} required
                  className="h-11 rounded-xl bg-secondary/50 border-border/30 text-sm placeholder:text-muted-foreground/60" />
                <Input type="password" placeholder="密码" value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)} required
                  className="h-11 rounded-xl bg-secondary/50 border-border/30 text-sm placeholder:text-muted-foreground/60" />
                {error && <p className="text-xs text-destructive text-center">{error}</p>}
                <Button type="submit" className="w-full h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90">
                  登录
                </Button>
              </form>
            </TabsContent>

            {/* ── Register ── */}
            <TabsContent value="register" className="mt-0">
              <form onSubmit={handleRegister} className="space-y-3">
                <Input placeholder="用户名" value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)} required
                  className="h-10 rounded-xl bg-secondary/50 border-border/30 text-sm placeholder:text-muted-foreground/60" />
                <Input type="email" placeholder="邮箱地址" value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)} required
                  className="h-10 rounded-xl bg-secondary/50 border-border/30 text-sm placeholder:text-muted-foreground/60" />
                <Input type="password" placeholder="密码 (至少 8 位)" value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)} required
                  className="h-10 rounded-xl bg-secondary/50 border-border/30 text-sm placeholder:text-muted-foreground/60" />
                {error && <p className="text-xs text-destructive text-center">{error}</p>}
                <Button type="submit" className="w-full h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90">
                  注册
                </Button>
              </form>
            </TabsContent>

            {/* ── OAuth ── */}
            <TabsContent value="oauth" className="mt-0 space-y-2.5">
              {PROVIDERS.map((p) =>
                p.clientId ? (
                  <Button key={p.provider} variant="outline"
                    className="w-full h-11 rounded-xl font-medium text-sm border-border/30 hover:bg-secondary/50 justify-center gap-2"
                    onClick={() => handleOAuth(p.provider, p.authorizeUrl, p.clientId)}>
                    {p.name}
                  </Button>
                ) : (
                  <Button key={p.provider} variant="outline" disabled
                    className="w-full h-11 rounded-xl text-sm border-border/30 justify-center gap-2 opacity-40">
                    {p.name} (未配置)
                  </Button>
                )
              )}
              <p className="text-[11px] text-muted-foreground text-center pt-2">
                需在服务端配置 OAuth 凭证后启用
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
