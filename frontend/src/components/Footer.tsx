export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/30 bg-background/50 backdrop-blur-sm">
      <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col items-center gap-4 text-center">
        {/* Brand */}
        <div className="text-sm font-bold tracking-wide text-muted-foreground/60">
          <span className="text-foreground/50">&lt;</span>
          <span className="text-foreground/70">云枢智创</span>
          <span className="text-foreground/50">/&gt;</span>
        </div>

        {/* Links */}
        <div className="flex gap-6 text-xs text-muted-foreground/50">
          <a href="https://lain42.top" className="hover:text-primary transition-colors">Lain42</a>
          <a href="https://lycobrain.top" target="_blank" rel="noopener" className="hover:text-primary transition-colors">LycoBrain</a>
          <a href="https://github.com/lilyco-42" target="_blank" rel="noopener" className="hover:text-primary transition-colors">GitHub</a>
        </div>

        {/* ICP 备案 */}
        <div className="text-[11px] text-muted-foreground/40 leading-relaxed">
          <p>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" className="hover:text-muted-foreground/60 transition-colors">
              <img src="https://lain42-downloads.oss-cn-shanghai.aliyuncs.com/static/icp-icon.svg" alt="" className="inline-block w-3.5 h-3.5 mr-1 align-text-bottom opacity-40" />
              皖ICP备2025106854号
            </a>
            <span className="mx-2">|</span>
            <a href="https://beian.mps.gov.cn/#/query/webSearch?code=34082602221152" target="_blank" rel="noopener" className="hover:text-muted-foreground/60 transition-colors">
              <img src="https://lain42-downloads.oss-cn-shanghai.aliyuncs.com/static/icp-icon.svg" alt="" className="inline-block w-3.5 h-3.5 mr-1 align-text-bottom opacity-40" />
              皖公网安备34082602221152号
            </a>
          </p>
          <p className="mt-1">
            主办单位：宿松县云枢智创数码信息科技服务工作室（个体工商户）
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground/30">
          &copy; 2024-2026 云枢智创 All rights reserved
        </p>
      </div>
    </footer>
  );
}
