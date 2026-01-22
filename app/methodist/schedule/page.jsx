"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";
import { toIsoDateTime, formatTime, toLocalDateInputValue } from "../../../src/lib/dateUtils";
import { LESSON_TYPE_OPTIONS, TIME_SLOTS } from "../../../src/lib/constants";
import { Breadcrumbs } from "../../../src/components/ui";

const DAYS_OF_WEEK = [
    { value: 1, label: "Понедельник" },
    { value: 2, label: "Вторник" },
    { value: 3, label: "Среда" },
    { value: 4, label: "Четверг" },
    { value: 5, label: "Пятница" },
    { value: 6, label: "Суббота" },
    { value: 7, label: "Воскресенье" },
];

const REPEAT_PATTERNS = [
    { value: "WEEKLY", label: "Каждую неделю", description: "Занятие каждую неделю" },
    { value: "EVEN_WEEKS", label: "Чётные недели", description: "2, 4, 6, 8... недели" },
    { value: "ODD_WEEKS", label: "Нечётные недели", description: "1, 3, 5, 7... недели" },
    { value: "SPECIFIC_WEEKS", label: "Конкретные недели", description: "Указать номера недель" },
];

export default function MethodistSchedulePage() {
    return (
        <AuthGuard roles={["METHODIST"]}>
            <MethodistScheduleInner />
        </AuthGuard>
    );
}

function MethodistScheduleInner() {
    const { token } = useAuth();

    // Режим создания: single или batch
    const [mode, setMode] = useState("single");

    // Справочники
    const [groups, setGroups] = useState([]);
    const [streams, setStreams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [students, setStudents] = useState([]);
    const [streamGroups, setStreamGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");

    // Общие поля формы
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("10:30");
    const [lessonType, setLessonType] = useState("LECTURE");
    const [subjectId, setSubjectId] = useState("");
    const [teacherId, setTeacherId] = useState("");
    const [roomId, setRoomId] = useState("");
    const [targetType, setTargetType] = useState("group");
    const [groupId, setGroupId] = useState("");
    const [streamId, setStreamId] = useState("");
    const [note, setNote] = useState("");
    
    // Опции сохранения
    const [asDraft, setAsDraft] = useState(false);
    const [force, setForce] = useState(false);
    
    // Одиночный режим
    const [lessonDate, setLessonDate] = useState("");
    const [conflicts, setConflicts] = useState(null);
    const [checkingConflicts, setCheckingConflicts] = useState(false);
    const [roomSchedule, setRoomSchedule] = useState([]);
    const [showRoomSchedule, setShowRoomSchedule] = useState(false);
    
    // Пакетный режим
    const [periodStart, setPeriodStart] = useState("");
    const [periodEnd, setPeriodEnd] = useState("");
    const [repeatPattern, setRepeatPattern] = useState("WEEKLY");
    const [dayOfWeek, setDayOfWeek] = useState(1);
    const [specificWeeks, setSpecificWeeks] = useState("");
    const [batchPreview, setBatchPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Загрузка справочников
    useEffect(() => {
        let alive = true;
        (async () => {
            setErr("");
            try {
                const [g, s, sub, t, r] = await Promise.all([
                    apiFetch("/catalog/groups", { token }),
                    apiFetch("/catalog/streams/with-groups", { token }),
                    apiFetch("/catalog/subjects", { token }),
                    apiFetch("/catalog/teachers", { token }),
                    apiFetch("/catalog/rooms", { token }),
                ]);
                if (!alive) return;
                setGroups(g);
                setStreams(s);
                setSubjects(sub);
                setTeachers(t);
                setRooms(r);
            } catch (e) {
                if (alive) setErr(e.message || "Ошибка загрузки справочников");
            }
        })();
        return () => { alive = false; };
    }, [token]);

    // Загрузка студентов группы
    useEffect(() => {
        if (!groupId || targetType !== "group") {
            setStudents([]);
            return;
        }
        let alive = true;
        (async () => {
            try {
                const data = await apiFetch(`/catalog/students/by-group/${groupId}`, { token });
                if (alive) setStudents(data);
            } catch (e) {
                if (alive) setStudents([]);
            }
        })();
        return () => { alive = false; };
    }, [groupId, targetType, token]);
    
    // Обновление групп при выборе потока
    useEffect(() => {
        if (!streamId || targetType !== "stream") {
            setStreamGroups([]);
            return;
        }
        const selectedStream = streams.find(s => s.id === Number(streamId));
        if (selectedStream && selectedStream.groups) {
            setStreamGroups(selectedStream.groups);
        } else {
            setStreamGroups([]);
        }
    }, [streamId, targetType, streams]);

    // Установка дат по умолчанию
    useEffect(() => {
        const today = new Date();
        setLessonDate(toLocalDateInputValue(today));
        
        // Период по умолчанию - текущий семестр (примерно)
        const year = today.getFullYear();
        const month = today.getMonth();
        
        if (month >= 1 && month <= 5) {
            // Весенний семестр: февраль - май
            setPeriodStart(`${year}-02-01`);
            setPeriodEnd(`${year}-05-31`);
        } else {
            // Осенний семестр: сентябрь - декабрь
            setPeriodStart(`${year}-09-01`);
            setPeriodEnd(`${year}-12-31`);
        }
    }, []);
    
    // Загрузка расписания аудитории (для одиночного режима)
    useEffect(() => {
        if (mode !== "single" || !roomId || !lessonDate) {
            setRoomSchedule([]);
            return;
        }
        let alive = true;
        (async () => {
            try {
                const [y, m, d] = lessonDate.split("-").map(Number);
                const fromIso = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
                const toIso = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
                const data = await apiFetch(`/schedule/rooms/${roomId}/schedule?fromIso=${encodeURIComponent(fromIso)}&toIso=${encodeURIComponent(toIso)}`, { token });
                if (alive) setRoomSchedule(data || []);
            } catch (e) {
                if (alive) setRoomSchedule([]);
            }
        })();
        return () => { alive = false; };
    }, [roomId, lessonDate, token, mode]);
    
    // Применение временного слота
    function applyTimeSlot(slot) {
        setStartTime(slot.start);
        setEndTime(slot.end);
    }
    
    // Проверка конфликтов (одиночный режим)
    async function checkConflicts() {
        if (!lessonDate || !startTime || !endTime || !subjectId) return;
        
        setCheckingConflicts(true);
        try {
            const body = {
                startsAtIso: toIsoDateTime(lessonDate, startTime),
                endsAtIso: toIsoDateTime(lessonDate, endTime),
                lessonType,
                subjectId: Number(subjectId),
                teacherId: teacherId ? Number(teacherId) : null,
                roomId: roomId ? Number(roomId) : null,
                groupId: targetType === "group" && groupId ? Number(groupId) : null,
                streamId: targetType === "stream" && streamId ? Number(streamId) : null,
            };
            const result = await apiFetch("/schedule/check-conflicts", { method: "POST", token, body });
            setConflicts(result);
        } catch (e) {
            console.error("Ошибка проверки конфликтов:", e);
        } finally {
            setCheckingConflicts(false);
        }
    }
    
    // Предпросмотр пакетного создания
    async function handleBatchPreview() {
        if (!subjectId || !periodStart || !periodEnd) return;
        
        setPreviewLoading(true);
        setErr("");
        try {
            const body = buildBatchRequest(true);
            const result = await apiFetch("/schedule/lessons/batch", { method: "POST", token, body });
            setBatchPreview(result);
        } catch (e) {
            setErr(e.message || "Ошибка предпросмотра");
        } finally {
            setPreviewLoading(false);
        }
    }
    
    // Формирование запроса на пакетное создание
    function buildBatchRequest(previewOnly) {
        const weeks = repeatPattern === "SPECIFIC_WEEKS" 
            ? specificWeeks.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n))
            : null;
            
        return {
            startTime,
            endTime,
            periodStartDate: periodStart,
            periodEndDate: periodEnd,
            repeatPattern,
            dayOfWeek,
            specificWeeks: weeks,
            lessonType,
            subjectId: Number(subjectId),
            teacherId: teacherId ? Number(teacherId) : null,
            roomId: roomId ? Number(roomId) : null,
            groupId: targetType === "group" && groupId ? Number(groupId) : null,
            streamId: targetType === "stream" && streamId ? Number(streamId) : null,
            note: note || null,
            force,
            asDraft,
            previewOnly,
        };
    }

    // Отправка формы (одиночный режим)
    async function handleSingleSubmit(e) {
        e.preventDefault();
        setErr("");
        setOk("");
        setLoading(true);

        try {
            const startsAtIso = toIsoDateTime(lessonDate, startTime);
            const endsAtIso = toIsoDateTime(lessonDate, endTime);

            if (!startsAtIso || !endsAtIso) {
                throw new Error("Укажите дату и время начала и окончания");
            }
            if (new Date(startsAtIso) >= new Date(endsAtIso)) {
                throw new Error("Время окончания должно быть позже времени начала");
            }
            if (!subjectId) {
                throw new Error("Выберите дисциплину");
            }
            
            if (!asDraft) {
                if (!teacherId) throw new Error("Выберите преподавателя (или сохраните как черновик)");
                if (!roomId) throw new Error("Выберите аудиторию (или сохраните как черновик)");
                if (targetType === "group" && !groupId) throw new Error("Выберите группу (или сохраните как черновик)");
                if (targetType === "stream" && !streamId) throw new Error("Выберите поток (или сохраните как черновик)");
            }

            const requestBody = {
                startsAtIso,
                endsAtIso,
                lessonType,
                subjectId: Number(subjectId),
                teacherId: teacherId ? Number(teacherId) : null,
                roomId: roomId ? Number(roomId) : null,
                note: note || null,
                asDraft,
                force,
                groupId: targetType === "group" && groupId ? Number(groupId) : null,
                streamId: targetType === "stream" && streamId ? Number(streamId) : null,
            };

            await apiFetch("/schedule/lessons", { method: "POST", token, body: requestBody });

            const statusText = asDraft ? "как черновик" : (force ? "с конфликтом" : "");
            setOk(`Занятие успешно добавлено${statusText ? ` (${statusText})` : ""}!`);
            
            // Reset
            setNote("");
            setGroupId("");
            setStreamId("");
            setConflicts(null);
            setAsDraft(false);
            setForce(false);
        } catch (e) {
            setErr(e.message || "Ошибка создания занятия");
        } finally {
            setLoading(false);
        }
    }
    
    // Отправка формы (пакетный режим)
    async function handleBatchSubmit(e) {
        e.preventDefault();
        setErr("");
        setOk("");
        setLoading(true);

        try {
            if (!subjectId) throw new Error("Выберите дисциплину");
            if (!periodStart || !periodEnd) throw new Error("Укажите период");
            
            if (!asDraft) {
                if (!teacherId) throw new Error("Выберите преподавателя (или сохраните как черновик)");
                if (!roomId) throw new Error("Выберите аудиторию (или сохраните как черновик)");
                if (targetType === "group" && !groupId) throw new Error("Выберите группу (или сохраните как черновик)");
                if (targetType === "stream" && !streamId) throw new Error("Выберите поток (или сохраните как черновик)");
            }
            
            if (repeatPattern === "SPECIFIC_WEEKS") {
                const weeks = specificWeeks.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                if (weeks.length === 0) throw new Error("Укажите номера недель");
            }

            const body = buildBatchRequest(false);
            const result = await apiFetch("/schedule/lessons/batch", { method: "POST", token, body });
            
            setBatchPreview(result);
            setOk(`Создано ${result.created} занятий из ${result.totalDates}${result.skipped > 0 ? `, пропущено: ${result.skipped}` : ""}`);
            
        } catch (e) {
            setErr(e.message || "Ошибка создания занятий");
        } finally {
            setLoading(false);
        }
    }

    // Общие поля формы (дисциплина, преподаватель, аудитория, группа/поток)
    const renderCommonFields = () => (
        <>
            {/* Временные слоты */}
            <div className="form-group">
                <label className="form-label">Быстрый выбор времени (пара)</label>
                <div className="time-slots">
                    {TIME_SLOTS.map(slot => (
                        <button
                            key={slot.number}
                            type="button"
                            className={`time-slot-btn ${startTime === slot.start && endTime === slot.end ? "active" : ""}`}
                            onClick={() => applyTimeSlot(slot)}
                        >
                            {slot.label}
                            <span className="time-slot-time">{slot.start}-{slot.end}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Время */}
            <div className="form-row form-row-2">
                <div className="form-group">
                    <label className="form-label">Начало *</label>
                    <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Окончание *</label>
                    <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>
            </div>

            {/* Тип и дисциплина */}
            <div className="form-row form-row-2">
                <div className="form-group">
                    <label className="form-label">Тип занятия *</label>
                    <select className="input" value={lessonType} onChange={(e) => setLessonType(e.target.value)} required>
                        {LESSON_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Дисциплина *</label>
                    <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
                        <option value="">Выберите дисциплину</option>
                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.code} — {s.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Преподаватель и аудитория */}
            <div className="form-row form-row-2">
                <div className="form-group">
                    <label className="form-label">
                        Преподаватель {!asDraft && "*"}
                        {asDraft && <span className="form-label-hint"> (опционально)</span>}
                    </label>
                    <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required={!asDraft}>
                        <option value="">Выберите преподавателя</option>
                        {teachers.map((t) => (
                            <option key={t.id} value={t.id}>{t.fullName}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">
                        Аудитория {!asDraft && "*"}
                        {asDraft && <span className="form-label-hint"> (опционально)</span>}
                    </label>
                    <select className="input" value={roomId} onChange={(e) => { setRoomId(e.target.value); setShowRoomSchedule(true); }} required={!asDraft}>
                        <option value="">Выберите аудиторию</option>
                        {rooms.map((r) => (
                            <option key={r.id} value={r.id}>{r.code} (вместимость: {r.capacity}, {r.type})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Для кого */}
            <div className="form-group">
                <label className="form-label">Для кого:</label>
                <div className="radio-group">
                    <label className="radio-label">
                        <input type="radio" name="targetType" value="group" checked={targetType === "group"} onChange={(e) => { setTargetType(e.target.value); setStreamId(""); }} />
                        Для группы
                    </label>
                    <label className="radio-label">
                        <input type="radio" name="targetType" value="stream" checked={targetType === "stream"} onChange={(e) => { setTargetType(e.target.value); setGroupId(""); setStudents([]); }} />
                        Для потока
                    </label>
                </div>

                {targetType === "group" ? (
                    <div>
                        <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)} required={targetType === "group" && !asDraft}>
                            <option value="">Выберите группу</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>{g.code} — {g.title}</option>
                            ))}
                        </select>
                        {groupId && students.length > 0 && (
                            <div className="students-preview">
                                <div className="students-preview-title">Студенты в группе ({students.length}):</div>
                                <div className="students-list">
                                    {students.map((s) => (
                                        <span key={s.id} className="student-tag">{s.fullName}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <select className="input" value={streamId} onChange={(e) => setStreamId(e.target.value)} required={targetType === "stream" && !asDraft}>
                            <option value="">Выберите поток</option>
                            {streams.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.title} ({s.groups?.length || 0} групп)
                                </option>
                            ))}
                        </select>
                        {streamId && streamGroups.length > 0 && (
                            <div className="students-preview">
                                <div className="students-preview-title">Группы в потоке ({streamGroups.length}):</div>
                                <div className="students-list">
                                    {streamGroups.map((g) => (
                                        <span key={g.id} className="student-tag">{g.code} — {g.title}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {streamId && streamGroups.length === 0 && (
                            <div className="form-hint">⚠️ В этом потоке нет групп</div>
                        )}
                    </div>
                )}
            </div>

            {/* Примечание */}
            <div className="form-group">
                <label className="form-label">Примечание</label>
                <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Дополнительная информация о занятии" rows={2} />
            </div>
            
            {/* Опции сохранения */}
            <div className="save-options">
                <div>
                    <label className="save-option">
                        <input type="checkbox" checked={asDraft} onChange={e => { setAsDraft(e.target.checked); if (e.target.checked) setForce(false); }} />
                        <span className="save-option-label">📝 Сохранить как черновик</span>
                    </label>
                    <div className="save-option-hint">Не проверять конфликты, можно оставить поля пустыми</div>
                </div>
                <div>
                    <label className="save-option">
                        <input type="checkbox" checked={force} onChange={e => { setForce(e.target.checked); if (e.target.checked) setAsDraft(false); }} />
                        <span className="save-option-label">⚠️ Принудительно сохранить</span>
                    </label>
                    <div className="save-option-hint">Сохранить даже с конфликтами (статус CONFLICT)</div>
                </div>
            </div>
        </>
    );

    return (
        <div className="page-container">
            <Breadcrumbs items={[
                { label: "Главная", href: "/" },
                { label: "Методист" },
                { label: "Добавить занятие" }
            ]} />
            
            <div className="card">
                <h3 className="card-title">Добавление занятия</h3>
                
                {/* Переключатель режимов */}
                <div className="mode-toggle">
                    <button
                        type="button"
                        className={`mode-toggle-btn ${mode === "single" ? "active" : ""}`}
                        onClick={() => { setMode("single"); setBatchPreview(null); }}
                    >
                        📅 Одно занятие
                    </button>
                    <button
                        type="button"
                        className={`mode-toggle-btn ${mode === "batch" ? "active" : ""}`}
                        onClick={() => { setMode("batch"); setConflicts(null); }}
                    >
                        📋 Пакетное создание
                    </button>
                </div>

                {err && <div className="error">{err}</div>}
                {ok && <div className="ok">{ok}</div>}

                {mode === "single" ? (
                    <form onSubmit={handleSingleSubmit} className="lesson-form">
                        {/* Дата (только для одиночного режима) */}
                        <div className="form-group">
                            <label className="form-label">Дата *</label>
                            <input className="input" type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} required />
                        </div>
                        
                        {renderCommonFields()}
                        
                        {/* Занятость аудитории */}
                        {roomId && showRoomSchedule && (
                            <div className="room-availability">
                                <div className="room-availability-header">
                                    <span>🚪 Занятость аудитории на {lessonDate}</span>
                                    <button type="button" onClick={() => setShowRoomSchedule(false)} className="room-availability-close">✕</button>
                                </div>
                                <div className="room-availability-content">
                                    {roomSchedule.length === 0 ? (
                                        <div className="room-free">✅ Аудитория свободна весь день</div>
                                    ) : (
                                        <div className="room-slots">
                                            {roomSchedule.map((lesson) => (
                                                <div key={lesson.id} className="room-slot room-slot-busy" title={`${lesson.subject} - ${lesson.teacher || "Не указан"}`}>
                                                    {formatTime(lesson.startsAtIso)} - {formatTime(lesson.endsAtIso)}
                                                    <br /><small>{lesson.subject}</small>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Проверка конфликтов */}
                        <div className="conflict-check-row">
                            <button type="button" className="btn btn-secondary" onClick={checkConflicts} disabled={checkingConflicts || !subjectId}>
                                {checkingConflicts ? "Проверка..." : "🔍 Проверить конфликты"}
                            </button>
                            {conflicts && (
                                <span className={`conflict-result ${conflicts.hasConflicts ? "has-conflicts" : "no-conflicts"}`}>
                                    {conflicts.hasConflicts ? `⚠️ Найдено конфликтов: ${conflicts.conflicts.length}` : "✅ Конфликтов нет"}
                                </span>
                            )}
                        </div>
                        
                        {/* Детали конфликтов */}
                        {conflicts && conflicts.hasConflicts && (
                            <div className="conflicts-details">
                                <div className="conflicts-title">⚠️ Обнаружены конфликты:</div>
                                {conflicts.conflicts.map((c, i) => (
                                    <div key={i} className="conflict-item">
                                        <span className={`conflict-type conflict-type-${c.type.toLowerCase()}`}>{c.type}</span>
                                        {c.description}
                                    </div>
                                ))}
                                <div className="conflicts-hint">💡 Можно сохранить занятие с конфликтом, отметив "Принудительно сохранить"</div>
                            </div>
                        )}

                        <button className={`btn btn-submit ${asDraft ? "btn-draft" : force ? "btn-force" : "btn-primary"}`} type="submit" disabled={loading}>
                            {loading ? "Создание..." : (asDraft ? "📝 Сохранить как черновик" : (force ? "⚠️ Сохранить с конфликтом" : "✅ Добавить занятие"))}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleBatchSubmit} className="lesson-form">
                        {/* Настройки пакетного создания */}
                        <div className="batch-settings">
                            <h4 className="batch-settings-title">📅 Настройки повторения</h4>
                            
                            {/* Период */}
                            <div className="form-row form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Начало периода *</label>
                                    <input className="input" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Конец периода *</label>
                                    <input className="input" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
                                </div>
                            </div>
                            
                            {/* День недели */}
                            <div className="form-group">
                                <label className="form-label">День недели *</label>
                                <select className="input" value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} required>
                                    {DAYS_OF_WEEK.map(d => (
                                        <option key={d.value} value={d.value}>{d.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Шаблон повторения */}
                            <div className="form-group">
                                <label className="form-label">Шаблон повторения *</label>
                                <div className="repeat-pattern-options">
                                    {REPEAT_PATTERNS.map(p => (
                                        <label key={p.value} className={`repeat-pattern-option ${repeatPattern === p.value ? "active" : ""}`}>
                                            <input
                                                type="radio"
                                                name="repeatPattern"
                                                value={p.value}
                                                checked={repeatPattern === p.value}
                                                onChange={(e) => setRepeatPattern(e.target.value)}
                                            />
                                            <span className="repeat-pattern-label">{p.label}</span>
                                            <span className="repeat-pattern-desc">{p.description}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Конкретные недели */}
                            {repeatPattern === "SPECIFIC_WEEKS" && (
                                <div className="form-group">
                                    <label className="form-label">Номера недель (через запятую) *</label>
                                    <input
                                        className="input"
                                        type="text"
                                        value={specificWeeks}
                                        onChange={(e) => setSpecificWeeks(e.target.value)}
                                        placeholder="3, 7, 11, 15"
                                        required
                                    />
                                    <div className="form-hint">Например: 3, 7, 11, 15 — создаст занятия на 3-й, 7-й, 11-й и 15-й неделях</div>
                                </div>
                            )}
                            
                            {/* Кнопка предпросмотра */}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleBatchPreview}
                                disabled={previewLoading || !subjectId || !periodStart || !periodEnd}
                            >
                                {previewLoading ? "Загрузка..." : "👁 Предпросмотр дат"}
                            </button>
                        </div>
                        
                        {/* Предпросмотр дат */}
                        {batchPreview && (
                            <div className="batch-preview">
                                <h4 className="batch-preview-title">
                                    📋 Предпросмотр: {batchPreview.totalDates} дат
                                    {batchPreview.dates.filter(d => d.hasConflicts).length > 0 && (
                                        <span className="batch-preview-conflicts">
                                            ⚠️ {batchPreview.dates.filter(d => d.hasConflicts).length} с конфликтами
                                        </span>
                                    )}
                                </h4>
                                <div className="batch-preview-list">
                                    {batchPreview.dates.map((d, i) => (
                                        <div key={i} className={`batch-preview-item ${d.hasConflicts ? "has-conflict" : ""} ${d.lessonId ? "created" : ""}`}>
                                            <div className="batch-preview-date">
                                                <span className="batch-preview-weekday">{d.dayOfWeek}</span>
                                                <span className="batch-preview-datestr">{d.date}</span>
                                                <span className="batch-preview-week">Неделя {d.weekNumber}</span>
                                            </div>
                                            {d.hasConflicts && (
                                                <div className="batch-preview-conflicts-list">
                                                    {d.conflicts.map((c, j) => (
                                                        <div key={j} className="batch-preview-conflict">⚠️ {c}</div>
                                                    ))}
                                                </div>
                                            )}
                                            {d.lessonId && (
                                                <div className="batch-preview-created">✅ Создано (ID: {d.lessonId})</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {renderCommonFields()}

                        <button className={`btn btn-submit ${asDraft ? "btn-draft" : force ? "btn-force" : "btn-primary"}`} type="submit" disabled={loading}>
                            {loading ? "Создание..." : (asDraft ? `📝 Создать ${batchPreview?.totalDates || "?"} черновиков` : (force ? `⚠️ Создать ${batchPreview?.totalDates || "?"} занятий с конфликтами` : `✅ Создать ${batchPreview?.totalDates || "?"} занятий`))}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
