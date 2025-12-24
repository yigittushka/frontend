"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";

export default function AdminCatalogPage() {
    return (
        <AuthGuard roles={["ADMIN"]}>
            <AdminCatalogInner />
        </AuthGuard>
    );
}

function AdminCatalogInner() {
    const { token } = useAuth();
    const [groups, setGroups] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [err, setErr] = useState("");

    useEffect(() => {
        let alive = true;
        (async () => {
            setErr("");
            try {
                const [g, s, r] = await Promise.all([
                    apiFetch("/catalog/groups", { token }),
                    apiFetch("/catalog/subjects", { token }),
                    apiFetch("/catalog/rooms", { token })
                ]);
                if (!alive) return;
                setGroups(g); setSubjects(s); setRooms(r);
            } catch (e) {
                if (alive) setErr(e.message || "Ошибка загрузки");
            }
        })();
        return () => { alive = false; };
    }, [token]);

    function getRoomTypeIcon(type) {
        switch (type) {
            case "LECTURE":
                return "🎓";
            case "LAB":
                return "🔬";
            case "CLASS":
                return "📚";
            default:
                return "🏢";
        }
    }

    function getRoomTypeName(type) {
        switch (type) {
            case "LECTURE":
                return "Лекционная";
            case "LAB":
                return "Лаборатория";
            case "CLASS":
                return "Класс";
            default:
                return type;
        }
    }

    return (
        <div>
            <h3 style={{ marginTop: 0, marginBottom: 24 }}>Справочники</h3>
            {err && <div className="error" style={{ marginBottom: 20 }}>{err}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
                {/* Группы */}
                <div className="catalog-card">
                    <div className="catalog-card-header" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                        <span style={{ fontSize: 24, marginRight: 8 }}>👥</span>
                        <h4 style={{ margin: 0, color: "white" }}>Группы студентов</h4>
                        <span className="catalog-count">{groups.length}</span>
                    </div>
                    <div className="catalog-card-content">
                        {groups.length === 0 ? (
                            <div className="muted" style={{ textAlign: "center", padding: "20px 0" }}>
                                Нет групп
                            </div>
                        ) : (
                            groups.map((x) => (
                                <div key={x.id} className="catalog-item">
                                    <div className="catalog-item-code">{x.code}</div>
                                    <div className="catalog-item-title">{x.title}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Дисциплины */}
                <div className="catalog-card">
                    <div className="catalog-card-header" style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}>
                        <span style={{ fontSize: 24, marginRight: 8 }}>📖</span>
                        <h4 style={{ margin: 0, color: "white" }}>Дисциплины</h4>
                        <span className="catalog-count">{subjects.length}</span>
                    </div>
                    <div className="catalog-card-content">
                        {subjects.length === 0 ? (
                            <div className="muted" style={{ textAlign: "center", padding: "20px 0" }}>
                                Нет дисциплин
                            </div>
                        ) : (
                            subjects.map((x) => (
                                <div key={x.id} className="catalog-item">
                                    <div className="catalog-item-code">{x.code}</div>
                                    <div className="catalog-item-title">{x.title}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Аудитории */}
                <div className="catalog-card">
                    <div className="catalog-card-header" style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}>
                        <span style={{ fontSize: 24, marginRight: 8 }}>🏢</span>
                        <h4 style={{ margin: 0, color: "white" }}>Аудитории</h4>
                        <span className="catalog-count">{rooms.length}</span>
                    </div>
                    <div className="catalog-card-content">
                        {rooms.length === 0 ? (
                            <div className="muted" style={{ textAlign: "center", padding: "20px 0" }}>
                                Нет аудиторий
                            </div>
                        ) : (
                            rooms.map((x) => (
                                <div key={x.id} className="catalog-item">
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 18 }}>{getRoomTypeIcon(x.type)}</span>
                                        <div className="catalog-item-code">{x.code}</div>
                                    </div>
                                    <div className="catalog-item-title">
                                        {getRoomTypeName(x.type)} • Вместимость: {x.capacity} мест
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}