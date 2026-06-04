import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";

const PROVIDERS = [
  { provider: "github", name: "GitHub",
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

  const inputClass = "w-full h-11 rounded-xl bg-secondary/50 border border-border/30 px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/30 placeholder:text-muted-foreground/50";

  return (
    <Layout>
      <div className="min-h-[85vh] flex">
        {/* Left — brand */}
        <div className="hidden lg:flex flex-1 items-center justify-center bg-secondary/30">
          <div className="max-w-sm px-8">
            <h2 className="text-2xl font-bold mb-3">发现 &amp; 分享配置</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Arch ricing · Windows 美化 · 开发环境 ·<br />
              终端配置 · 编辑器 · 书源 · 软件推荐
            </p>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-[360px]">
            <h1 className="text-2xl font-extrabold mb-6">
              <span className="text-primary">Lain</span><span className="text-foreground">42</span>
            </h1>

            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 rounded-xl p-1 h-10 bg-secondary/80">
                <TabsTrigger value="password" className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">登录</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">注册</TabsTrigger>
                <TabsTrigger value="oauth" className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">第三方</TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="mt-0">
                <form onSubmit={handleLogin}>
                  <label className="block mb-4">
                    <span className="text-xs text-muted-foreground mb-1.5 block">邮箱地址</span>
                    <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className={inputClass} />
                  </label>
                  <label className="block mb-6">
                    <span className="text-xs text-muted-foreground mb-1.5 block">密码</span>
                    <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className={inputClass} />
                  </label>
                  {error && <p className="text-xs text-destructive mb-4">{error}</p>}
                  <Button type="submit" className="w-full h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90">
                    登录
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister}>
                  <label className="block mb-3.5">
                    <span className="text-xs text-muted-foreground mb-1.5 block">用户名</span>
                    <input value={regUsername} onChange={(e) => setRegUsername(e.target.value)} required className={inputClass} />
                  </label>
                  <label className="block mb-3.5">
                    <span className="text-xs text-muted-foreground mb-1.5 block">邮箱地址</span>
                    <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className={inputClass} />
                  </label>
                  <label className="block mb-5">
                    <span className="text-xs text-muted-foreground mb-1.5 block">密码 (至少 8 位)</span>
                    <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required className={inputClass} />
                  </label>
                  {error && <p className="text-xs text-destructive mb-4">{error}</p>}
                  <Button type="submit" className="w-full h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90">
                    注册
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="oauth" className="mt-0 space-y-2.5">
                {PROVIDERS.map((p) =>
                  p.clientId ? (
                    <Button key={p.provider} variant="outline"
                      className="w-full h-11 rounded-xl font-medium text-sm border-border/30 hover:bg-secondary/50 justify-center"
                      onClick={() => handleOAuth(p.provider, p.authorizeUrl, p.clientId)}>
                      {p.name}
                    </Button>
                  ) : (
                    <Button key={p.provider} variant="outline" disabled
                      className="w-full h-11 rounded-xl text-sm border-border/30 justify-center opacity-40">
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
      </div>
    </Layout>
  );
}
