"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBar, HardDrives, ImageSquare, GearSix } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: ChartBar, exact: true },
  { href: "/admin/library", label: "Library", icon: ImageSquare },
  { href: "/admin/r2", label: "R2 Storage", icon: HardDrives },
  { href: "/admin/settings", label: "Settings", icon: GearSix },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-1.5 overflow-x-auto border-b border-border/40 pb-3">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
              isActive
                ? "bg-foreground text-background shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" weight={isActive ? "bold" : "regular"} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
