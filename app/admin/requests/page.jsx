"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";

export default function AdminRequestsPage() {
    return (
        <AuthGuard roles={["ADMIN"]}>
            <AdminRequestsInner />
        </AuthGuard>
    );
}

function AdminRequestsInner() {
    const { token } = useAuth();

    const [requests, setRequests] = useState([]);
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    async function loadRequests() {
        setErr("");
        setLoading(true);
        try {
            const data = await apiFetch("/changes/new", { token });
            setRequests(data || []);
        } catch (e) {
            setErr(e.message || "Ошибка загрузки заявок");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadRequests();
    }, []); // eslint-disable-line

    async function handleApprove(id) {
        setErr("");
        setOk("");
        setProcessingId(id);

        try {
            await apiFetch(`/changes/${id}/approve`, {
                method: "POST",
                token,
            });
            setOk(`Заявка #${id} одобрена`);
            await loadRequests();
        } catch (e) {
            setErr(e.message || "Ошибка одобрения");
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(id) {
        setErr("");
        setOk("");
        
        const confirmed = confirm(`Отклонить заявку #${id}?`);
        if (!confirmed) return;

        setProcessingId(id);

        try {
            await apiFetch(`/changes/${id}/reject`, {
                method: "POST",
                token,
            });
            setOk(`Заявка #${id} отклонена`);
            await loadRequests();
        } catch (e) {
            setErr(e.message || "Ошибка отклонения");
        } finally {
            setProcessingId(null);
        }
    }

    function formatDate(isoString) {
        if (!isoString) return "";
        const date = new Date(isoString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    return (
        <div className="card">
            <h3 style={{ marginTop: 0 }}>Заявки на изменение расписания (ADMIN)</h3>

            {err && <div className="error" style={{ marginBottom: 16 }}>{err}</div>}
            {ok && <div className="ok" style={{ marginBottom: 16 }}>{ok}</div>}

            <div className="row" style={{ marginBottom: 16 }}>
                <div className="muted">
                    Новых заявок: <strong>{requests.length}</strong>
                </div>
                <button className="btn" onClick={loadRequests} disabled={loading}>
                    {loading ? "Загрузка..." : "Обновить"}
                </button>
            </div>

            {loading && <div className="muted">Загрузка...</div>}

            {!loading && requests.length === 0 && (
                <div className="muted" style={{ padding: "40px 0", textAlign: "center" }}>
                    Нет новых заявок на рассмотрение
                </div>
            )}

            {!loading && requests.length > 0 && (
                <div style={{ display: "grid", gap: 16 }}>
                    {requests.map((req) => (
                        <div
                            key={req.id}
                            style={{
                                padding: 16,
                                border: "1px solid #e0e0e0",
                                borderRadius: 8,
                                background: "#fafafa",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                                        Заявка #{req.id}
                                    </div>
                                    <div className="muted" style={{ fontSize: 13 }}>
                                        Занятие ID: {req.lessonId} • Создана: {formatDate(req.createdAt)}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        padding: "4px 12px",
                                        borderRadius: 4,
                                        background: "#fff3cd",
                                        color: "#856404",
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}
                                >
                                    {req.status}
                                </div>
                            </div>

                            <div
                                style={{
                                    padding: 12,
                                    background: "#fff",
                                    borderRadius: 6,
                                    marginBottom: 12,
                                    border: "1px solid #eee",
                                }}
                            >
                                <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                                    Сообщение от преподавателя:
                                </div>
                                <div style={{ whiteSpace: "pre-wrap" }}>
                                    {req.message || "—"}
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    className="btn"
                                    onClick={() => handleApprove(req.id)}
                                    disabled={processingId === req.id}
                                    style={{
                                        background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                                        color: "#fff",
                                        border: "none",
                                    }}
                                >
                                    {processingId === req.id ? "..." : "✓ Одобрить"}
                                </button>
                                <button
                                    className="btn"
                                    onClick={() => handleReject(req.id)}
                                    disabled={processingId === req.id}
                                    style={{
                                        background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                                        color: "#fff",
                                        border: "none",
                                    }}
                                >
                                    {processingId === req.id ? "..." : "✗ Отклонить"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="muted" style={{ marginTop: 20, fontSize: 13 }}>
                <strong>Примечание:</strong> После одобрения заявки необходимо вручную внести изменения в расписание.
            </div>
        </div>
    );
}
