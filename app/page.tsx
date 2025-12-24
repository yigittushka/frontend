"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../src/components/AuthProvider";
import { homeForRole } from "../src/lib/routes";

export default function Home() {
  const router = useRouter();
  const { token, user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    router.replace(token ? homeForRole(user?.role) : "/login");
  }, [ready, token, user?.role, router]);

  return null;
}