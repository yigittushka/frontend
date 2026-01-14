"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as jwt from "jwt-decode"; 
import { getToken, setToken } from "../lib/auth";

type JwtUser = {
    sub: string;
    username?: string;
    role?: "ADMIN" | "TEACHER" | "STUDENT";
    exp?: number;
    iat?: number;
};

type AuthContextValue = {
    token: string;
    user: JwtUser | null;
    ready: boolean;              
    login: (t: string) => void;
    logout: () => void;
};

const AuthCtx = createContext<AuthContextValue | null>(null);

function decodeToken(t: string): JwtUser | null {
    try {
        const fn = (jwt as any).jwtDecode || (jwt as any).default; 
        if (!fn) return null;
        return fn(t) as JwtUser;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setTok] = useState("");
    const [user, setUser] = useState<JwtUser | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const t = getToken();
        setTok(t);
        setUser(t ? decodeToken(t) : null);
        setReady(true); 
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        token,
        user,
        ready,
        login: (t: string) => {
            setToken(t);
            setTok(t);
            setUser(decodeToken(t));
        },
        logout: () => {
            setToken("");
            setTok("");
            setUser(null);
        }
    }), [token, user, ready]);

    return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthCtx);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}