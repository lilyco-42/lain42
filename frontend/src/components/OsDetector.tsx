import { useEffect, useState } from "react";
import { Monitor, Apple, Terminal, Cpu, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OSInfo {
  os: "windows" | "macos" | "linux" | "unknown";
  arch: string;
  name: string;
}

function detectOS(): OSInfo {
  const ua = navigator.userAgent;
  const platform = navigator.platform || "";
  let os: OSInfo["os"] = "unknown";
  if (platform.includes("Win") || ua.includes("Windows")) os = "windows";
  else if (platform.includes("Mac") || ua.includes("Mac")) os = "macos";
  else if (platform.includes("Linux") || ua.includes("Linux")) os = "linux";
  let arch = "x86_64";
  if (ua.includes("aarch64") || ua.includes("arm64")) arch = "arm64";
  return { os, arch, name: { windows: "Windows", macos: "macOS", linux: "Linux", unknown: "未知" }[os] };
}

// Mirror download URLs — keyed by [tool][os][arch]
interface Download {
  url: string;
  name: string;
  size?: string;
  mirror: string;
}

const DOWNLOADS: Record<string, Record<string, Record<string, Download[]>>> = {
  "LLVM/Clang": {
    windows: {
      x86_64: [
        { name: "LLVM 20.1.0 安装包 (exe)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/llvm/llvm-project/LLVM%2020.1.0/LLVM-20.1.0-win64.exe", size: "~350MB", mirror: "清华" },
        { name: "LLVM 19.1.7 安装包 (exe)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/llvm/llvm-project/LLVM%2019.1.7/LLVM-19.1.7-win64.exe", size: "~320MB", mirror: "清华" },
      ],
    },
    macos: {
      x86_64: [{ name: "LLVM 20.1.0 (tar.xz)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/llvm/llvm-project/LLVM%2020.1.0/clang+llvm-20.1.0-x86_64-apple-darwin.tar.xz", size: "~550MB", mirror: "清华" }],
      arm64: [{ name: "LLVM 20.1.0 ARM64 (tar.xz)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/llvm/llvm-project/LLVM%2020.1.0/clang+llvm-20.1.0-arm64-apple-darwin.tar.xz", size: "~520MB", mirror: "清华" }],
    },
    linux: {
      x86_64: [{ name: "LLVM 20.1.0 (tar.xz)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/llvm/llvm-project/LLVM%2020.1.0/clang+llvm-20.1.0-x86_64-linux-gnu-ubuntu-24.04.tar.xz", size: "~580MB", mirror: "清华" }],
    },
  },
  Rust: {
    windows: {
      x86_64: [
        { name: "rustup-init.exe (安装器)", url: "https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe", size: "~12MB", mirror: "清华" },
      ],
    },
    macos: {
      x86_64: [{ name: "rustup (安装脚本)", url: "https://sh.rustup.rs", size: "", mirror: "官方(已设RUSTUP_DIST_SERVER=tuna)" }],
      arm64: [{ name: "rustup (安装脚本)", url: "https://sh.rustup.rs", size: "", mirror: "官方(已设RUSTUP_DIST_SERVER=tuna)" }],
    },
    linux: {
      x86_64: [{ name: "rustup (安装脚本)", url: "https://sh.rustup.rs", size: "", mirror: "官方(已设RUSTUP_DIST_SERVER=tuna)" }],
    },
  },
  Python: {
    windows: {
      x86_64: [
        { name: "Python 3.13.3 (64-bit exe)", url: "https://mirrors.tuna.tsinghua.edu.cn/python/3.13.3/python-3.13.3-amd64.exe", size: "~27MB", mirror: "清华" },
        { name: "Python 3.12.9 (64-bit exe)", url: "https://mirrors.tuna.tsinghua.edu.cn/python/3.12.9/python-3.12.9-amd64.exe", size: "~25MB", mirror: "清华" },
      ],
    },
    macos: {
      x86_64: [{ name: "Python 3.13.3 (pkg)", url: "https://mirrors.tuna.tsinghua.edu.cn/python/3.13.3/python-3.13.3-macos11.pkg", size: "~42MB", mirror: "清华" }],
      arm64: [{ name: "Python 3.13.3 (pkg)", url: "https://mirrors.tuna.tsinghua.edu.cn/python/3.13.3/python-3.13.3-macos11.pkg", size: "~42MB", mirror: "清华" }],
    },
    linux: {
      x86_64: [{ name: "Python 3.13.3 源码", url: "https://mirrors.tuna.tsinghua.edu.cn/python/3.13.3/Python-3.13.3.tar.xz", size: "~20MB", mirror: "清华" }],
    },
  },
  Go: {
    windows: {
      x86_64: [
        { name: "Go 1.24.2 (msi)", url: "https://mirrors.aliyun.com/golang/go1.24.2.windows-amd64.msi", size: "~69MB", mirror: "阿里云" },
      ],
    },
    macos: {
      x86_64: [{ name: "Go 1.24.2 (pkg)", url: "https://mirrors.aliyun.com/golang/go1.24.2.darwin-amd64.pkg", size: "~76MB", mirror: "阿里云" }],
      arm64: [{ name: "Go 1.24.2 ARM64 (pkg)", url: "https://mirrors.aliyun.com/golang/go1.24.2.darwin-arm64.pkg", size: "~72MB", mirror: "阿里云" }],
    },
    linux: {
      x86_64: [{ name: "Go 1.24.2 (tar.gz)", url: "https://mirrors.aliyun.com/golang/go1.24.2.linux-amd64.tar.gz", size: "~71MB", mirror: "阿里云" }],
      arm64: [{ name: "Go 1.24.2 ARM64 (tar.gz)", url: "https://mirrors.aliyun.com/golang/go1.24.2.linux-arm64.tar.gz", size: "~66MB", mirror: "阿里云" }],
    },
  },
  NodeJS: {
    windows: {
      x86_64: [
        { name: "Node.js 22 LTS (msi)", url: "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v22.15.0/node-v22.15.0-x64.msi", size: "~29MB", mirror: "清华" },
      ],
    },
    macos: {
      x86_64: [{ name: "Node.js 22 LTS (pkg)", url: "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v22.15.0/node-v22.15.0.pkg", size: "~57MB", mirror: "清华" }],
      arm64: [{ name: "Node.js 22 LTS ARM64 (pkg)", url: "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v22.15.0/node-v22.15.0.pkg", size: "~57MB", mirror: "清华" }],
    },
    linux: {
      x86_64: [{ name: "Node.js 22 LTS (tar.xz)", url: "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v22.15.0/node-v22.15.0-linux-x64.tar.xz", size: "~28MB", mirror: "清华" }],
      arm64: [{ name: "Node.js 22 LTS ARM64 (tar.xz)", url: "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v22.15.0/node-v22.15.0-linux-arm64.tar.xz", size: "~27MB", mirror: "清华" }],
    },
  },
  Zig: {
    windows: {
      x86_64: [{ name: "Zig 0.14.0 (zip)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/ziglang/zig/0.14.0/zig-windows-x86_64-0.14.0.zip", size: "~60MB", mirror: "清华" }],
    },
    macos: {
      x86_64: [{ name: "Zig 0.14.0 (tar.xz)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/ziglang/zig/0.14.0/zig-macos-x86_64-0.14.0.tar.xz", size: "~44MB", mirror: "清华" }],
      arm64: [{ name: "Zig 0.14.0 ARM64 (tar.xz)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/ziglang/zig/0.14.0/zig-macos-aarch64-0.14.0.tar.xz", size: "~42MB", mirror: "清华" }],
    },
    linux: {
      x86_64: [{ name: "Zig 0.14.0 (tar.xz)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/ziglang/zig/0.14.0/zig-linux-x86_64-0.14.0.tar.xz", size: "~45MB", mirror: "清华" }],
    },
  },
  Git: {
    windows: {
      x86_64: [{ name: "Git for Windows (exe)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/git-for-windows/git/v2.49.0.windows.1/Git-2.49.0-64-bit.exe", size: "~62MB", mirror: "清华" }],
    },
    macos: {
      x86_64: [{ name: "Git (brew)", url: "https://brew.sh", size: "", mirror: "brew" }],
      arm64: [{ name: "Git (brew)", url: "https://brew.sh", size: "", mirror: "brew" }],
    },
    linux: {
      x86_64: [{ name: "Git 源码 (tar.xz)", url: "https://mirrors.tuna.tsinghua.edu.cn/kernel/software/scm/git/git-2.49.0.tar.xz", size: "~9MB", mirror: "清华" }],
    },
  },
  GCC: {
    windows: {
      x86_64: [{ name: "MinGW-w64 (在线安装)", url: "https://mirrors.tuna.tsinghua.edu.cn/msys2/distrib/msys2-x86_64-latest.exe", size: "~90MB", mirror: "清华(MSYS2)" }],
    },
    linux: {
      x86_64: [{ name: "GCC 14 (apt)", url: "https://gcc.gnu.org", size: "apt 安装", mirror: "官方源" }],
    },
    macos: {
      x86_64: [{ name: "GCC (brew)", url: "https://brew.sh", size: "", mirror: "brew" }],
      arm64: [{ name: "GCC (brew)", url: "https://brew.sh", size: "", mirror: "brew" }],
    },
  },
  JDK: {
    windows: {
      x86_64: [{ name: "OpenJDK 21 LTS (msi)", url: "https://mirrors.tuna.tsinghua.edu.cn/Adoptium/21/jdk/hotspot/normal/eclipse-temurin/21.0.5_11/OpenJDK21U-jdk_x64_windows_hotspot_21.0.5_11.msi", size: "~167MB", mirror: "清华" }],
    },
    macos: {
      x86_64: [{ name: "OpenJDK 21 LTS (pkg)", url: "https://mirrors.tuna.tsinghua.edu.cn/Adoptium/21/jdk/hotspot/normal/eclipse-temurin/21.0.5_11/OpenJDK21U-jdk_x64_mac_hotspot_21.0.5_11.pkg", size: "~184MB", mirror: "清华" }],
      arm64: [{ name: "OpenJDK 21 ARM64 (pkg)", url: "https://mirrors.tuna.tsinghua.edu.cn/Adoptium/21/jdk/hotspot/normal/eclipse-temurin/21.0.5_11/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.5_11.pkg", size: "~176MB", mirror: "清华" }],
    },
    linux: {
      x86_64: [{ name: "OpenJDK 21 LTS (tar.gz)", url: "https://mirrors.tuna.tsinghua.edu.cn/Adoptium/21/jdk/hotspot/normal/eclipse-temurin/21.0.5_11/OpenJDK21U-jdk_x64_linux_hotspot_21.0.5_11.tar.gz", size: "~182MB", mirror: "清华" }],
    },
  },
  bun: {
    windows: {
      x86_64: [{ name: "bun (zip)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/oven-sh/bun/bun-v1.2.13/bun-windows-x64.zip", size: "~92MB", mirror: "清华" }],
    },
    macos: {
      x86_64: [{ name: "bun (zip)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/oven-sh/bun/bun-v1.2.13/bun-darwin-x64.zip", size: "~90MB", mirror: "清华" }],
      arm64: [{ name: "bun (zip)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/oven-sh/bun/bun-v1.2.13/bun-darwin-aarch64.zip", size: "~85MB", mirror: "清华" }],
    },
    linux: {
      x86_64: [{ name: "bun (zip)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/oven-sh/bun/bun-v1.2.13/bun-linux-x64.zip", size: "~98MB", mirror: "清华" }],
    },
  },
  CMake: {
    windows: {
      x86_64: [{ name: "CMake 4.0.0 (msi)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/Kitware/CMake/v4.0.0/cmake-4.0.0-windows-x86_64.msi", size: "~46MB", mirror: "清华" }],
    },
    macos: {
      x86_64: [{ name: "CMake 4.0.0 (dmg)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/Kitware/CMake/v4.0.0/cmake-4.0.0-macos-universal.dmg", size: "~44MB", mirror: "清华" }],
      arm64: [{ name: "CMake 4.0.0 (dmg)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/Kitware/CMake/v4.0.0/cmake-4.0.0-macos-universal.dmg", size: "~44MB", mirror: "清华" }],
    },
    linux: {
      x86_64: [{ name: "CMake 4.0.0 (sh)", url: "https://mirrors.tuna.tsinghua.edu.cn/github-release/Kitware/CMake/v4.0.0/cmake-4.0.0-linux-x86_64.sh", size: "~56MB", mirror: "清华" }],
    },
  },
};

const ICON: Record<string, any> = {
  windows: Monitor, macos: Apple, linux: Terminal, unknown: Cpu,
};

export default function OsDetector() {
  const [os, setOs] = useState<OSInfo | null>(null);
  const [copiedTool, setCopiedTool] = useState<string | null>(null);

  useEffect(() => { setOs(detectOS()); }, []);

  const handleDownload = (url: string, tool: string) => {
    setCopiedTool(tool);
    setTimeout(() => setCopiedTool(null), 2000);
    window.open(url, "_blank");
  };

  if (!os) return null;

  const Icon = ICON[os.os];
  const tools = Object.keys(DOWNLOADS).filter(
    (tool) => DOWNLOADS[tool][os.os]?.[os.arch]?.length > 0
  );

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            检测到：{os.name} · {os.arch}
          </p>
          <p className="text-xs text-muted-foreground">
            国内镜像：清华 tuna / 阿里云 aliyun / 中科大 ustc
          </p>
        </div>
      </div>

      {/* Download Grid */}
      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {tools.map((tool) => {
          const downloads = DOWNLOADS[tool][os.os]?.[os.arch] || [];
          const primary = downloads[0];
          return (
            <div
              key={tool}
              className="rounded-xl border border-border/30 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/20 transition-all flex flex-col"
            >
              <div className="px-3.5 pt-3.5 pb-2 flex-1">
                <p className="text-sm font-semibold text-foreground mb-1">
                  {tool}
                </p>
                {primary && (
                  <>
                    <p className="text-[10px] text-muted-foreground mb-0.5">
                      {primary.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                      {primary.size && <span>{primary.size}</span>}
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-green-500/10 text-green-500 border-0">
                        {primary.mirror}镜像
                      </Badge>
                    </div>
                    {/* Alt versions */}
                    {downloads.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-border/20 space-y-0.5">
                        {downloads.slice(1).map((d, i) => (
                          <button
                            key={i}
                            onClick={() => handleDownload(d.url, `${tool}-alt${i}`)}
                            className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 w-full text-left"
                          >
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            {d.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {primary && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="m-2 mt-0 rounded-lg text-xs font-medium h-8 gap-1.5"
                  onClick={() => handleDownload(primary.url, tool)}
                >
                  {copiedTool === tool ? (
                    "已开始下载 ✓"
                  ) : (
                    <>
                      <Download className="h-3 w-3" />
                      下载
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-2.5 border-t border-border/20 bg-secondary/10">
        <p className="text-[10px] text-muted-foreground/50">
          所有下载链接均使用国内镜像加速。点击「下载」按钮自动跳转到镜像站。
        </p>
      </div>
    </div>
  );
}
