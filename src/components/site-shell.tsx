"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, Info, Sparkles } from "lucide-react";
import { useHandleStore } from "@/lib/client-store";

const NAV = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/about", label: "How it works", icon: Info }
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data } = useHandleStore();
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="atmosphere" aria-hidden="true"/>
      <header className="relative z-10 border-b border-white/[0.07] bg-[#090b14]/80 backdrop-blur-xl">
        <div className="main-wrap flex min-h-[78px] items-center gap-6">
          <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="HandleHunt home">
            <span className="logo-icon"><Sparkles size={22} strokeWidth={2.5}/></span>
            <span className="text-[21px] tracking-[-0.05em] font-extrabold text-white">handle<span className="text-[#bf91ff]">hunt</span><span className="ml-1 align-top text-[10px] tracking-normal text-white/45">BETA</span></span>
          </Link>
          <nav aria-label="Primary navigation" className="ml-auto flex items-center gap-1 sm:gap-2">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item ${path === href ? "nav-item-active" : ""}`}>
                <Icon size={16}/><span className="hidden sm:inline">{label}</span>
                {href === "/saved" && data.saved.length > 0 ? <span className="nav-count">{data.saved.length}</span> : null}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="relative z-10">{children}</div>
      <footer className="relative z-10 border-t border-white/[0.07] py-7 text-center text-xs text-[#7f8298]">
        HandleHunt · Discover thoughtfully. Verify on Instagram. · Independent project, not affiliated with Meta or Instagram.
      </footer>
    </div>
  );
}
