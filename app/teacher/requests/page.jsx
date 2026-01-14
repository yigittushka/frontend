"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";

export default function TeacherRequestsPage() {
    return (
        <AuthGuard roles={["TEACHER"]}>
            <TeacherRequestsInner />
        </AuthGuard>
    );
}

function TeacherRequestsInner() {
    const { token } = useAuth();
    const [lessons, setLessons] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [requests, setRequests] = useState([]);
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");
    const [loading, setLoading] = useState(true);

    // Форма изменения
    const [newDate, setNewDate] = useState("");
    const [newStartTime, setNewStartTime] = useState("");
    const [newEndTime, setNewEndTime] = useState("");
    const [newRoomId, setNewRoomId] = useState("");
    const [comment, setComment] = useState("");
    const [changeType, setChangeType] = useState("reschedule"); // reschedule, room, cancel, other

    // Загрузка занятий преподавателя (только будущие)
    async function loadLessons() {
        try {
            const now = new Date();
            const to = new Date(now);
            to.setMonth(to.getMonth() + 3);

            const data = await apiFetch(
                `/schedule/my?fromIso=${now.toISOString()}&toIso=${to.toISOString()}`,
                { token }
            );
            setLessons(data);
        } catch (e) {
            setErr(e.message || "Ошибка загрузки занятий");
        }
    }

    // Загрузка аудиторий
    async function loadRooms() {
        try {
            const data = await apiFetch("/catalog/rooms", { token });
            setRooms(data);
        } catch (e) {
            console.error("Ошибка загрузки аудиторий:", e);
        }
    }

    // Загрузка открытых заявок
    async function loadRequests() {
        try {
            const data = await apiFetch("/changes/my-open", { token });
            setRequests(data);
        } catch (e) {
            setErr(e.message || "Ошибка загрузки заявок");
        }
    }

    useEffect(() => {
        Promise.all([loadLessons(), loadRooms(), loadRequests()]).finally(() => setLoading(false));
    }, []);

    // При выборе занятия - заполняем форму текущими значениями
    useEffect(() => {
        if (selectedLesson) {
            const startDate = new Date(selectedLesson.startsAtIso);
            const endDate = new Date(selectedLesson.endsAtIso);
            
            setNewDate(startDate.toISOString().split('T')[0]);
            setNewStartTime(startDate.toTimeString().slice(0, 5));
            setNewEndTime(endDate.toTimeString().slice(0, 5));
            
            // Найти ID текущей аудитории
            const currentRoom = rooms.find(r => r.code === selectedLesson.room);
            setNewRoomId(currentRoom?.id?.toString() || "");
            setComment("");
            setChangeType("reschedule");
        }
    }, [selectedLesson, rooms]);

    function buildMessage() {
        const parts = [];
        
        if (changeType === "cancel") {
            parts.push("🚫 ОТМЕНА ЗАНЯТИЯ");
        } else if (changeType === "reschedule") {
            parts.push("📅 ПЕРЕНОС ЗАНЯТИЯ");
            parts.push(`Новая дата: ${formatDateRu(newDate)}`);
            parts.push(`Новое время: ${newStartTime} – ${newEndTime}`);
            if (newRoomId) {
                const room = rooms.find(r => r.id === Number(newRoomId));
                if (room) parts.push(`Аудитория: ${room.code}`);
            }
        } else if (changeType === "room") {
            parts.push("🚪 СМЕНА АУДИТОРИИ");
            if (newRoomId) {
                const room = rooms.find(r => r.id === Number(newRoomId));
                if (room) parts.push(`Новая аудитория: ${room.code}`);
            }
        } else {
            parts.push("📝 ДРУГОЕ");
        }
        
        if (comment.trim()) {
            parts.push(`\nКомментарий: ${comment.trim()}`);
        }
        
        return parts.join("\n");
    }

    async function submit(e) {
        e.preventDefault();
        if (!selectedLesson) {
            setErr("Выберите занятие");
            return;
        }

        setErr("");
        setOk("");

        const message = buildMessage();

        try {
            await apiFetch("/changes", {
                method: "POST",
                token,
                body: { lessonId: selectedLesson.id, message }
            });
            setOk("Заявка успешно отправлена!");
            setSelectedLesson(null);
            setComment("");
            loadRequests();
        } catch (e2) {
            setErr(e2.message || "Ошибка отправки");
        }
    }

    function formatDateRu(dateStr) {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString("ru-RU", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString("ru-RU", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });
    }

    function formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
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

    function getStatusBadge(status) {
        switch (status) {
            case "NEW":
                return <span style={styles.badgeNew}>🕐 На рассмотрении</span>;
            case "APPROVED":
                return <span style={styles.badgeApproved}>✅ Одобрено</span>;
            case "REJECTED":
                return <span style={styles.badgeRejected}>❌ Отклонено</span>;
            default:
                return <span>{status}</span>;
        }
    }

    function getRoomTypeName(type) {
        switch (type) {
            case "CLASS": return "Аудитория";
            case "LAB": return "Лаборатория";
            case "LECTURE": return "Лекционный зал";
            default: return type;
        }
    }

    function groupLessonsByDate(lessonsList) {
        const groups = {};
        lessonsList.forEach(lesson => {
            const dateKey = formatDate(lesson.startsAtIso);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(lesson);
        });
        return groups;
    }

    const groupedLessons = groupLessonsByDate(lessons);

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Загрузка...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.pageTitle}>📝 Заявки на изменение расписания</h2>

            <div style={styles.grid}>
                {/* Левая колонка - выбор занятия */}
                <div style={styles.column}>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>
                            <span style={styles.icon}>📅</span>
                            Выберите занятие
                        </h3>
                        <p style={styles.hint}>
                            Выберите занятие, для которого хотите запросить изменение
                        </p>

                        <div style={styles.lessonsList}>
                            {Object.entries(groupedLessons).map(([date, dateLessons]) => (
                                <div key={date} style={styles.dateGroup}>
                                    <div style={styles.dateHeader}>{date}</div>
                                    {dateLessons.map(lesson => {
                                        const isSelected = selectedLesson?.id === lesson.id;
                                        const hasRequest = requests.some(r => r.lessonId === lesson.id);
                                        
                                        return (
                                            <div
                                                key={lesson.id}
                                                onClick={() => !hasRequest && setSelectedLesson(lesson)}
                                                style={{
                                                    ...styles.lessonCard,
                                                    ...(isSelected ? styles.lessonCardSelected : {}),
                                                    ...(hasRequest ? styles.lessonCardDisabled : {}),
                                                    cursor: hasRequest ? "not-allowed" : "pointer"
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        ...styles.lessonType,
                                                        ...getLessonTypeStyle(lesson.lessonType)
                                                    }}
                                                >
                                                    {getLessonTypeName(lesson.lessonType)}
                                                </div>
                                                <div style={styles.lessonInfo}>
                                                    <div style={styles.lessonTime}>
                                                        {formatTime(lesson.startsAtIso)} – {formatTime(lesson.endsAtIso)}
                                                    </div>
                                                    <div style={styles.lessonSubject}>{lesson.subject}</div>
                                                    <div style={styles.lessonMeta}>
                                                        <span>🚪 {lesson.room}</span>
                                                        <span>👥 {lesson.target}</span>
                                                    </div>
                                                    {hasRequest && (
                                                        <div style={styles.alreadyRequested}>
                                                            ⚠️ Заявка уже отправлена
                                                        </div>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <div style={styles.checkmark}>✓</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            {lessons.length === 0 && (
                                <div style={styles.empty}>
                                    У вас нет занятий в ближайшее время
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Правая колонка - форма и заявки */}
                <div style={styles.column}>
                    {/* Форма создания заявки */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>
                            <span style={styles.icon}>✏️</span>
                            Создать заявку
                        </h3>

                        {selectedLesson ? (
                            <>
                                {/* Информация о выбранном занятии */}
                                <div style={styles.selectedLessonPreview}>
                                    <div style={styles.previewLabel}>Текущее занятие:</div>
                                    <div style={styles.previewContent}>
                                        <strong>{selectedLesson.subject}</strong>
                                        <div style={styles.previewMeta}>
                                            {formatDate(selectedLesson.startsAtIso)} • {formatTime(selectedLesson.startsAtIso)} – {formatTime(selectedLesson.endsAtIso)}
                                        </div>
                                        <div style={styles.previewMeta}>
                                            {getLessonTypeName(selectedLesson.lessonType)} • 🚪 {selectedLesson.room} • 👥 {selectedLesson.target}
                                        </div>
                                    </div>
                                    <button
                                        style={styles.clearBtn}
                                        onClick={() => setSelectedLesson(null)}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <form onSubmit={submit} style={styles.form}>
                                    {/* Тип изменения */}
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Тип изменения:</label>
                                        <div style={styles.changeTypeGrid}>
                                            <label style={{
                                                ...styles.changeTypeOption,
                                                ...(changeType === "reschedule" ? styles.changeTypeOptionActive : {})
                                            }}>
                                                <input
                                                    type="radio"
                                                    name="changeType"
                                                    value="reschedule"
                                                    checked={changeType === "reschedule"}
                                                    onChange={(e) => setChangeType(e.target.value)}
                                                    style={{ display: "none" }}
                                                />
                                                <span style={styles.changeTypeIcon}>📅</span>
                                                <span>Перенести</span>
                                            </label>
                                            <label style={{
                                                ...styles.changeTypeOption,
                                                ...(changeType === "room" ? styles.changeTypeOptionActive : {})
                                            }}>
                                                <input
                                                    type="radio"
                                                    name="changeType"
                                                    value="room"
                                                    checked={changeType === "room"}
                                                    onChange={(e) => setChangeType(e.target.value)}
                                                    style={{ display: "none" }}
                                                />
                                                <span style={styles.changeTypeIcon}>🚪</span>
                                                <span>Сменить аудиторию</span>
                                            </label>
                                            <label style={{
                                                ...styles.changeTypeOption,
                                                ...(changeType === "cancel" ? styles.changeTypeOptionActive : {})
                                            }}>
                                                <input
                                                    type="radio"
                                                    name="changeType"
                                                    value="cancel"
                                                    checked={changeType === "cancel"}
                                                    onChange={(e) => setChangeType(e.target.value)}
                                                    style={{ display: "none" }}
                                                />
                                                <span style={styles.changeTypeIcon}>🚫</span>
                                                <span>Отменить</span>
                                            </label>
                                            <label style={{
                                                ...styles.changeTypeOption,
                                                ...(changeType === "other" ? styles.changeTypeOptionActive : {})
                                            }}>
                                                <input
                                                    type="radio"
                                                    name="changeType"
                                                    value="other"
                                                    checked={changeType === "other"}
                                                    onChange={(e) => setChangeType(e.target.value)}
                                                    style={{ display: "none" }}
                                                />
                                                <span style={styles.changeTypeIcon}>📝</span>
                                                <span>Другое</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Перенос - выбор даты и времени */}
                                    {changeType === "reschedule" && (
                                        <div style={styles.rescheduleForm}>
                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>📅 Новая дата:</label>
                                                <input
                                                    type="date"
                                                    className="input"
                                                    value={newDate}
                                                    onChange={(e) => setNewDate(e.target.value)}
                                                    style={styles.dateInput}
                                                />
                                                {newDate && (
                                                    <div style={styles.datePreview}>
                                                        {formatDateRu(newDate)}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={styles.timeRow}>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.label}>🕐 Начало:</label>
                                                    <input
                                                        type="time"
                                                        className="input"
                                                        value={newStartTime}
                                                        onChange={(e) => setNewStartTime(e.target.value)}
                                                    />
                                                </div>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.label}>🕐 Конец:</label>
                                                    <input
                                                        type="time"
                                                        className="input"
                                                        value={newEndTime}
                                                        onChange={(e) => setNewEndTime(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>🚪 Аудитория:</label>
                                                <select
                                                    className="input"
                                                    value={newRoomId}
                                                    onChange={(e) => setNewRoomId(e.target.value)}
                                                    style={styles.select}
                                                >
                                                    <option value="">— Оставить текущую —</option>
                                                    {rooms.map(room => (
                                                        <option key={room.id} value={room.id}>
                                                            {room.code} ({getRoomTypeName(room.type)}, {room.capacity} мест)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Смена аудитории */}
                                    {changeType === "room" && (
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>🚪 Новая аудитория:</label>
                                            <select
                                                className="input"
                                                value={newRoomId}
                                                onChange={(e) => setNewRoomId(e.target.value)}
                                                style={styles.select}
                                            >
                                                <option value="">— Выберите аудиторию —</option>
                                                {rooms.map(room => (
                                                    <option key={room.id} value={room.id}>
                                                        {room.code} ({getRoomTypeName(room.type)}, {room.capacity} мест)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Комментарий */}
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            💬 Комментарий {changeType === "other" || changeType === "cancel" ? "(обязательно)" : "(необязательно)"}:
                                        </label>
                                        <textarea
                                            className="textarea"
                                            placeholder={
                                                changeType === "cancel" 
                                                    ? "Укажите причину отмены занятия..."
                                                    : changeType === "other"
                                                    ? "Опишите, какое изменение вы хотите внести..."
                                                    : "Дополнительная информация для администратора..."
                                            }
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            style={styles.textarea}
                                            rows={3}
                                        />
                                    </div>

                                    {/* Предпросмотр заявки */}
                                    <div style={styles.messagePreview}>
                                        <div style={styles.previewLabel}>Текст заявки:</div>
                                        <pre style={styles.messagePreviewText}>{buildMessage()}</pre>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn"
                                        disabled={
                                            (changeType === "room" && !newRoomId) ||
                                            ((changeType === "other" || changeType === "cancel") && !comment.trim())
                                        }
                                        style={styles.submitBtn}
                                    >
                                        📤 Отправить заявку
                                    </button>

                                    {err && <div className="error">{err}</div>}
                                    {ok && <div className="ok">{ok}</div>}
                                </form>
                            </>
                        ) : (
                            <div style={styles.noSelection}>
                                <div style={styles.noSelectionIcon}>👈</div>
                                <div>Выберите занятие из списка слева</div>
                            </div>
                        )}
                    </div>

                    {/* Список открытых заявок */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>
                            <span style={styles.icon}>📋</span>
                            Мои заявки
                            <span style={styles.requestCount}>{requests.length}</span>
                        </h3>

                        {requests.length === 0 ? (
                            <div style={styles.empty}>
                                У вас нет активных заявок
                            </div>
                        ) : (
                            <div style={styles.requestsList}>
                                {requests.map(req => {
                                    const lesson = lessons.find(l => l.id === req.lessonId);
                                    return (
                                        <div key={req.id} style={styles.requestCard}>
                                            <div style={styles.requestHeader}>
                                                {getStatusBadge(req.status)}
                                                <span style={styles.requestDate}>
                                                    {new Date(req.createdAt).toLocaleDateString("ru-RU")}
                                                </span>
                                            </div>
                                            {lesson && (
                                                <div style={styles.requestLesson}>
                                                    <strong>{lesson.subject}</strong>
                                                    <span style={styles.requestLessonMeta}>
                                                        {formatDate(lesson.startsAtIso)} • {formatTime(lesson.startsAtIso)}
                                                    </span>
                                                </div>
                                            )}
                                            <div style={styles.requestMessage}>
                                                <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                                                    {req.message}
                                                </pre>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
    },
    pageTitle: {
        fontSize: "28px",
        fontWeight: "700",
        marginBottom: "24px",
        color: "#1a1a1a",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
    },
    column: {
        display: "flex",
        flexDirection: "column",
        gap: "24px",
    },
    card: {
        background: "white",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid #e0e0e0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    cardTitle: {
        fontSize: "20px",
        fontWeight: "600",
        margin: "0 0 16px 0",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    icon: {
        fontSize: "24px",
    },
    hint: {
        color: "#666",
        fontSize: "14px",
        marginBottom: "16px",
    },
    lessonsList: {
        maxHeight: "600px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    dateGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    dateHeader: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#667eea",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        padding: "8px 0",
        borderBottom: "2px solid #667eea",
        marginBottom: "4px",
    },
    lessonCard: {
        display: "flex",
        alignItems: "stretch",
        background: "#f8f9fa",
        borderRadius: "12px",
        borderWidth: "2px",
        borderStyle: "solid",
        borderColor: "transparent",
        overflow: "hidden",
        transition: "all 0.2s ease",
        position: "relative",
    },
    lessonCardSelected: {
        borderColor: "#667eea",
        background: "#f0f4ff",
        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
    },
    lessonCardDisabled: {
        opacity: 0.6,
        background: "#f5f5f5",
    },
    lessonType: {
        minWidth: "90px",
        padding: "12px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "600",
        fontSize: "11px",
        textAlign: "center",
        textTransform: "uppercase",
    },
    lessonInfo: {
        flex: 1,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    lessonTime: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#555",
    },
    lessonSubject: {
        fontSize: "15px",
        fontWeight: "600",
        color: "#1a1a1a",
    },
    lessonMeta: {
        display: "flex",
        gap: "12px",
        fontSize: "12px",
        color: "#888",
    },
    alreadyRequested: {
        fontSize: "11px",
        color: "#e67700",
        fontWeight: "500",
        marginTop: "4px",
    },
    checkmark: {
        position: "absolute",
        right: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        background: "#667eea",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
    },
    selectedLessonPreview: {
        background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "20px",
        position: "relative",
        border: "1px solid #667eea30",
    },
    previewLabel: {
        fontSize: "12px",
        color: "#667eea",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom: "8px",
    },
    previewContent: {
        paddingRight: "30px",
    },
    previewMeta: {
        fontSize: "13px",
        color: "#666",
        marginTop: "4px",
    },
    clearBtn: {
        position: "absolute",
        right: "12px",
        top: "12px",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        border: "none",
        background: "#ddd",
        color: "#666",
        cursor: "pointer",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    noSelection: {
        padding: "48px 24px",
        textAlign: "center",
        color: "#888",
        background: "#f8f9fa",
        borderRadius: "12px",
    },
    noSelectionIcon: {
        fontSize: "48px",
        marginBottom: "12px",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    label: {
        fontSize: "14px",
        fontWeight: "500",
        color: "#333",
    },
    changeTypeGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px",
    },
    changeTypeOption: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        padding: "16px 12px",
        background: "#f8f9fa",
        borderRadius: "12px",
        borderWidth: "2px",
        borderStyle: "solid",
        borderColor: "transparent",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontSize: "13px",
        fontWeight: "500",
        color: "#555",
    },
    changeTypeOptionActive: {
        borderColor: "#667eea",
        background: "#f0f4ff",
        color: "#667eea",
    },
    changeTypeIcon: {
        fontSize: "24px",
    },
    rescheduleForm: {
        background: "#f8f9fa",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    dateInput: {
        fontSize: "16px",
    },
    datePreview: {
        fontSize: "13px",
        color: "#667eea",
        marginTop: "4px",
    },
    timeRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
    },
    select: {
        fontSize: "14px",
        cursor: "pointer",
    },
    textarea: {
        minHeight: "80px",
    },
    messagePreview: {
        background: "#f0f4ff",
        borderRadius: "12px",
        padding: "16px",
        border: "1px solid #667eea30",
    },
    messagePreviewText: {
        margin: 0,
        fontSize: "13px",
        color: "#333",
        whiteSpace: "pre-wrap",
        fontFamily: "inherit",
        lineHeight: "1.5",
    },
    submitBtn: {
        padding: "14px 24px",
        fontSize: "15px",
        fontWeight: "600",
    },
    requestCount: {
        marginLeft: "auto",
        background: "#667eea",
        color: "white",
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "14px",
        fontWeight: "600",
    },
    requestsList: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    requestCard: {
        background: "#f8f9fa",
        borderRadius: "12px",
        padding: "16px",
        border: "1px solid #e9ecef",
    },
    requestHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
    },
    requestDate: {
        fontSize: "12px",
        color: "#888",
    },
    requestLesson: {
        marginBottom: "8px",
    },
    requestLessonMeta: {
        fontSize: "12px",
        color: "#666",
        marginLeft: "8px",
    },
    requestMessage: {
        fontSize: "14px",
        color: "#555",
        padding: "12px",
        background: "white",
        borderRadius: "8px",
        borderLeft: "3px solid #667eea",
    },
    badgeNew: {
        background: "#fff3cd",
        color: "#856404",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "600",
    },
    badgeApproved: {
        background: "#d4edda",
        color: "#155724",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "600",
    },
    badgeRejected: {
        background: "#f8d7da",
        color: "#721c24",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "600",
    },
    empty: {
        padding: "32px",
        textAlign: "center",
        color: "#888",
        background: "#f8f9fa",
        borderRadius: "12px",
    },
    loading: {
        padding: "48px",
        textAlign: "center",
        fontSize: "18px",
        color: "#666",
    },
};
