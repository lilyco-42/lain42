import { useEffect, useState } from "react";
import { Monitor, Apple, Terminal, Cpu, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

type OS = "windows" | "macos" | "linux" | "unknown";

interface Variant {
  name: string; url: string; version: string;
  os: string; arch: string; mirror: string; size: string;
}

interface ToolData { variants: Variant[] }

const ICON: Record<OS, any> = { windows: Monitor, macos: Apple, linux: Terminal, unknown: Cpu };

function detect(): { os: OS; arch: string } {
  const p = navigator.platform || "";
  const ua = navigator.userAgent;
  let os: OS = "unknown";
  if (p.includes("Win") || ua.includes("Windows")) os = "windows";
  else if (p.includes("Mac") || ua.includes("Mac")) os = "macos";
  else if (p.includes("Linux") || ua.includes("Linux")) os = "linux";
  let arch = "x86_64";
  if (ua.includes("aarch64") || ua.includes("arm64")) arch = "arm64";
  return { os, arch };
}

export default function OsDetector() {
  const [os, setOs] = useState<ReturnType<typeof detect> | null>(null);
  const [tools, setTools] = useState<Record<string, ToolData>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setOs(detect());
    api.get<{ tools: Record<string, Variant[]> }>("/mirrors")
      .then(data => {
        const grouped: Record<string, ToolData> = {};
        for (const [tool, variants] of Object.entries(data.tools)) {
          grouped[tool] = { variants };
        }
        setTools(grouped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!os) return null;
  const Icon = ICON[os.os];
  const names: Record<string, string> = { windows: "Windows", macos: "macOS", linux: "Linux", unknown: "未知" };

  // Filter tools that have downloads for this OS + arch
  const available = Object.entries(tools).filter(([_, t]) =>
    t.variants.some(v => v.os === os.os && v.arch === os.arch)
  );

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden mb-6">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">检测到: {names[os.os]} · {os.arch}</p>
          <p className="text-xs text-muted-foreground">国内镜像: 清华 tuna / 阿里云 aliyun / 中科大 ustc</p>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin ml-auto text-muted-foreground" />}
      </div>

      <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {available.map(([tool, data]) => {
          const variants = data.variants.filter(v => v.os === os.os && v.arch === os.arch);
          const primary = variants[0];
          return (
            <div key={tool} className="rounded-xl border border-border/30 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/20 transition-all flex flex-col">
              <div className="px-3.5 pt-3.5 pb-2 flex-1">
                <p className="text-sm font-semibold mb-1">{tool}</p>
                {primary && (
                  <>
                    <p className="text-[10px] text-muted-foreground">{primary.name}</p>
                    <Badge variant="secondary" className="mt-1.5 text-[9px] px-1.5 py-0 h-4 bg-green-500/10 text-green-500 border-0">
                      v{primary.version} · {primary.mirror}镜像
                    </Badge>
                    {variants.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-border/20">
                        {variants.slice(1).map((v, i) => (
                          <a key={i} href={v.url} target="_blank" rel="noopener"
                            className="text-[10px] text-muted-foreground hover:text-primary block truncate">
                            {v.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {primary && (
                <Button variant="secondary" size="sm"
                  className="m-2 mt-0 rounded-lg text-xs font-medium h-8 gap-1.5"
                  onClick={() => { setCopied(tool); setTimeout(() => setCopied(""), 1500); window.open(primary.url, "_blank"); }}>
                  <Download className="h-3 w-3" />
                  {copied === tool ? "已开始 ✓" : "下载"}
                </Button>
              )}
            </div>
          );
        })}
        {!loading && available.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground text-center py-4">
            正在获取最新版本...
          </p>
        )}
      </div>

      <div className="px-5 py-2 border-t border-border/20 bg-secondary/10">
        <p className="text-[10px] text-muted-foreground/40">
          版本数据由服务器从镜像站动态获取，每 6 小时自动更新
        </p>
      </div>
    </div>
  );
}
