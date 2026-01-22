"use client";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";
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
    toIsoDateTime,
    parseTimeToMinutes,
    getMinutesFromIso,
} from "../../../src/lib/dateUtils";
import {
    LESSON_TYPE_LABELS,
    LESSON_TYPE_COLORS,
    LESSON_TYPE_OPTIONS,
    LESSON_STATUS_INFO,
    TIME_SLOTS,
} from "../../../src/lib/constants";
import { Breadcrumbs, StatusFilter } from "../../../src/components/ui";

export default function MethodistSchedulesPage() {
    return <AuthGuard roles={["METHODIST"]}><Inner /></AuthGuard>;
}

function Inner() {
    const { token } = useAuth();
    const [fromDate, setFromDate] = useState(() => toLocalDateInputValue(new Date()));
    const [toDate, setToDate] = useState(() => toLocalDateInputValue(addDaysLocal(new Date(), 7)));
    const [items, setItems] = useState([]);
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");
    const [loading, setLoading] = useState(false);
    const [filterGroupId, setFilterGroupId] = useState("");
    const [filterTeacherId, setFilterTeacherId] = useState("");
    const [filterRoomId, setFilterRoomId] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [groups, setGroups] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [streams, setStreams] = useState([]);
    const [editingLesson, setEditingLesson] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState("calendar"); // "list" | "calendar"

    useEffect(() => {
        (async () => {
            try {
                const [g, t, sub, r, str] = await Promise.all([
                    apiFetch("/catalog/groups", { token }),
                    apiFetch("/catalog/teachers", { token }),
                    apiFetch("/catalog/subjects", { token }),
                    apiFetch("/catalog/rooms", { token }),
                    apiFetch("/catalog/streams", { token }),
                ]);
                setGroups(g); setTeachers(t); setSubjects(sub); setRooms(r); setStreams(str);
            } catch (e) { console.error(e); }
        })();
    }, [token]);

    const query = useMemo(() => ({ 
        fromIso: fromDateStartIso(fromDate), 
        toIso: toDateEndIso(toDate) 
    }), [fromDate, toDate]);

    const groupedByDay = useMemo(() => {
        const g = new Map();
        items.forEach((item) => {
            const dayKey = getDayKey(item.startsAtIso);
            if (!g.has(dayKey)) g.set(dayKey, []);
            g.get(dayKey).push(item);
        });
        g.forEach((lessons) => lessons.sort((a, b) => new Date(a.startsAtIso) - new Date(b.startsAtIso)));
        return new Map([...g.entries()].sort());
    }, [items]);

    const statusStats = useMemo(() => {
        const stats = { DRAFT: 0, CONFLICT: 0, CONFIRMED: 0 };
        items.forEach(item => {
            if (stats[item.status] !== undefined) stats[item.status]++;
        });
        return stats;
    }, [items]);

    // Дни недели для календарного вида
    const weekDays = useMemo(() => {
        const monday = getMondayOfWeek(new Date(fromDate));
        return Array.from({ length: 7 }, (_, i) => addDaysLocal(monday, i));
    }, [fromDate]);

    async function loadSchedule() {
        setErr(""); setLoading(true);
        try {
            let url = `/schedule/all?fromIso=${encodeURIComponent(query.fromIso)}&toIso=${encodeURIComponent(query.toIso)}`;
            if (filterGroupId) url += `&groupId=${filterGroupId}`;
            if (filterTeacherId) url += `&teacherId=${filterTeacherId}`;
            if (filterRoomId) url += `&roomId=${filterRoomId}`;
            if (filterStatus) url += `&status=${filterStatus}`;
            setItems(await apiFetch(url, { token }) || []);
        } catch (e) { setErr(e.message || "Ошибка"); }
        finally { setLoading(false); }
    }

    useEffect(() => { loadSchedule(); }, [query.fromIso, query.toIso, filterGroupId, filterTeacherId, filterRoomId, filterStatus, token]);

    function openEditModal(lesson) {
        const startDate = new Date(lesson.startsAtIso);
        const subject = subjects.find(s => s.title === lesson.subject);
        let targetType = "group", groupId = "", streamId = "";
        if (lesson.groupId) {
            groupId = lesson.groupId.toString();
        } else if (lesson.streamId) {
            targetType = "stream";
            streamId = lesson.streamId.toString();
        } else if (lesson.target) {
            if (lesson.target.startsWith("GROUP:")) {
                const group = groups.find(g => g.code === lesson.target.replace("GROUP:", ""));
                groupId = group ? group.id.toString() : "";
            } else if (lesson.target.startsWith("STREAM:")) {
                targetType = "stream";
                const stream = streams.find(s => s.title === lesson.target.replace("STREAM:", ""));
                streamId = stream ? stream.id.toString() : "";
            }
        }
        setEditForm({
            startDate: toLocalDateInputValue(startDate),
            startTime: formatTime(lesson.startsAtIso),
            endDate: toLocalDateInputValue(startDate),
            endTime: formatTime(lesson.endsAtIso),
            lessonType: lesson.lessonType,
            subjectId: subject ? subject.id.toString() : "",
            teacherId: lesson.teacherId ? lesson.teacherId.toString() : "",
            roomId: lesson.roomId ? lesson.roomId.toString() : "",
            targetType, groupId, streamId,
            note: lesson.note || "",
            force: false,
            asDraft: false,
        });
        setEditingLesson(lesson);
    }

    async function handleSave() {
        setErr(""); setOk(""); setSaving(true);
        try {
            const body = {
                startsAtIso: toIsoDateTime(editForm.startDate, editForm.startTime),
                endsAtIso: toIsoDateTime(editForm.endDate, editForm.endTime),
                lessonType: editForm.lessonType,
                subjectId: Number(editForm.subjectId),
                teacherId: editForm.teacherId ? Number(editForm.teacherId) : null,
                roomId: editForm.roomId ? Number(editForm.roomId) : null,
                note: editForm.note || null,
                groupId: editForm.targetType === "group" && editForm.groupId ? Number(editForm.groupId) : null,
                streamId: editForm.targetType === "stream" && editForm.streamId ? Number(editForm.streamId) : null,
                force: editForm.force,
                asDraft: editForm.asDraft,
            };
            await apiFetch(`/schedule/lessons/${editingLesson.id}`, { method: "PUT", token, body });
            setOk("Занятие обновлено!"); setEditingLesson(null); loadSchedule();
        } catch (e) { setErr(e.message || "Ошибка"); }
        finally { setSaving(false); }
    }

    async function handleConfirm(lesson) {
        if (!confirm(`Подтвердить занятие?\n${lesson.subject}\n${formatDayHeader(lesson.startsAtIso)}`)) return;
        setErr(""); setOk("");
        try {
            await apiFetch(`/schedule/lessons/${lesson.id}/confirm`, { method: "POST", token });
            setOk("Занятие подтверждено!"); loadSchedule();
        } catch (e) { setErr(e.message || "Ошибка подтверждения"); }
    }

    async function handleDelete(lesson) {
        if (!confirm(`Удалить занятие?\n${lesson.subject}\n${formatDayHeader(lesson.startsAtIso)}`)) return;
        setErr(""); setOk("");
        try {
            await apiFetch(`/schedule/lessons/${lesson.id}`, { method: "DELETE", token });
            setOk("Занятие удалено"); loadSchedule();
        } catch (e) { setErr(e.message || "Ошибка"); }
    }

    const handleWeekNav = (direction) => {
        const current = getMondayOfWeek(new Date(fromDate));
        const target = addDaysLocal(current, direction * 7);
        setFromDate(toLocalDateInputValue(target));
        setToDate(toLocalDateInputValue(addDaysLocal(target, 6)));
    };

    const goToCurrentWeek = () => {
        const m = getMondayOfWeek(new Date());
        setFromDate(toLocalDateInputValue(m));
        setToDate(toLocalDateInputValue(addDaysLocal(m, 6)));
    };

    return (
        <div className="page-container">
            <Breadcrumbs items={[
                { label: "Главная", href: "/" },
                { label: "Методист" },
                { label: "Расписание" }
            ]} />
            
            <h2 className="page-title">Управление расписанием</h2>
            
            {/* Статистика по статусам */}
            <div className="stats-row">
                <StatusCard 
                    icon="📝" 
                    count={statusStats.DRAFT} 
                    label="Черновиков" 
                    variant="draft" 
                />
                <StatusCard 
                    icon="⚠️" 
                    count={statusStats.CONFLICT} 
                    label="Конфликтов" 
                    variant="conflict" 
                />
                <StatusCard 
                    icon="✅" 
                    count={statusStats.CONFIRMED} 
                    label="Подтверждено" 
                    variant="confirmed" 
                />
            </div>
            
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
                
                <div className="filters-row">
                    <div className="filter-group filter-group-wide">
                        <label className="filter-label">Группа</label>
                        <select className="input" value={filterGroupId} onChange={(e) => { setFilterGroupId(e.target.value); setFilterTeacherId(""); setFilterRoomId(""); }}>
                            <option value="">Все</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.code}</option>)}
                        </select>
                    </div>
                    <div className="filter-group filter-group-wide">
                        <label className="filter-label">Преподаватель</label>
                        <select className="input" value={filterTeacherId} onChange={(e) => { setFilterTeacherId(e.target.value); setFilterGroupId(""); setFilterRoomId(""); }}>
                            <option value="">Все</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                        </select>
                    </div>
                    <div className="filter-group filter-group-wide">
                        <label className="filter-label">Аудитория</label>
                        <select className="input" value={filterRoomId} onChange={(e) => { setFilterRoomId(e.target.value); setFilterGroupId(""); setFilterTeacherId(""); }}>
                            <option value="">Все</option>
                            {rooms.map(r => <option key={r.id} value={r.id}>{r.code}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="filters-row filters-row-between">
                    <div className="filter-group">
                        <label className="filter-label">Статус</label>
                        <StatusFilter value={filterStatus} onChange={setFilterStatus} />
                    </div>
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
            {ok && <div className="ok">{ok}</div>}
            {loading && <div className="loading-state">Загрузка...</div>}

            {!loading && items.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    Нет занятий
                </div>
            )}

            {/* Режим списка */}
            {!loading && items.length > 0 && viewMode === "list" && (
                <div className="schedule-container">
                    {Array.from(groupedByDay.entries()).map(([dayKey, lessons]) => (
                        <DayCard 
                            key={dayKey}
                            lessons={lessons}
                            onEdit={openEditModal}
                            onDelete={handleDelete}
                            onConfirm={handleConfirm}
                        />
                    ))}
                </div>
            )}

            {/* Режим календаря (Outlook-style) */}
            {!loading && viewMode === "calendar" && (
                <CalendarView
                    weekDays={weekDays}
                    items={items}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onConfirm={handleConfirm}
                />
            )}

            {editingLesson && (
                <EditModal
                    editForm={editForm}
                    setEditForm={setEditForm}
                    subjects={subjects}
                    teachers={teachers}
                    rooms={rooms}
                    groups={groups}
                    streams={streams}
                    saving={saving}
                    onSave={handleSave}
                    onClose={() => setEditingLesson(null)}
                />
            )}
        </div>
    );
}

// === Выделенные компоненты ===

const CALENDAR_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const HOUR_HEIGHT = 60; // px per hour
const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function CalendarView({ weekDays, items, onEdit, onDelete, onConfirm }) {
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
                                <CalendarLessonBlock 
                                    key={lesson.id} 
                                    lesson={lesson}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onConfirm={onConfirm}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function CalendarLessonBlock({ lesson, onEdit, onDelete, onConfirm }) {
    const startMinutes = getMinutesFromIso(lesson.startsAtIso);
    const endMinutes = getMinutesFromIso(lesson.endsAtIso);
    const duration = endMinutes - startMinutes;
    
    const startHour = CALENDAR_HOURS[0];
    const topOffset = ((startMinutes - startHour * 60) / 60) * HOUR_HEIGHT;
    const height = (duration / 60) * HOUR_HEIGHT;
    
    const typeColor = LESSON_TYPE_COLORS[lesson.lessonType] || "#6C757D";
    const statusClass = `calendar-lesson-${lesson.status?.toLowerCase() || "confirmed"}`;
    
    const [showActions, setShowActions] = useState(false);
    
    return (
        <div 
            className={`calendar-lesson ${statusClass}`}
            style={{ 
                top: topOffset,
                height: Math.max(height - 2, 20),
                borderLeftColor: typeColor,
            }}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="calendar-lesson-time">
                {formatTime(lesson.startsAtIso)} - {formatTime(lesson.endsAtIso)}
            </div>
            <div className="calendar-lesson-subject">{lesson.subject}</div>
            {height > 40 && (
                <div className="calendar-lesson-info">
                    {lesson.room && <span>🚪 {lesson.room}</span>}
                    {lesson.teacher && <span>👤 {lesson.teacher}</span>}
                </div>
            )}
            {showActions && (
                <div className="calendar-lesson-actions">
                    {lesson.status !== "CONFIRMED" && (
                        <button onClick={() => onConfirm(lesson)} className="cal-btn cal-btn-confirm" title="Подтвердить">✅</button>
                    )}
                    <button onClick={() => onEdit(lesson)} className="cal-btn cal-btn-edit" title="Редактировать">✏️</button>
                    <button onClick={() => onDelete(lesson)} className="cal-btn cal-btn-delete" title="Удалить">🗑️</button>
                </div>
            )}
        </div>
    );
}

function StatusCard({ icon, count, label, variant }) {
    return (
        <div className={`stat-card stat-card-${variant}`}>
            <span className="stat-card-icon">{icon}</span>
            <div>
                <div className="stat-card-count">{count}</div>
                <div className="stat-card-label">{label}</div>
            </div>
        </div>
    );
}

function DayCard({ lessons, onEdit, onDelete, onConfirm }) {
    const past = isPastDay(lessons[0].startsAtIso);
    
    return (
        <div className={`schedule-day ${past ? "schedule-day-past" : ""}`}>
            <div className="schedule-day-header">
                {formatDayHeader(lessons[0].startsAtIso)}
                <span className="schedule-day-count">{lessons.length} зан.</span>
            </div>
            <div className="schedule-lessons">
                {lessons.map(lesson => (
                    <LessonRow 
                        key={lesson.id} 
                        lesson={lesson} 
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onConfirm={onConfirm}
                    />
                ))}
            </div>
        </div>
    );
}

function LessonRow({ lesson, onEdit, onDelete, onConfirm }) {
    const statusInfo = LESSON_STATUS_INFO[lesson.status] || { label: lesson.status, className: "", icon: "" };
    const typeColor = LESSON_TYPE_COLORS[lesson.lessonType] || "#6C757D";
    const typeLabel = LESSON_TYPE_LABELS[lesson.lessonType] || lesson.lessonType;
    
    const targetDisplay = lesson.target?.startsWith("GROUP:") 
        ? `👥 ${lesson.target.replace("GROUP:", "")}`
        : lesson.target?.startsWith("STREAM:")
        ? `📚 ${lesson.target.replace("STREAM:", "")}`
        : lesson.target || null;

    return (
        <div className={`schedule-lesson lesson-card-${lesson.status?.toLowerCase() || "confirmed"}`}>
            <div className="schedule-lesson-type" style={{ background: typeColor }}>
                {typeLabel}
            </div>
            <div className="schedule-lesson-content">
                <div className="schedule-lesson-header">
                    <span className="schedule-lesson-time">
                        {formatTime(lesson.startsAtIso)} - {formatTime(lesson.endsAtIso)}
                    </span>
                    <span className={`status-badge ${statusInfo.className}`}>
                        {statusInfo.icon} {statusInfo.label}
                    </span>
                </div>
                <div className="schedule-lesson-subject">{lesson.subject}</div>
                <div className="schedule-lesson-details">
                    <span>👤 {lesson.teacher || <em className="text-muted">Не указан</em>}</span>
                    <span>🚪 {lesson.room || <em className="text-muted">Не указана</em>}</span>
                    {targetDisplay && <span>{targetDisplay}</span>}
                </div>
                {lesson.note && <div className="schedule-lesson-note">📝 {lesson.note}</div>}
                {lesson.conflictInfo && <div className="conflict-info">{lesson.conflictInfo}</div>}
            </div>
            <div className="lesson-actions">
                {lesson.status !== "CONFIRMED" && (
                    <button onClick={() => onConfirm(lesson)} className="btn-icon btn-icon-success" title="Подтвердить">✅</button>
                )}
                <button onClick={() => onEdit(lesson)} className="btn-icon btn-icon-primary" title="Редактировать">✏️</button>
                <button onClick={() => onDelete(lesson)} className="btn-icon btn-icon-danger" title="Удалить">🗑️</button>
            </div>
        </div>
    );
}

function EditModal({ editForm, setEditForm, subjects, teachers, rooms, groups, streams, saving, onSave, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>✏️ Редактирование</h3>
                    <button onClick={onClose} className="modal-close">✕</button>
                </div>
                <div className="modal-body">
                    <div className="form-row form-row-3">
                        <div className="form-group">
                            <label className="form-label">Дата</label>
                            <input className="input" type="date" value={editForm.startDate || ""} onChange={e => setEditForm({...editForm, startDate: e.target.value, endDate: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Начало</label>
                            <input className="input" type="time" value={editForm.startTime || ""} onChange={e => setEditForm({...editForm, startTime: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Конец</label>
                            <input className="input" type="time" value={editForm.endTime || ""} onChange={e => setEditForm({...editForm, endTime: e.target.value})} />
                        </div>
                    </div>
                    
                    <div className="form-row form-row-2">
                        <div className="form-group">
                            <label className="form-label">Тип</label>
                            <select className="input" value={editForm.lessonType || ""} onChange={e => setEditForm({...editForm, lessonType: e.target.value})}>
                                {LESSON_TYPE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Дисциплина</label>
                            <select className="input" value={editForm.subjectId || ""} onChange={e => setEditForm({...editForm, subjectId: e.target.value})}>
                                <option value="">Выберите</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="form-row form-row-2">
                        <div className="form-group">
                            <label className="form-label">Преподаватель <span className="form-label-hint">(опционально)</span></label>
                            <select className="input" value={editForm.teacherId || ""} onChange={e => setEditForm({...editForm, teacherId: e.target.value})}>
                                <option value="">Не выбран</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Аудитория <span className="form-label-hint">(опционально)</span></label>
                            <select className="input" value={editForm.roomId || ""} onChange={e => setEditForm({...editForm, roomId: e.target.value})}>
                                <option value="">Не выбрана</option>
                                {rooms.map(r => <option key={r.id} value={r.id}>{r.code} ({r.capacity} мест)</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Для кого</label>
                        <div className="radio-group">
                            <label className="radio-label">
                                <input type="radio" checked={editForm.targetType === "group"} onChange={() => setEditForm({...editForm, targetType: "group", streamId: ""})} /> Группа
                            </label>
                            <label className="radio-label">
                                <input type="radio" checked={editForm.targetType === "stream"} onChange={() => setEditForm({...editForm, targetType: "stream", groupId: ""})} /> Поток
                            </label>
                        </div>
                        {editForm.targetType === "group" ? (
                            <select className="input" value={editForm.groupId || ""} onChange={e => setEditForm({...editForm, groupId: e.target.value})}>
                                <option value="">Выберите группу</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.code} - {g.title}</option>)}
                            </select>
                        ) : (
                            <select className="input" value={editForm.streamId || ""} onChange={e => setEditForm({...editForm, streamId: e.target.value})}>
                                <option value="">Выберите поток</option>
                                {streams.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Примечание</label>
                        <textarea className="textarea" value={editForm.note || ""} onChange={e => setEditForm({...editForm, note: e.target.value})} rows={2} />
                    </div>
                    
                    <div className="save-options">
                        <div>
                            <label className="save-option">
                                <input type="checkbox" checked={editForm.asDraft || false} onChange={e => setEditForm({...editForm, asDraft: e.target.checked, force: false})} />
                                <span className="save-option-label">Сохранить как черновик</span>
                            </label>
                            <div className="save-option-hint">Не проверять конфликты</div>
                        </div>
                        <div>
                            <label className="save-option">
                                <input type="checkbox" checked={editForm.force || false} onChange={e => setEditForm({...editForm, force: e.target.checked, asDraft: false})} />
                                <span className="save-option-label">Принудительно сохранить</span>
                            </label>
                            <div className="save-option-hint">Сохранить с конфликтами</div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
                    <button className="btn btn-primary" onClick={onSave} disabled={saving}>
                        {saving ? "..." : "Сохранить"}
                    </button>
                </div>
            </div>
        </div>
    );
}
