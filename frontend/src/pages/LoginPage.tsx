import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="flex items-center justify-center min-h-[85vh]">
        <div className="w-full max-w-[364px] mx-4">

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-1.5">
              <span className="text-primary">Lain</span><span className="text-foreground">42</span>
            </h2>
            <p className="text-sm text-muted-foreground">登录或注册，开始分享你的配置</p>
          </div>

          <Tabs defaultValue="password" className="flex flex-col">
            <TabsList className="mb-8 self-center">
              <TabsTrigger value="password">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
              <TabsTrigger value="oauth">第三方</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={doLogin} className="flex flex-col gap-3">
                <Label htmlFor="email">邮箱地址</Label>
                <Input id="email" type="email" placeholder="you@example.com"
                  className="mt-1" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                <Label htmlFor="password">密码</Label>
                <Input id="password" type="password" placeholder="········"
                  className="mt-1" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="mt-2 w-full">登录</Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={doRegister} className="flex flex-col gap-3">
                <Label htmlFor="reg-username">用户名</Label>
                <Input id="reg-username" placeholder="你的用户名"
                  className="mt-1" value={regUsername} onChange={e => setRegUsername(e.target.value)} required />
                <Label htmlFor="reg-email">邮箱地址</Label>
                <Input id="reg-email" type="email" placeholder="you@example.com"
                  className="mt-1" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
                <Label htmlFor="reg-password">密码<span className="text-muted-foreground font-normal ml-1">(至少 8 位)</span></Label>
                <Input id="reg-password" type="password" placeholder="········"
                  className="mt-1" value={regPassword} onChange={e => setRegPassword(e.target.value)} required />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="mt-2 w-full">注册</Button>
              </form>
            </TabsContent>

            <TabsContent value="oauth">
              <div className="flex flex-col gap-2.5">
                {PROVIDERS.map(p => (
                  <Button key={p.provider} variant="outline" className="w-full"
                    disabled={!p.clientId}
                    onClick={() => p.clientId && oauth(p)}>
                    {p.name}{!p.clientId && " (未配置)"}
                  </Button>
                ))}
                <p className="text-xs text-muted-foreground text-center mt-2">
                  需在服务端配置 OAuth 凭证后启用
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
