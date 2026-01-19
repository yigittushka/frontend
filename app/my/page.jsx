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

    const [fromDate, setFromDate] = useState(() => toLocalDateInputValue(new Date()));
    const [toDate, setToDate] = useState(() => toLocalDateInputValue(addDaysLocal(new Date(), 7)));
    const [items, setItems] = useState([]);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

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
            
            <div className="card">
                <h3 className="card-title">Моё расписание {roleLabel}</h3>

                <div className="my-schedule-filters">
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

                {err && <div className="error">{err}</div>}
                {loading && <div className="loading-state">Загрузка...</div>}

                {!loading && groupedByDay.size === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">📅</div>
                        Нет занятий в выбранном диапазоне
                    </div>
                )}

                {!loading && groupedByDay.size > 0 && (
                    <div className="schedule-container">
                        {Array.from(groupedByDay.entries()).map(([dayKey, lessons]) => {
                            const isPast = isPastDay(lessons[0].startsAtIso);
                            return (
                                <div key={dayKey} className={`schedule-day ${isPast ? "schedule-day-past" : ""}`}>
                                    <h4 className="schedule-day-header">{formatDayHeader(lessons[0].startsAtIso)}</h4>
                                    <div className="schedule-lessons">
                                        {lessons.map((lesson) => {
                                            const typeColor = LESSON_TYPE_COLORS[lesson.lessonType] || "#6C757D";
                                            const typeLabel = LESSON_TYPE_LABELS[lesson.lessonType] || lesson.lessonType;
                                            const targetDisplay = lesson.target?.startsWith("GROUP:")
                                                ? `👥 ${lesson.target.replace("GROUP:", "")}`
                                                : lesson.target?.startsWith("STREAM:")
                                                ? `📚 ${lesson.target.replace("STREAM:", "")}`
                                                : lesson.target;
                                            
                                            return (
                                                <div key={lesson.id} className="schedule-lesson">
                                                    <div className="schedule-lesson-type" style={{ background: typeColor }}>
                                                        {typeLabel}
                                                    </div>
                                                    <div className="schedule-lesson-content">
                                                        <div className="schedule-lesson-time">
                                                            {formatTime(lesson.startsAtIso)} - {formatTime(lesson.endsAtIso)}
                                                        </div>
                                                        <div className="schedule-lesson-subject">{lesson.subject}</div>
                                                        <div className="schedule-lesson-details">
                                                            <span>👤 {lesson.teacher}</span>
                                                            <span>🚪 {lesson.room}</span>
                                                            {targetDisplay && <span>{targetDisplay}</span>}
                                                        </div>
                                                        {lesson.note && (
                                                            <div className="schedule-lesson-note">📝 {lesson.note}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
