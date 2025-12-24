"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "../../src/components/AuthGuard";
import { useAuth } from "../../src/components/AuthProvider";
import { apiFetch } from "../../src/lib/api";

// YYYY-MM-DD из Date (по локальному времени)
function toLocalDateInputValue(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// преобразовать "YYYY-MM-DD" в ISO UTC начало дня
function fromDateStartIso(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    return dt.toISOString();
}

// преобразовать "YYYY-MM-DD" в ISO UTC конец дня
function toDateEndIso(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    return dt.toISOString();
}

// по умолчанию: сегодня и +7 дней
function addDaysLocal(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

// Получить понедельник недели для указанной даты
function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Понедельник
    return new Date(d.setDate(diff));
}

// Форматирование даты и времени для отображения
function formatDateTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}.${month} ${hours}:${minutes}`;
}

// Форматирование только времени
function formatTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

// Форматирование даты для заголовка дня
function formatDayHeader(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${dayName}, ${day}.${month}.${year}`;
}

// Получить ключ дня для группировки
function getDayKey(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Проверить, является ли день прошедшим (до начала сегодняшнего дня)
function isPastDay(isoString) {
    if (!isoString) return false;
    const lessonDate = new Date(isoString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lessonDate.setHours(0, 0, 0, 0);
    return lessonDate < today;
}

// Цвет для типа занятия
function getLessonTypeColor(lessonType) {
    switch (lessonType) {
        case "LECTURE":
            return "#4A90E2"; // Синий
        case "PRACTICE":
            return "#50C878"; // Зеленый
        case "LAB":
            return "#FF6B6B"; // Красный
        default:
            return "#6C757D"; // Серый
    }
}

// Русское название типа занятия
function getLessonTypeName(lessonType) {
    switch (lessonType) {
        case "LECTURE":
            return "Лекция";
        case "PRACTICE":
            return "Практика";
        case "LAB":
            return "Лабораторная";
        default:
            return lessonType;
    }
}

export default function MySchedulePage() {
    return (
        <AuthGuard roles={["TEACHER", "STUDENT"]}>
            <MyScheduleInner />
        </AuthGuard>
    );
}

function MyScheduleInner() {
    const { token, user } = useAuth();

    const [fromDate, setFromDate] = useState(() => toLocalDateInputValue(new Date()));
    const [toDate, setToDate] = useState(() =>
        toLocalDateInputValue(addDaysLocal(new Date(), 7))
    );

    const [items, setItems] = useState([]);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const query = useMemo(() => {
        const fromIso = fromDateStartIso(fromDate);
        const toIso = toDateEndIso(toDate);
        return { fromIso, toIso };
    }, [fromDate, toDate]);

    // Группировка занятий по дням
    const groupedByDay = useMemo(() => {
        const groups = new Map();
        items.forEach((item) => {
            const dayKey = getDayKey(item.startsAtIso);
            if (!groups.has(dayKey)) {
                groups.set(dayKey, []);
            }
            groups.get(dayKey).push(item);
        });
        // Сортировка внутри каждого дня по времени начала
        groups.forEach((lessons) => {
            lessons.sort((a, b) => {
                const timeA = new Date(a.startsAtIso).getTime();
                const timeB = new Date(b.startsAtIso).getTime();
                return timeA - timeB;
            });
        });
        // Сортировка дней
        return new Map([...groups.entries()].sort());
    }, [items]);

    useEffect(() => {
        let alive = true;

        (async () => {
            setErr("");
            setLoading(true);
            try {
                const data = await apiFetch(
                    `/schedule/my?fromIso=${encodeURIComponent(query.fromIso)}&toIso=${encodeURIComponent(query.toIso)}`,
                    { token }
                );
                if (alive) setItems(data || []);
            } catch (e) {
                if (alive) {
                    let errorMsg = e.message || "Ошибка загрузки";
                    // Если есть детали ошибки, показываем их
                    if (e.data && e.data.details) {
                        errorMsg = `${errorMsg}: ${e.data.details}`;
                    }
                    console.error("Schedule load error:", {
                        message: errorMsg,
                        status: e.status,
                        data: e.data,
                        error: e
                    });
                    setErr(errorMsg);
                }
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [query.fromIso, query.toIso, token]);

    return (
        <div className="card">
            <h3 style={{ marginTop: 0 }}>
                Моё расписание {user?.role === "TEACHER" ? "преподавателя" : "студента"}
            </h3>

            <div className="row" style={{ marginBottom: 20 }}>
                <div style={{ flex: "1 1 240px" }}>
                    <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                        От
                    </label>
                    <input
                        className="input"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                </div>

                <div style={{ flex: "1 1 240px" }}>
                    <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                        До
                    </label>
                    <input
                        className="input"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                    <button
                        className="btn"
                        onClick={() => {
                            const today = new Date();
                            const startOfWeek = getMondayOfWeek(today);
                            setFromDate(toLocalDateInputValue(startOfWeek));
                            setToDate(toLocalDateInputValue(addDaysLocal(startOfWeek, 6)));
                        }}
                    >
                        Текущая неделя
                    </button>
                    <button
                        className="btn"
                        onClick={() => {
                            // Получаем текущий понедельник из выбранной даты начала
                            const [year, month, day] = fromDate.split("-").map(Number);
                            const currentStart = new Date(year, month - 1, day);
                            const currentMonday = getMondayOfWeek(currentStart);
                            // Переходим на предыдущую неделю
                            const prevMonday = addDaysLocal(currentMonday, -7);
                            setFromDate(toLocalDateInputValue(prevMonday));
                            setToDate(toLocalDateInputValue(addDaysLocal(prevMonday, 6)));
                        }}
                    >
                        ← Предыдущая неделя
                    </button>
                    <button
                        className="btn"
                        onClick={() => {
                            // Получаем текущий понедельник из выбранной даты начала
                            const [year, month, day] = fromDate.split("-").map(Number);
                            const currentStart = new Date(year, month - 1, day);
                            const currentMonday = getMondayOfWeek(currentStart);
                            // Переходим на следующую неделю
                            const nextMonday = addDaysLocal(currentMonday, 7);
                            setFromDate(toLocalDateInputValue(nextMonday));
                            setToDate(toLocalDateInputValue(addDaysLocal(nextMonday, 6)));
                        }}
                    >
                        Следующая неделя →
                    </button>
                </div>
            </div>

            {err && <div className="error" style={{ marginBottom: 16 }}>{err}</div>}
            {loading && <div className="muted" style={{ marginBottom: 16 }}>Загрузка...</div>}

            {!loading && groupedByDay.size === 0 && (
                <div className="muted" style={{ padding: "40px 0", textAlign: "center" }}>
                    Нет занятий в выбранном диапазоне
                </div>
            )}

            {!loading && groupedByDay.size > 0 && (
                <div className="schedule-container">
                    {Array.from(groupedByDay.entries()).map(([dayKey, lessons]) => {
                        const isPast = isPastDay(lessons[0].startsAtIso);
                        return (
                            <div 
                                key={dayKey} 
                                className={`schedule-day ${isPast ? "schedule-day-past" : ""}`}
                            >
                                <h4 className="schedule-day-header">
                                    {formatDayHeader(lessons[0].startsAtIso)}
                                </h4>
                            <div className="schedule-lessons">
                                {lessons.map((lesson) => (
                                    <div key={lesson.id} className="schedule-lesson">
                                        <div
                                            className="schedule-lesson-type"
                                            style={{
                                                backgroundColor: getLessonTypeColor(lesson.lessonType),
                                            }}
                                        >
                                            {getLessonTypeName(lesson.lessonType)}
                                        </div>
                                        <div className="schedule-lesson-content">
                                            <div className="schedule-lesson-time">
                                                {formatTime(lesson.startsAtIso)} - {formatTime(lesson.endsAtIso)}
                                            </div>
                                            <div className="schedule-lesson-subject">
                                                {lesson.subject}
                                            </div>
                                            <div className="schedule-lesson-details">
                                                <span className="schedule-lesson-teacher">
                                                    👤 {lesson.teacher}
                                                </span>
                                                <span className="schedule-lesson-room">
                                                    🏢 {lesson.room}
                                                </span>
                                                <span className="schedule-lesson-target">
                                                    {lesson.target?.startsWith("GROUP:") 
                                                        ? `👥 ${lesson.target.replace("GROUP:", "")}`
                                                        : lesson.target?.startsWith("STREAM:")
                                                        ? `📚 ${lesson.target.replace("STREAM:", "")}`
                                                        : lesson.target}
                                                </span>
                                            </div>
                                            {lesson.note && (
                                                <div className="schedule-lesson-note">
                                                    📝 {lesson.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}