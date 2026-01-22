"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";

export default function MethodistRequestsPage() {
    return (
        <AuthGuard roles={["ADMIN", "METHODIST"]}>
            <MethodistRequestsInner />
        </AuthGuard>
    );
}

function MethodistRequestsInner() {
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

    function formatDateTime(isoString) {
        if (!isoString) return "";
        const date = new Date(isoString);
        return date.toLocaleDateString("ru-RU", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatTime(isoString) {
        if (!isoString) return "";
        const date = new Date(isoString);
        return date.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatDate(isoString) {
        if (!isoString) return "";
        const date = new Date(isoString);
        return date.toLocaleDateString("ru-RU", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });
    }

    function getLessonTypeStyle(type) {
        switch (type) {
            case "LECTURE":
                return { background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" };
            case "PRACTICE":
                return { background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" };
            case "LAB":
                return { background: "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)" };
            default:
                return { background: "#888" };
        }
    }

    function getLessonTypeName(type) {
        switch (type) {
            case "LECTURE": return "Лекция";
            case "PRACTICE": return "Практика";
            case "LAB": return "Лаб. работа";
            default: return type;
        }
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.pageTitle}>📋 Заявки на изменение расписания</h2>

            {err && <div className="error" style={{ marginBottom: 16 }}>{err}</div>}
            {ok && <div className="ok" style={{ marginBottom: 16 }}>{ok}</div>}

            <div style={styles.header}>
                <div style={styles.counter}>
                    <span style={styles.counterIcon}>📨</span>
                    <span>Новых заявок: <strong>{requests.length}</strong></span>
                </div>
                <button className="btn" onClick={loadRequests} disabled={loading}>
                    {loading ? "Загрузка..." : "🔄 Обновить"}
                </button>
            </div>

            {loading && (
                <div style={styles.loading}>Загрузка заявок...</div>
            )}

            {!loading && requests.length === 0 && (
                <div style={styles.empty}>
                    <div style={styles.emptyIcon}>✅</div>
                    <div>Нет новых заявок на рассмотрение</div>
                </div>
            )}

            {!loading && requests.length > 0 && (
                <div style={styles.requestsList}>
                    {requests.map((req) => (
                        <div key={req.id} style={styles.requestCard}>
                            {/* Заголовок карточки */}
                            <div style={styles.cardHeader}>
                                <div style={styles.requestId}>Заявка #{req.id}</div>
                                <div style={styles.badge}>🕐 На рассмотрении</div>
                            </div>

                            <div style={styles.cardBody}>
                                {/* Информация о преподавателе */}
                                <div style={styles.section}>
                                    <div style={styles.sectionTitle}>👤 Преподаватель</div>
                                    <div style={styles.teacherInfo}>
                                        <div style={styles.teacherName}>{req.teacherName}</div>
                                        {req.teacherEmail && (
                                            <div style={styles.teacherEmail}>{req.teacherEmail}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Информация о занятии */}
                                <div style={styles.section}>
                                    <div style={styles.sectionTitle}>📚 Занятие</div>
                                    <div style={styles.lessonCard}>
                                        <div style={{
                                            ...styles.lessonType,
                                            ...getLessonTypeStyle(req.lessonType)
                                        }}>
                                            {getLessonTypeName(req.lessonType)}
                                        </div>
                                        <div style={styles.lessonInfo}>
                                            <div style={styles.lessonSubject}>{req.lessonSubject}</div>
                                            <div style={styles.lessonMeta}>
                                                <span>📅 {formatDate(req.lessonStartsAtIso)}</span>
                                            </div>
                                            <div style={styles.lessonMeta}>
                                                <span>🕐 {formatTime(req.lessonStartsAtIso)} – {formatTime(req.lessonEndsAtIso)}</span>
                                                <span>🚪 {req.lessonRoom}</span>
                                                <span>👥 {req.lessonTarget}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Сообщение */}
                                <div style={styles.section}>
                                    <div style={styles.sectionTitle}>💬 Запрос на изменение</div>
                                    <div style={styles.messageBox}>
                                        <pre style={styles.messageText}>{req.message || "—"}</pre>
                                    </div>
                                </div>

                                {/* Дата создания */}
                                <div style={styles.createdAt}>
                                    Создана: {formatDateTime(req.createdAtIso)}
                                </div>
                            </div>

                            {/* Кнопки действий */}
                            <div style={styles.cardFooter}>
                                <button
                                    className="btn"
                                    onClick={() => handleApprove(req.id)}
                                    disabled={processingId === req.id}
                                    style={styles.approveBtn}
                                >
                                    {processingId === req.id ? "..." : "✓ Одобрить"}
                                </button>
                                <button
                                    className="btn"
                                    onClick={() => handleReject(req.id)}
                                    disabled={processingId === req.id}
                                    style={styles.rejectBtn}
                                >
                                    {processingId === req.id ? "..." : "✗ Отклонить"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={styles.note}>
                <strong>💡 Примечание:</strong> После одобрения заявки необходимо вручную внести изменения в расписание через раздел "Расписание".
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: "24px",
        maxWidth: "900px",
        margin: "0 auto",
    },
    pageTitle: {
        fontSize: "28px",
        fontWeight: "700",
        marginBottom: "24px",
        color: "#1a1a1a",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
        padding: "16px 20px",
        background: "white",
        borderRadius: "12px",
        border: "1px solid #e0e0e0",
    },
    counter: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "16px",
    },
    counterIcon: {
        fontSize: "24px",
    },
    loading: {
        padding: "48px",
        textAlign: "center",
        color: "#666",
        fontSize: "16px",
    },
    empty: {
        padding: "64px 24px",
        textAlign: "center",
        background: "white",
        borderRadius: "16px",
        border: "1px solid #e0e0e0",
        color: "#666",
    },
    emptyIcon: {
        fontSize: "48px",
        marginBottom: "16px",
    },
    requestsList: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    requestCard: {
        background: "white",
        borderRadius: "16px",
        border: "1px solid #e0e0e0",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
        borderBottom: "1px solid #e0e0e0",
    },
    requestId: {
        fontSize: "18px",
        fontWeight: "700",
        color: "#333",
    },
    badge: {
        padding: "6px 14px",
        borderRadius: "20px",
        background: "#fff3cd",
        color: "#856404",
        fontSize: "13px",
        fontWeight: "600",
    },
    cardBody: {
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    section: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    sectionTitle: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#667eea",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    teacherInfo: {
        padding: "12px 16px",
        background: "#f8f9fa",
        borderRadius: "10px",
    },
    teacherName: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#333",
    },
    teacherEmail: {
        fontSize: "14px",
        color: "#666",
        marginTop: "4px",
    },
    lessonCard: {
        display: "flex",
        background: "#f8f9fa",
        borderRadius: "12px",
        overflow: "hidden",
    },
    lessonType: {
        minWidth: "100px",
        padding: "16px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "600",
        fontSize: "12px",
        textAlign: "center",
        textTransform: "uppercase",
    },
    lessonInfo: {
        flex: 1,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    lessonSubject: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#1a1a1a",
    },
    lessonMeta: {
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        fontSize: "13px",
        color: "#666",
    },
    messageBox: {
        padding: "16px",
        background: "#f0f4ff",
        borderRadius: "10px",
        borderLeft: "4px solid #667eea",
    },
    messageText: {
        margin: 0,
        fontSize: "14px",
        color: "#333",
        whiteSpace: "pre-wrap",
        fontFamily: "inherit",
        lineHeight: "1.6",
    },
    createdAt: {
        fontSize: "12px",
        color: "#888",
        textAlign: "right",
    },
    cardFooter: {
        display: "flex",
        gap: "12px",
        padding: "16px 20px",
        background: "#fafafa",
        borderTop: "1px solid #e0e0e0",
    },
    approveBtn: {
        flex: 1,
        padding: "12px 20px",
        background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
        color: "#fff",
        border: "none",
        fontWeight: "600",
    },
    rejectBtn: {
        flex: 1,
        padding: "12px 20px",
        background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
        color: "#fff",
        border: "none",
        fontWeight: "600",
    },
    note: {
        marginTop: "24px",
        padding: "16px 20px",
        background: "#fff3cd",
        borderRadius: "12px",
        fontSize: "14px",
        color: "#856404",
    },
};
