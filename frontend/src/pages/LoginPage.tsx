import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
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
  }, []);

  if (isAuthenticated) { navigate("/"); return null; }

  const doLogin = async (e: FormEvent) => { e.preventDefault(); setError("");
    try { await passwordLogin(loginEmail, loginPassword); navigate("/"); }
    catch (err: any) { setError(err.message || "登录失败"); } };

  const doRegister = async (e: FormEvent) => { e.preventDefault(); setError("");
    if (regPassword.length < 8) { setError("密码至少 8 位"); return; }
    try { await register(regUsername, regEmail, regPassword); navigate("/"); }
    catch (err: any) { setError(err.message || "注册失败"); } };

  const oauth = (p: typeof PROVIDERS[0]) => {
    const ri = `${window.location.origin}/login/callback?provider=${p.provider}`;
    window.location.href = `${p.authorizeUrl}?client_id=${p.clientId}&redirect_uri=${encodeURIComponent(ri)}&scope=user`;
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[85vh] px-4">
        <div className="w-full max-w-[380px] bg-card border border-border rounded-xl p-8 md:p-10">
          <h1 className="text-lg font-bold mb-1">
            <span className="text-primary">Lain</span>42 · 登录
          </h1>
          <p className="text-xs text-muted-foreground mb-6">登录或注册，开始分享你的配置</p>

          <Tabs defaultValue="password">
            <TabsList className="grid w-full grid-cols-3 mb-6 rounded-lg p-1 h-9 bg-secondary">
              <TabsTrigger value="password" className="rounded-md text-xs data-[state=active]:bg-background">登录</TabsTrigger>
              <TabsTrigger value="register" className="rounded-md text-xs data-[state=active]:bg-background">注册</TabsTrigger>
              <TabsTrigger value="oauth" className="rounded-md text-xs data-[state=active]:bg-background">第三方</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={doLogin}>
                <label className="block text-xs text-muted-foreground mb-1.5">邮箱地址</label>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground outline-none focus:border-primary mb-4" />
                <label className="block text-xs text-muted-foreground mb-1.5">密码</label>
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground outline-none focus:border-primary mb-5" />
                {error && <p className="text-xs text-destructive mb-4">{error}</p>}
                <button type="submit"
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                  登录
                </button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={doRegister}>
                <label className="block text-xs text-muted-foreground mb-1.5">用户名</label>
                <input value={regUsername} onChange={e => setRegUsername(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground outline-none focus:border-primary mb-4" />
                <label className="block text-xs text-muted-foreground mb-1.5">邮箱地址</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground outline-none focus:border-primary mb-4" />
                <label className="block text-xs text-muted-foreground mb-1.5">密码 <span className="opacity-50">(至少 8 位)</span></label>
                <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground outline-none focus:border-primary mb-5" />
                {error && <p className="text-xs text-destructive mb-4">{error}</p>}
                <button type="submit"
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                  注册
                </button>
              </form>
            </TabsContent>

            <TabsContent value="oauth">
              {PROVIDERS.map(p => p.clientId ? (
                <button key={p.provider} onClick={() => oauth(p)}
                  className="w-full py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors mb-2.5">
                  {p.name}
                </button>
              ) : (
                <button key={p.provider} disabled
                  className="w-full py-2.5 rounded-lg border border-border text-sm font-medium opacity-40 mb-2.5">
                  {p.name} (未配置)
                </button>
              ))}
              <p className="text-[11px] text-muted-foreground text-center mt-3">
                需在服务端配置 OAuth 凭证后启用
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
