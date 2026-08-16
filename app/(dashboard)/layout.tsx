import React from "react";
import { SidebarProvider } from "@/components/SidebarProvider";
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient";
import { AIAssistant } from "@/components/AIAssistant";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardLayoutClient>
        {children}
        <AIAssistant />
      </DashboardLayoutClient>
    </SidebarProvider>
  );
}
