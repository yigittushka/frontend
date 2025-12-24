"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function TopNav() {
    const { token, user, logout } = useAuth();

    return (
        <div className="row" style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "2px solid #f0f0f0" }}>
            <h2 style={{ margin: 0, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Univer Timetable
            </h2>

            {token ? (
                <>
                    {(user?.role === "TEACHER" || user?.role === "STUDENT") && (
                    <Link href="/my">Моё расписание</Link>
                    )}
                    {user?.role === "ADMIN" && <Link href="/admin/schedules">Все расписания</Link>}
                    {user?.role === "ADMIN" && <Link href="/admin/schedule">Добавить расписание</Link>}
                    {user?.role === "ADMIN" && <Link href="/admin/catalog">Справочники</Link>}
                    {user?.role === "ADMIN" && <Link href="/admin/users">Пользователи</Link>}
                    {user?.role === "TEACHER" && <Link href="/teacher/requests">Запросы</Link>}

                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="muted" style={{ fontSize: 14 }}>
                            {user?.username} <span style={{ color: "#999" }}>/</span> {user?.role}
                        </div>
                        <button className="btn" onClick={logout} style={{ padding: "8px 16px", fontSize: 14 }}>
                            Выйти
                        </button>
                    </div>
                </>
            ) : (
                <div style={{ marginLeft: "auto" }} className="muted">не авторизован</div>
            )}
        </div>
    );
}