"use client";

import React from "react";
import { useSidebar } from "./SidebarProvider";
import { NavRail } from "./NavRail";
import { BottomNav } from "./BottomNav";

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { navAberto } = useSidebar();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <NavRail />

      {/* Adjust padding for Sidebar on Desktop and BottomNav on Mobile */}
      <div className={`transition-[padding] duration-200 ease-out pb-24 md:pb-0 pl-0 ${navAberto ? "md:pl-56" : "md:pl-16"}`}>
        <div className="p-2.5 md:p-4">
          <div className="h-[calc(100vh-1.25rem-4.5rem)] md:h-[calc(100vh-2rem)] flex flex-col overflow-hidden rounded-2xl bg-surface/40">
            {children}
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}
