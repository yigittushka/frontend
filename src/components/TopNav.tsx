"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { USER_ROLE_LABELS } from "../lib/constants";

export default function TopNav() {
    const { token, user, logout } = useAuth();

    const isAdmin = user?.role === "ADMIN";
    const isMethodist = user?.role === "METHODIST";
    const isTeacher = user?.role === "TEACHER";
    const isStudent = user?.role === "STUDENT";

    return (
        <nav className="top-nav">
            <Link href="/" className="top-nav-brand">
                <span className="top-nav-logo">📅</span>
                <span className="top-nav-title">Univer Timetable</span>
            </Link>

            {token && (
                <div className="top-nav-menu">
                    {(isTeacher || isStudent) && (
                        <Link href="/my" className="top-nav-link">
                            📋 Моё расписание
                        </Link>
                    )}
                    
                    {/* Админ и Методист - расписание, справочники, заявки */}
                    {(isAdmin || isMethodist) && (
                        <>
                            <Link href="/methodist/schedules" className="top-nav-link">
                                📅 Расписание
                            </Link>
                            <Link href="/methodist/schedule" className="top-nav-link">
                                ➕ Добавить
                            </Link>
                            <Link href="/methodist/rooms" className="top-nav-link">
                                🚪 Аудитории
                            </Link>
                            <Link href="/methodist/catalog" className="top-nav-link">
                                📚 Справочники
                            </Link>
                            <Link href="/methodist/requests" className="top-nav-link">
                                📝 Заявки
                            </Link>
                        </>
                    )}
                    
                    {/* Администратор - управление пользователями */}
                    {isAdmin && (
                        <Link href="/admin/users" className="top-nav-link">
                            👤 Пользователи
                        </Link>
                    )}
                    
                    {isTeacher && (
                        <Link href="/teacher/requests" className="top-nav-link">
                            📝 Мои запросы
                        </Link>
                    )}
                </div>
            )}

            <div className="top-nav-actions">
                {token ? (
                    <>
                        <div className="top-nav-user">
                            <span className="top-nav-user-avatar">
                                {(user?.username || user?.sub)?.[0]?.toUpperCase() || "?"}
                            </span>
                            <div className="top-nav-user-info">
                                <span className="top-nav-user-name">{user?.username || user?.sub || "Пользователь"}</span>
                                <span className="top-nav-user-role">
                                    {user?.role ? USER_ROLE_LABELS[user.role as keyof typeof USER_ROLE_LABELS] || user.role : ""}
                                </span>
                            </div>
                        </div>
                        <button className="btn btn-sm btn-logout" onClick={logout}>
                            Выйти
                        </button>
                    </>
                ) : (
                    <Link href="/login" className="btn btn-sm">
                        Войти
                    </Link>
                )}
            </div>
        </nav>
    );
}
