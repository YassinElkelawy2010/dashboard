"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { LayoutDashboard, ListChecks, PlusCircle, ScrollText, Settings } from "lucide-react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(99,102,241,0.22),transparent),radial-gradient(900px_500px_at_100%_0%,rgba(236,72,153,0.18),transparent)]">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-6 py-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-8 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_60px_rgba(99,102,241,0.12)] backdrop-blur">
            <div className="px-2 pb-3">
              <div className="text-xs font-medium uppercase tracking-wider text-white/50">GVRA</div>
              <div className="text-lg font-semibold">Command Dashboard</div>
              <div className="mt-1 text-sm text-white/60">Configure slash commands, fields, and responses.</div>
            </div>

            <nav className="mt-2 space-y-1">
              <NavItem href="/app" icon={<LayoutDashboard className="h-4 w-4" />} label="Overview" active={pathname === "/app"} />
              <NavItem
                href="/app/commands"
                icon={<ListChecks className="h-4 w-4" />}
                label="Commands"
                active={pathname.startsWith("/app/commands")}
              />
              <NavItem
                href="/app/commands/new"
                icon={<PlusCircle className="h-4 w-4" />}
                label="Create"
                active={pathname === "/app/commands/new"}
              />
              <NavItem href="/app/audit" icon={<ScrollText className="h-4 w-4" />} label="Audit" active={pathname.startsWith("/app/audit")} />
              <NavItem href="/app/settings" icon={<Settings className="h-4 w-4" />} label="Settings" active={pathname.startsWith("/app/settings")} />
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function NavItem(props: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={props.href}
      className={[
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
        props.active
          ? "border border-indigo-300/20 bg-indigo-500/25 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]"
          : "text-white/80 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      <span className={props.active ? "text-white" : "text-white/70"}>{props.icon}</span>
      <span className="font-medium">{props.label}</span>
    </Link>
  );
}
