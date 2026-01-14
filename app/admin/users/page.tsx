"use client";

import type React from "react";
import { useEffect, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";

type UserRow = {
    id: number;
    username: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | string;
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

    
    const [username, setU] = useState("");
    const [password, setP] = useState("");
    const [role, setRole] = useState<"ADMIN" | "TEACHER" | "STUDENT">("STUDENT");

    
    const [users, setUsers] = useState<UserRow[]>([]);
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");

    async function loadUsers() {
        setErr("");
        try {
            const data = await apiFetch<UserRow[]>("/admin/users", { token });
            setUsers(data);
        } catch (e: any) {
            setErr(e.message || "Ошибка загрузки пользователей");
        }
    }

    useEffect(() => {
        loadUsers();
        
    }, []);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErr("");
        setOk("");

        try {
            await apiFetch("/admin/users", {
                method: "POST",
                token,
                body: { username, password, role },
            });

            setOk("Пользователь создан");
            setU("");
            setP("");
            await loadUsers();
        } catch (e: any) {
            setErr(e.message || "Ошибка создания");
        }
    }

    async function deleteUser(id: number) {
        setErr("");
        setOk("");

        const confirmed = confirm(`Удалить пользователя ID=${id}?`);
        if (!confirmed) return;

        try {
            await apiFetch(`/admin/users/${id}`, { method: "DELETE", token });
            setOk("Пользователь удалён");
            await loadUsers();
        } catch (e: any) {
            
            setErr(e.message || "Ошибка удаления");
        }
    }

    return (
        <div className="card">
            <h3 style={{ marginTop: 0 }}>Пользователи (ADMIN)</h3>

            <form
                onSubmit={submit}
                style={{ display: "grid", gap: 8, maxWidth: 520, marginBottom: 16 }}
            >
                <input
                    className="input"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setU(e.target.value)}
                />
                <input
                    className="input"
                    placeholder="password"
                    type="password"
                    value={password}
                    onChange={(e) => setP(e.target.value)}
                />
                <select
                    className="input"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                >
                    <option value="STUDENT">STUDENT</option>
                    <option value="TEACHER">TEACHER</option>
                    <option value="ADMIN">ADMIN</option>
                </select>

                <button className="btn" type="submit">
                    Создать пользователя
                </button>

                {err && <div className="error">{err}</div>}
                {ok && <div className="ok">{ok}</div>}
            </form>

            <div className="row" style={{ marginBottom: 10 }}>
                <h4 style={{ margin: 0 }}>Список пользователей</h4>
                <button className="btn" onClick={loadUsers}>
                    Обновить
                </button>
            </div>

            <table className="table">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Enabled</th>
                    <th>CreatedAt</th>
                    <th>Действия</th>
                </tr>
                </thead>

                <tbody>
                {users.map((u) => (
                    <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.username}</td>
                        <td>{u.role}</td>
                        <td>{String(u.enabled)}</td>
                        <td>{u.createdAt}</td>
                        <td>
                            <button className="btn" onClick={() => deleteUser(u.id)}>
                                Удалить
                            </button>
                        </td>
                    </tr>
                ))}

                {users.length === 0 && (
                    <tr>
                        <td colSpan={6} className="muted">
                            Нет пользователей
                        </td>
                    </tr>
                )}
                </tbody>
            </table>

            <div className="muted" style={{ marginTop: 10 }}>
            </div>
        </div>
    );
}