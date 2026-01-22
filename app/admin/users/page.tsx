"use client";

import type React from "react";
import { useEffect, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";
import { formatDateTimeShort } from "../../../src/lib/dateUtils";
import { USER_ROLE_LABELS } from "../../../src/lib/constants";
import { Breadcrumbs } from "../../../src/components/ui";

type UserRow = {
    id: number;
    username: string;
    role: "ADMIN" | "METHODIST" | "TEACHER" | "STUDENT";
    enabled: boolean;
    createdAt: string;
};

export default function AdminUsersPage() {
    return (
        <AuthGuard roles={["ADMIN"]}>
            <Inner />
        </AuthGuard>
    );
}

function Inner() {
    const { token } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"ADMIN" | "METHODIST" | "TEACHER" | "STUDENT">("STUDENT");

    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");
    const [filterRole, setFilterRole] = useState<string>("");

    async function loadUsers() {
        setErr("");
        setLoading(true);
        try {
            const data = await apiFetch<UserRow[]>("/admin/users", { token });
            setUsers(data);
        } catch (e: unknown) {
            const error = e as { message?: string };
            setErr(error.message || "Ошибка загрузки пользователей");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr("");
        setOk("");

        if (!username.trim() || !password.trim()) {
            setErr("Заполните логин и пароль");
            return;
        }

        try {
            await apiFetch("/admin/users", {
                method: "POST",
                token,
                body: { username: username.trim(), password, role },
            });

            setOk("Пользователь создан");
            setUsername("");
            setPassword("");
            await loadUsers();
        } catch (e: unknown) {
            const error = e as { message?: string };
            setErr(error.message || "Ошибка создания");
        }
    }

    async function handleDelete(user: UserRow) {
        setErr("");
        setOk("");

        const confirmed = confirm(`Удалить пользователя "${user.username}"?`);
        if (!confirmed) return;

        try {
            await apiFetch(`/admin/users/${user.id}`, { method: "DELETE", token });
            setOk("Пользователь удалён");
            await loadUsers();
        } catch (e: unknown) {
            const error = e as { message?: string };
            setErr(error.message || "Ошибка удаления");
        }
    }

    async function handleToggleEnabled(user: UserRow) {
        setErr("");
        try {
            await apiFetch(`/admin/users/${user.id}/toggle-enabled`, { method: "POST", token });
            await loadUsers();
        } catch (e: unknown) {
            const error = e as { message?: string };
            setErr(error.message || "Ошибка изменения статуса");
        }
    }

    const filteredUsers = filterRole 
        ? users.filter(u => u.role === filterRole)
        : users;

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === "ADMIN").length,
        methodists: users.filter(u => u.role === "METHODIST").length,
        teachers: users.filter(u => u.role === "TEACHER").length,
        students: users.filter(u => u.role === "STUDENT").length,
    };

    return (
        <div className="page-container">
            <Breadcrumbs items={[
                { label: "Главная", href: "/" },
                { label: "Админ" },
                { label: "Пользователи" }
            ]} />

            <h2 className="page-title">👤 Управление пользователями</h2>

            {/* Статистика */}
            <div className="users-stats">
                <div className="users-stat" onClick={() => setFilterRole("")}>
                    <div className="users-stat-value">{stats.total}</div>
                    <div className="users-stat-label">Всего</div>
                </div>
                <div className="users-stat users-stat-admin" onClick={() => setFilterRole("ADMIN")}>
                    <div className="users-stat-value">{stats.admins}</div>
                    <div className="users-stat-label">Админов</div>
                </div>
                <div className="users-stat users-stat-methodist" onClick={() => setFilterRole("METHODIST")}>
                    <div className="users-stat-value">{stats.methodists}</div>
                    <div className="users-stat-label">Методистов</div>
                </div>
                <div className="users-stat users-stat-teacher" onClick={() => setFilterRole("TEACHER")}>
                    <div className="users-stat-value">{stats.teachers}</div>
                    <div className="users-stat-label">Преподавателей</div>
                </div>
                <div className="users-stat users-stat-student" onClick={() => setFilterRole("STUDENT")}>
                    <div className="users-stat-value">{stats.students}</div>
                    <div className="users-stat-label">Студентов</div>
                </div>
            </div>

            {/* Форма создания */}
            <div className="card users-form-card">
                <h4 className="users-form-title">➕ Создать пользователя</h4>
                <form onSubmit={handleSubmit} className="users-form">
                    <div className="form-group">
                        <label className="form-label">Логин *</label>
                        <input
                            className="input"
                            placeholder="ivanov"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Пароль *</label>
                        <input
                            className="input"
                            placeholder="••••••••"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Роль</label>
                        <select
                            className="input"
                            value={role}
                            onChange={(e) => setRole(e.target.value as "ADMIN" | "METHODIST" | "TEACHER" | "STUDENT")}
                        >
                            <option value="STUDENT">👨‍🎓 Студент</option>
                            <option value="TEACHER">👨‍🏫 Преподаватель</option>
                            <option value="METHODIST">📋 Методист</option>
                            <option value="ADMIN">👑 Администратор</option>
                        </select>
                    </div>
                    <button className="btn btn-primary" type="submit">
                        Создать
                    </button>
                </form>
                {err && <div className="error">{err}</div>}
                {ok && <div className="ok">{ok}</div>}
            </div>

            {/* Список пользователей */}
            <div className="card">
                <div className="users-list-header">
                    <h4>📋 Список пользователей {filterRole && `(${USER_ROLE_LABELS[filterRole as keyof typeof USER_ROLE_LABELS]})`}</h4>
                    <div className="users-list-actions">
                        {filterRole && (
                            <button className="btn btn-sm btn-secondary" onClick={() => setFilterRole("")}>
                                Сбросить фильтр
                            </button>
                        )}
                        <button className="btn btn-sm" onClick={loadUsers} disabled={loading}>
                            {loading ? "..." : "🔄 Обновить"}
                        </button>
                    </div>
                </div>

                {loading && <div className="loading-state">Загрузка...</div>}

                {!loading && filteredUsers.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        {filterRole ? "Нет пользователей с такой ролью" : "Нет пользователей"}
                    </div>
                )}

                {!loading && filteredUsers.length > 0 && (
                    <div className="users-table-wrapper">
                        <table className="table users-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Логин</th>
                                    <th>Роль</th>
                                    <th>Статус</th>
                                    <th>Создан</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={!user.enabled ? "user-disabled" : ""}>
                                        <td className="user-id">{user.id}</td>
                                        <td className="user-username">
                                            <span className="user-avatar">{user.username[0].toUpperCase()}</span>
                                            {user.username}
                                        </td>
                                        <td>
                                            <span className={`role-badge role-${user.role.toLowerCase()}`}>
                                                {user.role === "ADMIN" && "👑 "}
                                                {user.role === "METHODIST" && "📋 "}
                                                {user.role === "TEACHER" && "👨‍🏫 "}
                                                {user.role === "STUDENT" && "👨‍🎓 "}
                                                {USER_ROLE_LABELS[user.role]}
                                            </span>
                                        </td>
                                        <td>
                                            <span 
                                                className={`status-indicator ${user.enabled ? "status-active" : "status-inactive"}`}
                                                onClick={() => handleToggleEnabled(user)}
                                                title="Нажмите для переключения"
                                            >
                                                {user.enabled ? "✅ Активен" : "❌ Отключён"}
                                            </span>
                                        </td>
                                        <td className="user-date">{formatDateTimeShort(user.createdAt)}</td>
                                        <td>
                                            <button 
                                                className="btn btn-sm btn-icon btn-icon-danger" 
                                                onClick={() => handleDelete(user)}
                                                title="Удалить"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
