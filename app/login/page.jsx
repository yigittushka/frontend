"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../src/lib/api";
import { useAuth } from "../../src/components/AuthProvider";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        setLoading(true);

        try {
            const res = await apiFetch("/auth/login", {
                method: "POST",
                body: { username, password },
            });

            // res: { accessToken, role, username }
            login(res.accessToken);

            // ✅ редирект по роли
            if (res.role === "ADMIN") router.replace("/admin/catalog");
            else router.replace("/my");
        } catch (e2) {
            setErr(e2.message || "Ошибка входа");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card" style={{ maxWidth: 420 }}>
            <h3 style={{ marginTop: 0 }}>Вход</h3>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
                <input
                    className="input"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                />

                <input
                    className="input"
                    placeholder="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                />

                <button className="btn" disabled={loading} type="submit">
                    {loading ? "Входим..." : "Войти"}
                </button>

                {err && <div className="error">{err}</div>}
            </form>

            <div className="muted" style={{ marginTop: 10 }}>
                Backend должен быть запущен на <b>localhost:8080</b>
            </div>
        </div>
    );
}