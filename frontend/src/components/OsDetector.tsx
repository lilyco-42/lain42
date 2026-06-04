import { useEffect, useState } from "react";
import { Monitor, Apple, Terminal, Cpu } from "lucide-react";

interface OSInfo {
  os: "windows" | "macos" | "linux" | "unknown";
  arch: string;
  name: string;
}

const MIRRORS: Record<string, string> = {
  windows: "清华 tuna / 中科大 ustc",
  macos: "清华 tuna / 阿里云 aliyun",
  linux: "清华 tuna / 中科大 ustc / 阿里云 aliyun",
};

function detectOS(): OSInfo {
  const ua = navigator.userAgent;
  const platform = navigator.platform || "";

  let os: OSInfo["os"] = "unknown";
  if (platform.includes("Win") || ua.includes("Windows")) os = "windows";
  else if (platform.includes("Mac") || ua.includes("Mac")) os = "macos";
  else if (platform.includes("Linux") || ua.includes("Linux")) os = "linux";

  let arch = "x86_64";
  try {
    const hc = (navigator as any).hardwareConcurrency;
    if (ua.includes("aarch64") || ua.includes("arm64")) arch = "arm64";
    else if (ua.includes("x86_64") || ua.includes("x64")) arch = "x86_64";
    else if (hc && hc <= 4) arch = "x86";
  } catch {}

  const names: Record<string, string> = {
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
    unknown: "未知系统",
  };

  return { os, arch, name: names[os] };
}

const ICON = {
  windows: Monitor,
  macos: Apple,
  linux: Terminal,
  unknown: Cpu,
};

const QUICK_INSTALLS: Record<string, Record<string, string>> = {
  windows: {
    Python: "winget install Python.Python.3.13",
    Rust: "winget install Rustlang.Rustup",
    NodeJS: "winget install OpenJS.NodeJS.LTS",
    Go: "winget install GoLang.Go",
    LLVM: "winget install LLVM.LLVM",
    Git: "winget install Git.Git",
    Zig: "winget install zig.zig",
    CMake: "winget install Kitware.CMake",
  },
  macos: {
    Python: "brew install python@3.13",
    Rust: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh",
    NodeJS: "brew install node",
    Go: "brew install go",
    LLVM: "brew install llvm",
    Git: "brew install git",
    Zig: "brew install zig",
  },
  linux: {
    Python: "sudo apt install python3 python3-pip -y",
    Rust: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh",
    NodeJS: "curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt install nodejs -y",
    Go: "wget https://mirrors.aliyun.com/golang/go1.24.linux-amd64.tar.gz && sudo tar -C /usr/local -xzf go1.24.linux-amd64.tar.gz",
    LLVM: "sudo apt install clang lldb lld -y",
    Git: "sudo apt install git -y",
    Zig: "wget https://ziglang.org/download/0.14.0/zig-linux-x86_64-0.14.0.tar.xz && sudo cp zig /usr/local/bin/",
  },
};

export default function OsDetector() {
  const [os, setOs] = useState<OSInfo | null>(null);

  useEffect(() => {
    setOs(detectOS());
  }, []);

  if (!os) return null;

  const Icon = ICON[os.os];

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            检测到你的系统：{os.name} · {os.arch}
          </p>
          <p className="text-xs text-muted-foreground">
            推荐镜像源：{MIRRORS[os.os] || "国内镜像"}
          </p>
        </div>
      </div>

      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
        快速安装命令
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(Object.entries(QUICK_INSTALLS[os.os] || QUICK_INSTALLS.linux)).map(
          ([tool, cmd]) => (
            <button
              key={tool}
              onClick={() => {
                navigator.clipboard.writeText(cmd);
              }}
              className="text-left rounded-xl border border-border/30 bg-secondary/30 hover:bg-secondary hover:border-primary/30 transition-all px-3 py-2.5 group"
            >
              <div className="text-xs font-semibold text-foreground mb-0.5">
                {tool}
              </div>
              <code className="text-[10px] text-muted-foreground line-clamp-1 group-hover:text-foreground/70 transition-colors">
                {cmd}
              </code>
              <div className="text-[9px] text-primary/0 group-hover:text-primary/60 transition-colors mt-1">
                点击复制
              </div>
            </button>
          )
        )}
      </div>
    </div>
  );
}
