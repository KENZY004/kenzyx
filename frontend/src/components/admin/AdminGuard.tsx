"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "admin") {
      router.push("/problems");
      return;
    }

    setAuthorized(true);
  }, [user, isInitialized, router]);

  if (!isInitialized || !authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-kenyx-bg gap-4">
        <Loader2 className="h-8 w-8 text-kenyx-accent animate-spin" />
        <span className="text-sm text-kenyx-text-muted font-medium tracking-widest uppercase">
          Verifying Credentials...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
