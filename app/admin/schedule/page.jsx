"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";
import { toIsoDateTime, formatTime, toLocalDateInputValue } from "../../../src/lib/dateUtils";
import { LESSON_TYPE_OPTIONS, TIME_SLOTS } from "../../../src/lib/constants";
import { Breadcrumbs } from "../../../src/components/ui";

export default function AdminSchedulePage() {
    return (
        <AuthGuard roles={["ADMIN"]}>
            <AdminScheduleInner />
        </AuthGuard>
    );
}

function AdminScheduleInner() {
    const { token } = useAuth();

    // Справочники
    const [groups, setGroups] = useState([]);
    const [streams, setStreams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");

    // Форма
    const [lessonDate, setLessonDate] = useState("");
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
    
    // Проверка конфликтов
    const [conflicts, setConflicts] = useState(null);
    const [checkingConflicts, setCheckingConflicts] = useState(false);
    
    // Занятость аудитории
    const [roomSchedule, setRoomSchedule] = useState([]);
    const [showRoomSchedule, setShowRoomSchedule] = useState(false);

    // Загрузка справочников
    useEffect(() => {
        let alive = true;
        (async () => {
            setErr("");
            try {
                const [g, s, sub, t, r] = await Promise.all([
                    apiFetch("/catalog/groups", { token }),
                    apiFetch("/catalog/streams", { token }),
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

    // Установка даты по умолчанию
    useEffect(() => {
        setLessonDate(toLocalDateInputValue(new Date()));
    }, []);
    
    // Загрузка расписания аудитории
    useEffect(() => {
        if (!roomId || !lessonDate) {
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
    }, [roomId, lessonDate, token]);
    
    // Применение временного слота
    function applyTimeSlot(slot) {
        setStartTime(slot.start);
        setEndTime(slot.end);
    }
    
    // Проверка конфликтов
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

    async function handleSubmit(e) {
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
            
            // Reset form
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

    return (
        <div className="page-container">
            <Breadcrumbs items={[
                { label: "Главная", href: "/" },
                { label: "Админ" },
                { label: "Добавить занятие" }
            ]} />
            
            <div className="card">
                <h3 className="card-title">Добавление занятия</h3>

                {err && <div className="error">{err}</div>}
                {ok && <div className="ok">{ok}</div>}

                <form onSubmit={handleSubmit} className="lesson-form">
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
                    
                    {/* Дата и время */}
                    <div className="form-row form-row-3">
                        <div className="form-group">
                            <label className="form-label">Дата *</label>
                            <input className="input" type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} required />
                        </div>
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
                            <select className="input" value={streamId} onChange={(e) => setStreamId(e.target.value)} required={targetType === "stream" && !asDraft}>
                                <option value="">Выберите поток</option>
                                {streams.map((s) => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Примечание */}
                    <div className="form-group">
                        <label className="form-label">Примечание</label>
                        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Дополнительная информация о занятии" rows={3} />
                    </div>
                    
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

                    <button className={`btn btn-submit ${asDraft ? "btn-draft" : force ? "btn-force" : "btn-primary"}`} type="submit" disabled={loading}>
                        {loading ? "Создание..." : (asDraft ? "📝 Сохранить как черновик" : (force ? "⚠️ Сохранить с конфликтом" : "✅ Добавить занятие"))}
                    </button>
                </form>
            </div>
        </div>
    );
}
