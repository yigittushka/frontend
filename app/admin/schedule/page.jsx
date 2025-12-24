"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";

// Преобразовать локальную дату и время в ISO UTC
function toIsoDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    return date.toISOString();
}

export default function AdminSchedulePage() {
    return (
        <AuthGuard roles={["ADMIN"]}>
            <AdminScheduleInner />
        </AuthGuard>
    );
}

function AdminScheduleInner() {
    const { token } = useAuth();

    // Загрузка справочников
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
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("10:30");
    const [lessonType, setLessonType] = useState("LECTURE");
    const [subjectId, setSubjectId] = useState("");
    const [teacherId, setTeacherId] = useState("");
    const [roomId, setRoomId] = useState("");
    const [targetType, setTargetType] = useState("group"); // "group" or "stream"
    const [groupId, setGroupId] = useState("");
    const [streamId, setStreamId] = useState("");
    const [note, setNote] = useState("");

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
        return () => {
            alive = false;
        };
    }, [token]);

    // Загрузка студентов при выборе группы
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
                if (alive) {
                    console.error("Ошибка загрузки студентов:", e);
                    setStudents([]);
                }
            }
        })();
        return () => {
            alive = false;
        };
    }, [groupId, targetType, token]);

    // Установка сегодняшней даты по умолчанию
    useEffect(() => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        setStartDate(dateStr);
        setEndDate(dateStr);
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setErr("");
        setOk("");
        setLoading(true);

        try {
            const startsAtIso = toIsoDateTime(startDate, startTime);
            const endsAtIso = toIsoDateTime(endDate, endTime);

            if (!startsAtIso || !endsAtIso) {
                throw new Error("Укажите дату и время начала и окончания");
            }

            if (new Date(startsAtIso) >= new Date(endsAtIso)) {
                throw new Error("Время окончания должно быть позже времени начала");
            }

            if (!subjectId || !teacherId || !roomId) {
                throw new Error("Заполните все обязательные поля");
            }

            const requestBody = {
                startsAtIso,
                endsAtIso,
                lessonType,
                subjectId: Number(subjectId),
                teacherId: Number(teacherId),
                roomId: Number(roomId),
                note: note || null,
            };

            if (targetType === "group") {
                if (!groupId) {
                    throw new Error("Выберите группу");
                }
                requestBody.groupId = Number(groupId);
                requestBody.streamId = null;
            } else {
                if (!streamId) {
                    throw new Error("Выберите поток");
                }
                requestBody.streamId = Number(streamId);
                requestBody.groupId = null;
            }

            await apiFetch("/schedule/lessons", {
                method: "POST",
                token,
                body: requestBody,
            });

            setOk("Занятие успешно добавлено!");
            // Очистка формы
            setNote("");
            setGroupId("");
            setStreamId("");
        } catch (e) {
            setErr(e.message || "Ошибка создания занятия");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card">
            <h3 style={{ marginTop: 0 }}>Добавление расписания (ADMIN)</h3>

            {err && <div className="error" style={{ marginBottom: 16 }}>{err}</div>}
            {ok && <div className="ok" style={{ marginBottom: 16 }}>{ok}</div>}

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, maxWidth: 800 }}>
                {/* Дата и время */}
                <div className="row" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: "1 1 200px" }}>
                        <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                            Дата начала *
                        </label>
                        <input
                            className="input"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ flex: "1 1 150px" }}>
                        <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                            Время начала *
                        </label>
                        <input
                            className="input"
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ flex: "1 1 200px" }}>
                        <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                            Дата окончания *
                        </label>
                        <input
                            className="input"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ flex: "1 1 150px" }}>
                        <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                            Время окончания *
                        </label>
                        <input
                            className="input"
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {/* Тип занятия, предмет, преподаватель, аудитория */}
                <div className="row" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: "1 1 200px" }}>
                        <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                            Тип занятия *
                        </label>
                        <select
                            className="input"
                            value={lessonType}
                            onChange={(e) => setLessonType(e.target.value)}
                            required
                        >
                            <option value="LECTURE">Лекция</option>
                            <option value="PRACTICE">Практика</option>
                            <option value="LAB">Лабораторная</option>
                        </select>
                    </div>
                    <div style={{ flex: "1 1 250px" }}>
                        <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                            Дисциплина *
                        </label>
                        <select
                            className="input"
                            value={subjectId}
                            onChange={(e) => setSubjectId(e.target.value)}
                            required
                        >
                            <option value="">Выберите дисциплину</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.code} — {s.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="row" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: "1 1 250px" }}>
                        <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                            Преподаватель *
                        </label>
                        <select
                            className="input"
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                            required
                        >
                            <option value="">Выберите преподавателя</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.fullName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ flex: "1 1 200px" }}>
                        <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                            Аудитория *
                        </label>
                        <select
                            className="input"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            required
                        >
                            <option value="">Выберите аудиторию</option>
                            {rooms.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.code} (вместимость: {r.capacity}, {r.type})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Группа или поток */}
                <div>
                    <label className="muted" style={{ display: "block", marginBottom: 8 }}>
                        Тип занятия:
                    </label>
                    <div className="row" style={{ marginBottom: 12 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                                type="radio"
                                name="targetType"
                                value="group"
                                checked={targetType === "group"}
                                onChange={(e) => {
                                    setTargetType(e.target.value);
                                    setStreamId("");
                                }}
                            />
                            Для группы
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                                type="radio"
                                name="targetType"
                                value="stream"
                                checked={targetType === "stream"}
                                onChange={(e) => {
                                    setTargetType(e.target.value);
                                    setGroupId("");
                                    setStudents([]);
                                }}
                            />
                            Для потока
                        </label>
                    </div>

                    {targetType === "group" ? (
                        <div>
                            <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                                Группа *
                            </label>
                            <select
                                className="input"
                                value={groupId}
                                onChange={(e) => setGroupId(e.target.value)}
                                required={targetType === "group"}
                            >
                                <option value="">Выберите группу</option>
                                {groups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.code} — {g.title}
                                    </option>
                                ))}
                            </select>

                            {groupId && students.length > 0 && (
                                <div style={{ marginTop: 12, padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
                                    <div className="muted" style={{ marginBottom: 8, fontWeight: 600 }}>
                                        Студенты в группе ({students.length}):
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                        {students.map((s) => (
                                            <span
                                                key={s.id}
                                                style={{
                                                    padding: "4px 8px",
                                                    background: "#fff",
                                                    borderRadius: 4,
                                                    fontSize: 13,
                                                }}
                                            >
                                                {s.fullName}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                                Поток *
                            </label>
                            <select
                                className="input"
                                value={streamId}
                                onChange={(e) => setStreamId(e.target.value)}
                                required={targetType === "stream"}
                            >
                                <option value="">Выберите поток</option>
                                {streams.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Примечание */}
                <div>
                    <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                        Примечание
                    </label>
                    <textarea
                        className="textarea"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Дополнительная информация о занятии"
                        rows={3}
                    />
                </div>

                <button className="btn" type="submit" disabled={loading}>
                    {loading ? "Создание..." : "Добавить занятие"}
                </button>
            </form>
        </div>
    );
}

