"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";

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

// Форматирование времени
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

// Проверить, является ли день прошедшим
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
            return "#4A90E2";
        case "PRACTICE":
            return "#50C878";
        case "LAB":
            return "#FF6B6B";
        default:
            return "#6C757D";
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

export default function AdminSchedulesPage() {
    return (
        <AuthGuard roles={["ADMIN"]}>
            <AdminSchedulesInner />
        </AuthGuard>
    );
}

function AdminSchedulesInner() {
    const { token } = useAuth();

    const [fromDate, setFromDate] = useState(() => toLocalDateInputValue(new Date()));
    const [toDate, setToDate] = useState(() =>
        toLocalDateInputValue(addDaysLocal(new Date(), 7))
    );

    const [items, setItems] = useState([]);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    // Фильтры
    const [filterGroupId, setFilterGroupId] = useState("");
    const [filterTeacherId, setFilterTeacherId] = useState("");
    const [groups, setGroups] = useState([]);
    const [teachers, setTeachers] = useState([]);

    // Загрузка справочников
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [g, t] = await Promise.all([
                    apiFetch("/catalog/groups", { token }),
                    apiFetch("/catalog/teachers", { token }),
                ]);
                if (alive) {
                    setGroups(g);
                    setTeachers(t);
                }
            } catch (e) {
                console.error("Error loading catalogs:", e);
            }
        })();
        return () => {
            alive = false;
        };
    }, [token]);

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
                let url = `/schedule/all?fromIso=${encodeURIComponent(query.fromIso)}&toIso=${encodeURIComponent(query.toIso)}`;
                if (filterGroupId) {
                    url += `&groupId=${filterGroupId}`;
                }
                if (filterTeacherId) {
                    url += `&teacherId=${filterTeacherId}`;
                }
                const data = await apiFetch(url, { token });
                if (alive) setItems(data || []);
            } catch (e) {
                if (alive) {
                    let errorMsg = e.message || "Ошибка загрузки";
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
    }, [query.fromIso, query.toIso, filterGroupId, filterTeacherId, token]);

    return (
        <div className="card">
            <h3 style={{ marginTop: 0 }}>Все расписания (ADMIN)</h3>

            <div style={{ marginBottom: 20 }}>
                <div className="row" style={{ marginBottom: 12 }}>
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
                                const [year, month, day] = fromDate.split("-").map(Number);
                                const currentStart = new Date(year, month - 1, day);
                                const currentMonday = getMondayOfWeek(currentStart);
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
                                const [year, month, day] = fromDate.split("-").map(Number);
                                const currentStart = new Date(year, month - 1, day);
                                const currentMonday = getMondayOfWeek(currentStart);
                                const nextMonday = addDaysLocal(currentMonday, 7);
                                setFromDate(toLocalDateInputValue(nextMonday));
                                setToDate(toLocalDateInputValue(addDaysLocal(nextMonday, 6)));
                            }}
                        >
                            Следующая неделя →
                        </button>
                    </div>
                </div>

                <div className="row" style={{ marginBottom: 12 }}>
                    <div style={{ flex: "1 1 250px" }}>
                        <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                            Фильтр по группе
                        </label>
                        <select
                            className="input"
                            value={filterGroupId}
                            onChange={(e) => {
                                setFilterGroupId(e.target.value);
                                setFilterTeacherId(""); // Сбрасываем фильтр преподавателя
                            }}
                        >
                            <option value="">Все группы</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.code} — {g.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ flex: "1 1 250px" }}>
                        <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                            Фильтр по преподавателю
                        </label>
                        <select
                            className="input"
                            value={filterTeacherId}
                            onChange={(e) => {
                                setFilterTeacherId(e.target.value);
                                setFilterGroupId(""); // Сбрасываем фильтр группы
                            }}
                        >
                            <option value="">Все преподаватели</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.fullName}
                                </option>
                            ))}
                        </select>
                    </div>
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

