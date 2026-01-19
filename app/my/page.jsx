"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "../../src/components/AuthGuard";
import { useAuth } from "../../src/components/AuthProvider";
import { apiFetch } from "../../src/lib/api";
import {
    toLocalDateInputValue,
    fromDateStartIso,
    toDateEndIso,
    addDaysLocal,
    getMondayOfWeek,
    formatTime,
    formatDayHeader,
    getDayKey,
    isPastDay,
    getMinutesFromIso,
} from "../../src/lib/dateUtils";
import {
    LESSON_TYPE_LABELS,
    LESSON_TYPE_COLORS,
} from "../../src/lib/constants";
import { Breadcrumbs } from "../../src/components/ui";

export default function MySchedulePage() {
    return (
        <AuthGuard roles={["TEACHER", "STUDENT"]}>
            <MyScheduleInner />
        </AuthGuard>
    );
}

function MyScheduleInner() {
    const { token, user } = useAuth();

    const [fromDate, setFromDate] = useState(() => toLocalDateInputValue(getMondayOfWeek(new Date())));
    const [toDate, setToDate] = useState(() => toLocalDateInputValue(addDaysLocal(getMondayOfWeek(new Date()), 6)));
    const [items, setItems] = useState([]);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState("calendar"); // "list" | "calendar"

    const query = useMemo(() => ({
        fromIso: fromDateStartIso(fromDate),
        toIso: toDateEndIso(toDate)
    }), [fromDate, toDate]);

    const groupedByDay = useMemo(() => {
        const groups = new Map();
        items.forEach((item) => {
            const dayKey = getDayKey(item.startsAtIso);
            if (!groups.has(dayKey)) groups.set(dayKey, []);
            groups.get(dayKey).push(item);
        });
        groups.forEach((lessons) => {
            lessons.sort((a, b) => new Date(a.startsAtIso) - new Date(b.startsAtIso));
        });
        return new Map([...groups.entries()].sort());
    }, [items]);

    // Дни недели для календарного вида
    const weekDays = useMemo(() => {
        const monday = getMondayOfWeek(new Date(fromDate));
        return Array.from({ length: 7 }, (_, i) => addDaysLocal(monday, i));
    }, [fromDate]);

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
                    if (e.data?.details) errorMsg = `${errorMsg}: ${e.data.details}`;
                    setErr(errorMsg);
                }
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [query.fromIso, query.toIso, token]);

    const handleWeekNav = (direction) => {
        const [year, month, day] = fromDate.split("-").map(Number);
        const currentStart = new Date(year, month - 1, day);
        const currentMonday = getMondayOfWeek(currentStart);
        const targetMonday = addDaysLocal(currentMonday, direction * 7);
        setFromDate(toLocalDateInputValue(targetMonday));
        setToDate(toLocalDateInputValue(addDaysLocal(targetMonday, 6)));
    };

    const goToCurrentWeek = () => {
        const monday = getMondayOfWeek(new Date());
        setFromDate(toLocalDateInputValue(monday));
        setToDate(toLocalDateInputValue(addDaysLocal(monday, 6)));
    };

    const roleLabel = user?.role === "TEACHER" ? "преподавателя" : "студента";

    return (
        <div className="page-container">
            <Breadcrumbs items={[
                { label: "Главная", href: "/" },
                { label: "Моё расписание" }
            ]} />
            
            <h2 className="page-title">Моё расписание {roleLabel}</h2>

            {/* Фильтры */}
            <div className="filters-card">
                <div className="filters-row">
                    <div className="filter-group">
                        <label className="filter-label">От</label>
                        <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">До</label>
                        <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </div>
                    <div className="week-buttons">
                        <button className="btn btn-sm" onClick={goToCurrentWeek}>Текущая</button>
                        <button className="btn btn-sm" onClick={() => handleWeekNav(-1)}>← Пред</button>
                        <button className="btn btn-sm" onClick={() => handleWeekNav(1)}>След →</button>
                    </div>
                </div>
                
                <div className="filters-row filters-row-between">
                    <div></div>
                    <div className="view-toggle">
                        <button 
                            className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                            onClick={() => setViewMode("list")}
                        >
                            📋 Список
                        </button>
                        <button 
                            className={`view-toggle-btn ${viewMode === "calendar" ? "active" : ""}`}
                            onClick={() => setViewMode("calendar")}
                        >
                            📅 Календарь
                        </button>
                    </div>
                </div>
            </div>

            {err && <div className="error">{err}</div>}
            {loading && <div className="loading-state">Загрузка...</div>}

            {!loading && items.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">📅</div>
                    Нет занятий в выбранном диапазоне
                </div>
            )}

            {/* Режим списка */}
            {!loading && items.length > 0 && viewMode === "list" && (
                <div className="schedule-container">
                    {Array.from(groupedByDay.entries()).map(([dayKey, lessons]) => {
                        const isPast = isPastDay(lessons[0].startsAtIso);
                        return (
                            <div key={dayKey} className={`schedule-day ${isPast ? "schedule-day-past" : ""}`}>
                                <div className="schedule-day-header">
                                    {formatDayHeader(lessons[0].startsAtIso)}
                                    <span className="schedule-day-count">{lessons.length} зан.</span>
                                </div>
                                <div className="schedule-lessons">
                                    {lessons.map((lesson) => (
                                        <LessonRow key={lesson.id} lesson={lesson} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Режим календаря (Outlook-style) */}
            {!loading && viewMode === "calendar" && (
                <CalendarView weekDays={weekDays} items={items} />
            )}
        </div>
    );
}

// === Компоненты ===

const CALENDAR_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const HOUR_HEIGHT = 60; // px per hour
const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function CalendarView({ weekDays, items }) {
    // Группировка по дням
    const lessonsByDay = useMemo(() => {
        const map = new Map();
        weekDays.forEach(day => {
            const key = toLocalDateInputValue(day);
            map.set(key, []);
        });
        items.forEach(item => {
            const key = getDayKey(item.startsAtIso);
            if (map.has(key)) {
                map.get(key).push(item);
            }
        });
        return map;
    }, [weekDays, items]);

    const today = toLocalDateInputValue(new Date());

    return (
        <div className="calendar-view">
            <div className="calendar-grid">
                {/* Заголовок с временем */}
                <div className="calendar-time-header"></div>
                
                {/* Заголовки дней */}
                {weekDays.map(day => {
                    const dateKey = toLocalDateInputValue(day);
                    const isToday = dateKey === today;
                    const dayNum = day.getDay();
                    return (
                        <div key={dateKey} className={`calendar-day-header ${isToday ? "calendar-day-today" : ""}`}>
                            <span className="calendar-day-name">{DAY_NAMES[dayNum]}</span>
                            <span className="calendar-day-date">{day.getDate()}</span>
                        </div>
                    );
                })}

                {/* Временная шкала */}
                <div className="calendar-time-column">
                    {CALENDAR_HOURS.map(hour => (
                        <div key={hour} className="calendar-time-slot" style={{ height: HOUR_HEIGHT }}>
                            <span className="calendar-time-label">{hour}:00</span>
                        </div>
                    ))}
                </div>

                {/* Колонки дней с занятиями */}
                {weekDays.map(day => {
                    const dateKey = toLocalDateInputValue(day);
                    const dayLessons = lessonsByDay.get(dateKey) || [];
                    const isToday = dateKey === today;
                    
                    return (
                        <div key={dateKey} className={`calendar-day-column ${isToday ? "calendar-column-today" : ""}`}>
                            {/* Сетка часов */}
                            {CALENDAR_HOURS.map(hour => (
                                <div key={hour} className="calendar-hour-cell" style={{ height: HOUR_HEIGHT }}></div>
                            ))}
                            
                            {/* Занятия */}
                            {dayLessons.map(lesson => (
                                <CalendarLessonBlock key={lesson.id} lesson={lesson} />
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function CalendarLessonBlock({ lesson }) {
    const startMinutes = getMinutesFromIso(lesson.startsAtIso);
    const endMinutes = getMinutesFromIso(lesson.endsAtIso);
    const duration = endMinutes - startMinutes;
    
    const startHour = CALENDAR_HOURS[0];
    const topOffset = ((startMinutes - startHour * 60) / 60) * HOUR_HEIGHT;
    const height = (duration / 60) * HOUR_HEIGHT;
    
    const typeColor = LESSON_TYPE_COLORS[lesson.lessonType] || "#6C757D";
    
    const targetDisplay = lesson.target?.startsWith("GROUP:")
        ? lesson.target.replace("GROUP:", "")
        : lesson.target?.startsWith("STREAM:")
        ? lesson.target.replace("STREAM:", "")
        : lesson.target;
    
    return (
        <div 
            className="calendar-lesson calendar-lesson-confirmed"
            style={{ 
                top: topOffset,
                height: Math.max(height - 2, 20),
                borderLeftColor: typeColor,
            }}
        >
            <div className="calendar-lesson-time">
                {formatTime(lesson.startsAtIso)} - {formatTime(lesson.endsAtIso)}
            </div>
            <div className="calendar-lesson-subject">{lesson.subject}</div>
            {height > 40 && (
                <div className="calendar-lesson-info">
                    {lesson.room && <span>🚪 {lesson.room}</span>}
                    {lesson.teacher && <span>👤 {lesson.teacher}</span>}
                    {targetDisplay && <span>👥 {targetDisplay}</span>}
                </div>
            )}
            {lesson.note && height > 60 && (
                <div className="calendar-lesson-info">
                    <span>📝 {lesson.note}</span>
                </div>
            )}
        </div>
    );
}

function LessonRow({ lesson }) {
    const typeColor = LESSON_TYPE_COLORS[lesson.lessonType] || "#6C757D";
    const typeLabel = LESSON_TYPE_LABELS[lesson.lessonType] || lesson.lessonType;
    
    const targetDisplay = lesson.target?.startsWith("GROUP:") 
        ? `👥 ${lesson.target.replace("GROUP:", "")}`
        : lesson.target?.startsWith("STREAM:")
        ? `📚 ${lesson.target.replace("STREAM:", "")}`
        : lesson.target || null;

    return (
        <div className="schedule-lesson">
            <div className="schedule-lesson-type" style={{ background: typeColor }}>
                {typeLabel}
            </div>
            <div className="schedule-lesson-content">
                <div className="schedule-lesson-header">
                    <span className="schedule-lesson-time">
                        {formatTime(lesson.startsAtIso)} - {formatTime(lesson.endsAtIso)}
                    </span>
                </div>
                <div className="schedule-lesson-subject">{lesson.subject}</div>
                <div className="schedule-lesson-details">
                    <span>👤 {lesson.teacher || <em className="text-muted">Не указан</em>}</span>
                    <span>🚪 {lesson.room || <em className="text-muted">Не указана</em>}</span>
                    {targetDisplay && <span>{targetDisplay}</span>}
                </div>
                {lesson.note && <div className="schedule-lesson-note">📝 {lesson.note}</div>}
            </div>
        </div>
    );
}
