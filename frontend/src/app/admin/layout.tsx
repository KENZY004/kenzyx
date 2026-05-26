"use client";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-kenyx-bg text-kenyx-text-primary">
        {/* Isolated Sidebar */}
        <AdminSidebar />

        {/* Dynamic Admin Content */}
        <main className="flex-1 h-screen overflow-y-auto">
          <div className="p-8 pb-16 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
