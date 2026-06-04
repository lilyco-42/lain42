import { useEffect, useState, type FormEvent } from "react";
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

const inputCls = "w-full h-11 rounded-xl bg-secondary/50 border border-border/30 px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/30";
const labelCls = "text-xs text-muted-foreground mb-1.5";

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
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <h1 className="text-center text-2xl font-extrabold mb-8">
            <span className="text-primary">Lain</span><span className="text-foreground">42</span>
          </h1>

          <Tabs defaultValue="password">
            <TabsList className="grid w-full grid-cols-3 mb-8 rounded-xl p-1 h-10 bg-secondary/80">
              <TabsTrigger value="password" className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">登录</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">注册</TabsTrigger>
              <TabsTrigger value="oauth" className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">第三方</TabsTrigger>
            </TabsList>

            {/* ── Login ── */}
            <TabsContent value="password">
              <form onSubmit={doLogin} className="flex flex-col gap-4">
                <div>
                  <p className={labelCls}>邮箱地址</p>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <p className={labelCls}>密码</p>
                  <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className={inputCls} />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90 mt-1">登录</Button>
              </form>
            </TabsContent>

            {/* ── Register ── */}
            <TabsContent value="register">
              <form onSubmit={doRegister} className="flex flex-col gap-3">
                <div>
                  <p className={labelCls}>用户名</p>
                  <input value={regUsername} onChange={e => setRegUsername(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <p className={labelCls}>邮箱地址</p>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <p className={labelCls}>密码 (至少 8 位)</p>
                  <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required className={inputCls} />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90 mt-1">注册</Button>
              </form>
            </TabsContent>

            {/* ── OAuth ── */}
            <TabsContent value="oauth" className="flex flex-col gap-2.5">
              {PROVIDERS.map(p => p.clientId ? (
                <Button key={p.provider} variant="outline"
                  className="w-full h-11 rounded-xl font-medium text-sm border-border/30 hover:bg-secondary/50 justify-center"
                  onClick={() => oauth(p)}>{p.name}</Button>
              ) : (
                <Button key={p.provider} variant="outline" disabled
                  className="w-full h-11 rounded-xl text-sm border-border/30 justify-center opacity-40">{p.name} (未配置)</Button>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
