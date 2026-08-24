"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSupabaseSession } from "@/lib/useSupabaseSession";

export function SiteHeader() {
  const session = useSupabaseSession();

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">LPT</span>
          <span className="hidden text-xs text-muted sm:inline">Life Pattern Type</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/dashboard">대시보드</NavLink>
          <NavLink href="/start">시작하기</NavLink>
          {session.configured && (
            <NavLink href="/login">{session.user ? "내 계정" : "로그인"}</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-2 text-muted transition-colors hover:bg-surface hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
