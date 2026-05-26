"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { problemsApi, tagsApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

// We'll redirect to the main create page with an 'edit' flag or just build a small wrapper
// For now, let's create a dedicated edit page that fetches data and passes it to a form

export default function EditProblemPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     // Check if user is admin
     // Then redirect to create page with slug for now (we'll need to update create page to handle editing)
     // Or just implement a simple redirect for now
     router.push(`/create?edit=${slug}`);
  }, [slug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-kenyx-accent animate-spin" />
    </div>
  );
}
