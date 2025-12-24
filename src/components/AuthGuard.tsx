"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { homeForRole } from "../lib/routes";

export default function AuthGuard({
                                      children,
                                      roles,
                                  }: {
    children: React.ReactNode;
    roles?: string[];
}) {
    const { token, user, ready } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!ready) return;

        if (!token) {
            router.replace("/login");
            return;
        }

        if (roles?.length && user?.role && !roles.includes(user.role)) {
            router.replace(homeForRole(user.role));
        }
    }, [ready, token, user?.role, roles, router]);

    if (!ready) return null;
    if (!token) return null;
    if (roles?.length && user?.role && !roles.includes(user.role)) return null;

    return <>{children}</>;
}