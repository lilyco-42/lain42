import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";

const PROVIDERS = [
  {
    provider: "github",
    name: "GitHub",
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || "",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    color: "bg-gray-900 hover:bg-gray-800",
  },
  {
    provider: "gitee",
    name: "Gitee",
    clientId: import.meta.env.VITE_GITEE_CLIENT_ID || "",
    authorizeUrl: "https://gitee.com/oauth/authorize",
    color: "bg-red-600 hover:bg-red-500",
  },
  {
    provider: "gitcode",
    name: "GitCode",
    clientId: import.meta.env.VITE_GITCODE_CLIENT_ID || "",
    authorizeUrl: "https://gitcode.com/oauth/authorize",
    color: "bg-blue-600 hover:bg-blue-500",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { oauthLogin, passwordLogin, register, isAuthenticated } = useAuthStore();
  const [error, setError] = useState("");

  // Email/password login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const provider = searchParams.get("provider");
    if (code && provider) {
      oauthLogin(provider, code).then(() => navigate("/"));
    }
  }, [searchParams, oauthLogin, navigate]);

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleOAuthLogin = (provider: string, authorizeUrl: string, clientId: string) => {
    const redirectUri = `${window.location.origin}/login/callback?provider=${provider}`;
    const url = `${authorizeUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user`;
    window.location.href = url;
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await passwordLogin(loginEmail, loginPassword);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "登录失败");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (regPassword.length < 8) {
      setError("密码长度至少 8 位");
      return;
    }
    try {
      await register(regUsername, regEmail, regPassword);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "注册失败");
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">登录 Lain42</CardTitle>
            <CardDescription>登录或注册，分享你的配置</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="password">密码登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
                <TabsTrigger value="oauth">OAuth</TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="space-y-3 pt-3">
                <form onSubmit={handlePasswordLogin} className="space-y-3">
                  <div>
                    <Label>邮箱</Label>
                    <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label>密码</Label>
                    <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full">登录</Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-3 pt-3">
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <Label>用户名</Label>
                    <Input value={regUsername} onChange={(e) => setRegUsername(e.target.value)} required />
                  </div>
                  <div>
                    <Label>邮箱</Label>
                    <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label>密码 (至少 8 位)</Label>
                    <Input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full">注册</Button>
                </form>
              </TabsContent>

              <TabsContent value="oauth" className="space-y-3 pt-3">
                {PROVIDERS.map((p) =>
                  p.clientId ? (
                    <Button
                      key={p.provider}
                      className={`w-full text-white ${p.color}`}
                      onClick={() => handleOAuthLogin(p.provider, p.authorizeUrl, p.clientId)}
                    >
                      使用 {p.name} 登录
                    </Button>
                  ) : (
                    <Button key={p.provider} variant="outline" className="w-full" disabled>
                      {p.name} (未配置)
                    </Button>
                  )
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
