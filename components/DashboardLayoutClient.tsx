"use client";

import React from "react";
import { useSidebar } from "./SidebarProvider";
import { NavRail } from "./NavRail";

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { navAberto } = useSidebar();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <NavRail />

      <div className={`transition-[padding] duration-200 ease-out ${navAberto ? "pl-56" : "pl-14 md:pl-16"}`}>
        <div className="p-2.5 md:p-4">
          <div className="h-[calc(100vh-1.25rem)] md:h-[calc(100vh-2rem)] flex flex-col overflow-hidden rounded-2xl bg-surface/40">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
