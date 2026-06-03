import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
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
  const { login, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const code = searchParams.get("code");
    const provider = searchParams.get("provider");
    if (code && provider) {
      login(provider, code).then(() => navigate("/"));
    }
  }, [searchParams, login, navigate]);

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleLogin = (provider: string, authorizeUrl: string, clientId: string) => {
    const redirectUri = `${window.location.origin}/login/callback?provider=${provider}`;
    const url = `${authorizeUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user`;
    window.location.href = url;
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">登录 Lain42</CardTitle>
            <CardDescription>选择一种方式登录，分享你的配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PROVIDERS.map((p) =>
              p.clientId ? (
                <Button
                  key={p.provider}
                  className={`w-full text-white ${p.color}`}
                  onClick={() => handleLogin(p.provider, p.authorizeUrl, p.clientId)}
                >
                  使用 {p.name} 登录
                </Button>
              ) : null
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
