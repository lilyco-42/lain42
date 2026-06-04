"""Dynamically fetch latest stable versions from Chinese mirrors."""
import asyncio
import re
import json
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import httpx

# Cache: refresh every 6 hours
_cache: dict = {}
_cache_time: datetime | None = None
CACHE_TTL = timedelta(hours=6)


@dataclass
class MirrorDownload:
    tool: str
    name: str
    url: str
    version: str
    os: str
    arch: str
    size: str = ""
    mirror: str = ""


async def _fetch_tuna_github_release(repo: str, pattern: str, tool: str) -> list[dict]:
    """Scrape latest release from TUNA GitHub mirror listing."""
    results = []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            url = f"https://mirrors.tuna.tsinghua.edu.cn/github-release/{repo}/"
            resp = await client.get(url)
            if resp.status_code != 200:
                return results
            # Find latest version directory
            versions = re.findall(r'href="([^"]+)/"', resp.text)
            versions = [v for v in versions if re.match(r'^v?\d+\.\d+', v)]
            if not versions:
                return results
            versions.sort(key=lambda v: [int(x) for x in re.findall(r'\d+', v)], reverse=True)
            latest = versions[0]

            # Get files in latest version
            url2 = f"{url}{latest}/"
            resp2 = await client.get(url2)
            files = re.findall(r'href="([^"]+)"', resp2.text)
            for f in files:
                if re.search(pattern, f, re.I) and not f.endswith(".asc") and not f.endswith(".sha256"):
                    results.append({
                        "tool": tool,
                        "name": f.replace("%20", " "),
                        "url": f"{url2}{f}",
                        "version": latest.strip("/"),
                        "mirror": "清华",
                    })
    except Exception:
        pass
    return results


async def _fetch_aliyun_golang() -> list[dict]:
    """Fetch latest Go versions from Aliyun mirror."""
    results = []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://mirrors.aliyun.com/golang/")
            if resp.status_code != 200:
                return results
            versions = re.findall(r'href="(go1\.\d+\.\d+)/"', resp.text)
            versions = list(set(versions))
            versions.sort(key=lambda v: [int(x) for x in re.findall(r'\d+', v)], reverse=True)
            latest = versions[0] if versions else "go1.24.2"
            base = f"https://mirrors.aliyun.com/golang/{latest}/"

            patterns = {
                ("windows", "x86_64"): rf"{latest}\.windows-amd64\.msi",
                ("linux", "x86_64"): rf"{latest}\.linux-amd64\.tar\.gz",
                ("linux", "arm64"): rf"{latest}\.linux-arm64\.tar\.gz",
                ("macos", "x86_64"): rf"{latest}\.darwin-amd64\.pkg",
                ("macos", "arm64"): rf"{latest}\.darwin-arm64\.pkg",
            }
            resp2 = await client.get(base)
            files = re.findall(r'href="([^"]+)"', resp2.text)
            for (os, arch), pat in patterns.items():
                for f in files:
                    if re.search(pat, f, re.I):
                        results.append({
                            "tool": "Go",
                            "name": f"{latest} ({os}-{arch})",
                            "url": f"{base}{f}",
                            "version": latest,
                            "os": os, "arch": arch, "mirror": "阿里云",
                        })
    except Exception:
        pass
    return results


async def _fetch_python_versions() -> list[dict]:
    """Fetch latest Python from TUNA mirror."""
    results = []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://mirrors.tuna.tsinghua.edu.cn/python/")
            if resp.status_code != 200:
                return results
            versions = re.findall(r'href="(3\.\d+\.\d+)/"', resp.text)
            versions = list(set(versions))
            versions.sort(key=lambda v: [int(x) for x in v.split(".")], reverse=True)
            latest = versions[0] if versions else "3.13.3"
            base = f"https://mirrors.tuna.tsinghua.edu.cn/python/{latest}/"

            files_mapping = [
                ("python-{v}-amd64.exe", "windows", "x86_64"),
                ("python-{v}-macos11.pkg", "macos", "x86_64"),
                ("Python-{v}.tar.xz", "linux", "x86_64"),
            ]
            for pat, os, arch in files_mapping:
                results.append({
                    "tool": "Python",
                    "name": f"Python {latest} ({os}-{arch})",
                    "url": f"{base}{pat.format(v=latest)}",
                    "version": latest, "os": os, "arch": arch, "mirror": "清华",
                })
    except Exception:
        pass
    return results


async def _fetch_nodejs_versions() -> list[dict]:
    """Fetch latest Node.js LTS from TUNA mirror."""
    results = []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/")
            if resp.status_code != 200:
                return results
            # Find latest v22.x LTS
            versions = re.findall(r'href="(v22\.\d+\.\d+)/"', resp.text)
            versions = list(set(versions))
            versions.sort(key=lambda v: [int(x) for x in re.findall(r'\d+', v)], reverse=True)
            latest = versions[0] if versions else "v22.15.0"
            base = f"https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/{latest}/"

            files_mapping = [
                ("node-{v}-x64.msi", "windows", "x86_64"),
                ("node-{v}.pkg", "macos", "x86_64"),
                ("node-{v}-linux-x64.tar.xz", "linux", "x86_64"),
            ]
            for pat, os, arch in files_mapping:
                results.append({
                    "tool": "NodeJS",
                    "name": f"Node.js {latest} ({os}-{arch})",
                    "url": f"{base}{pat.format(v=latest)}",
                    "version": latest, "os": os, "arch": arch, "mirror": "清华",
                })
    except Exception:
        pass
    return results


async def fetch_all_mirrors() -> dict:
    """Fetch latest versions from all mirrors. Results are cached for 6 hours."""
    global _cache, _cache_time
    now = datetime.now()
    if _cache and _cache_time and (now - _cache_time) < CACHE_TTL:
        return _cache

    results = {}

    # LLVM
    llvm = await _fetch_tuna_github_release("llvm/llvm-project", r"LLVM.*win64\.exe|clang\+llvm.*x86_64.*tar\.xz|clang\+llvm.*arm64.*darwin", "LLVM/Clang")
    if llvm:
        for d in llvm:
            if "win64" in d["name"]:
                d["os"], d["arch"] = "windows", "x86_64"
            elif "darwin" in d["name"] and "arm64" in d["name"]:
                d["os"], d["arch"] = "macos", "arm64"
            elif "darwin" in d["name"]:
                d["os"], d["arch"] = "macos", "x86_64"
            elif "linux" in d["name"]:
                d["os"], d["arch"] = "linux", "x86_64"

    # Zig
    zig = await _fetch_tuna_github_release("ziglang/zig", r"zig-(windows|macos|linux)-(x86_64|aarch64).*\.(zip|tar\.xz)", "Zig")
    for d in zig:
        if "windows" in d["name"]:
            d["os"], d["arch"] = "windows", "x86_64"
        elif "macos" in d["name"] and "aarch64" in d["name"]:
            d["os"], d["arch"] = "macos", "arm64"
        elif "macos" in d["name"]:
            d["os"], d["arch"] = "macos", "x86_64"
        elif "linux" in d["name"]:
            d["os"], d["arch"] = "linux", "x86_64"

    # Rust
    rustup_urls = {
        ("windows", "x86_64"): "https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe",
    }
    results["Rust"] = [{
        "tool": "Rust", "name": "rustup 安装器", "url": rustup_urls[("windows", "x86_64")],
        "version": "latest", "os": "windows", "arch": "x86_64", "mirror": "清华",
    }]

    # Fetch various sources
    tasks = [
        _fetch_aliyun_golang(),
        _fetch_python_versions(),
        _fetch_nodejs_versions(),
    ]
    gathered = await asyncio.gather(*tasks)

    for batch in gathered:
        for d in batch:
            results.setdefault(d["tool"], []).append(d)

    if llvm:
        results["LLVM/Clang"] = llvm
    if zig:
        results["Zig"] = zig

    # Add Git latest
    results.setdefault("Git", []).append({
        "tool": "Git", "name": "Git for Windows 64-bit",
        "url": "https://mirrors.tuna.tsinghua.edu.cn/github-release/git-for-windows/git/LatestRelease/Git-2.49.0-64-bit.exe",
        "version": "2.49.0", "os": "windows", "arch": "x86_64", "mirror": "清华",
    })

    _cache = results
    _cache_time = now
    return results
