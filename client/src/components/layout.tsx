import { Link, useLocation } from "wouter";
import { 
  ShieldAlert, 
  Activity, 
  Crosshair, 
  Eye, 
  Fingerprint, 
  FileTerminal,
  Globe,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "/", label: "COMMAND CENTER", icon: Activity },
  { href: "/threats", label: "THREAT INTEL", icon: Crosshair },
  { href: "/external-intel", label: "EXTERNAL INTEL", icon: Globe },
  { href: "/deception", label: "DECEPTION GRID", icon: Eye },
  { href: "/deepfake", label: "MEDIA FORENSICS", icon: Fingerprint },
  { href: "/risk", label: "RISK POSTURE", icon: ShieldAlert },
  { href: "/audit", label: "SYSTEM LOGS", icon: FileTerminal },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded border border-primary flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
            <Crosshair className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl leading-none">NEMESIS</h1>
            <p className="text-[10px] text-primary/70 font-mono tracking-widest uppercase">System Active</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-200
                group cursor-pointer font-mono text-sm uppercase tracking-wider
                ${isActive 
                  ? "bg-primary/10 text-primary border-l-2 border-primary shadow-[inset_10px_0_20px_rgba(0,255,255,0.05)]" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground border-l-2 border-transparent"
                }
              `}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]" : "opacity-70 group-hover:opacity-100"}`} />
              <span className="mt-1">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeNav" 
                  className="absolute left-0 w-[2px] h-full bg-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-primary/20">
        <div className="bg-black/50 border border-primary/30 p-3 rounded-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-muted-foreground">DEFCON LEVEL</span>
            <span className="text-xs font-bold text-destructive animate-pulse">3</span>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div className="bg-destructive h-full w-[60%]"></div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <div className="scanline"></div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-card/80 backdrop-blur-xl border-r border-primary/20 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card/90 backdrop-blur-xl border-b border-primary/20 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Crosshair className="w-6 h-6 text-primary" />
          <span className="font-bold tracking-widest text-primary">NEMESIS</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-primary p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex flex-col md:hidden"
          >
            <div className="absolute top-4 right-4">
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden z-10 pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto space-y-6"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
