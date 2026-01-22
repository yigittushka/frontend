"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";
import {
    toLocalDateInputValue,
    fromDateStartIso,
    toDateEndIso,
    formatTime,
    parseTimeToMinutes,
    getMinutesFromIso,
} from "../../../src/lib/dateUtils";
import { TIME_SLOTS, LESSON_STATUS_INFO, ROOM_TYPE_LABELS } from "../../../src/lib/constants";
import { Breadcrumbs } from "../../../src/components/ui";

export default function MethodistRoomsPage() {
    return (
        <AuthGuard roles={["ADMIN", "METHODIST"]}>
            <RoomsAvailabilityInner />
        </AuthGuard>
    );
}

function RoomsAvailabilityInner() {
    const { token } = useAuth();
    const [selectedDate, setSelectedDate] = useState(() => toLocalDateInputValue(new Date()));
    const [rooms, setRooms] = useState([]);
    const [availability, setAvailability] = useState({});
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [roomDetails, setRoomDetails] = useState([]);
    const [filterStatus, setFilterStatus] = useState(""); // "", "FREE", "CONFIRMED", "DRAFT", "CONFLICT"

    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetch("/catalog/rooms", { token });
                setRooms(data || []);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [token]);

    async function loadAvailability() {
        setLoading(true);
        setErr("");
        try {
            const fromIso = fromDateStartIso(selectedDate);
            const toIso = toDateEndIso(selectedDate);
            const data = await apiFetch(`/schedule/rooms/availability?fromIso=${encodeURIComponent(fromIso)}&toIso=${encodeURIComponent(toIso)}`, { token });
            setAvailability(data || {});
        } catch (e) {
            setErr(e.message || "Ошибка загрузки");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (selectedDate) loadAvailability();
    }, [selectedDate, token]);

    async function loadRoomDetails(roomId) {
        try {
            const fromIso = fromDateStartIso(selectedDate);
            const toIso = toDateEndIso(selectedDate);
            const data = await apiFetch(`/schedule/rooms/${roomId}/schedule?fromIso=${encodeURIComponent(fromIso)}&toIso=${encodeURIComponent(toIso)}`, { token });
            setRoomDetails(data || []);
        } catch (e) {
            setRoomDetails([]);
        }
    }

    function handleRoomClick(room) {
        setSelectedRoom(room);
        loadRoomDetails(room.id);
    }

    function getLessonInSlot(roomCode, slot) {
        const lessons = availability[roomCode] || [];
        const slotStart = parseTimeToMinutes(slot.start);
        const slotEnd = parseTimeToMinutes(slot.end);
        
        return lessons.find(lesson => {
            const lessonStart = getMinutesFromIso(lesson.startsAtIso);
            const lessonEnd = getMinutesFromIso(lesson.endsAtIso);
            return lessonStart < slotEnd && lessonEnd > slotStart;
        });
    }

    function isSlotBusy(roomCode, slot) {
        return !!getLessonInSlot(roomCode, slot);
    }

    const stats = useMemo(() => {
        let totalSlots = rooms.length * TIME_SLOTS.length;
        let freeSlots = 0;
        let confirmedSlots = 0;
        let draftSlots = 0;
        let conflictSlots = 0;
        
        rooms.forEach(room => {
            TIME_SLOTS.forEach(slot => {
                const lesson = getLessonInSlot(room.code, slot);
                if (!lesson) {
                    freeSlots++;
                } else if (lesson.status === "CONFIRMED") {
                    confirmedSlots++;
                } else if (lesson.status === "DRAFT") {
                    draftSlots++;
                } else if (lesson.status === "CONFLICT") {
                    conflictSlots++;
                }
            });
        });
        
        return {
            total: rooms.length,
            totalSlots,
            freeSlots,
            confirmedSlots,
            draftSlots,
            conflictSlots,
            busySlots: totalSlots - freeSlots,
            occupancy: totalSlots > 0 ? Math.round(((totalSlots - freeSlots) / totalSlots) * 100) : 0
        };
    }, [rooms, availability]);

    // Фильтрация аудиторий по статусу
    const filteredRooms = useMemo(() => {
        if (!filterStatus) return rooms;
        
        return rooms.filter(room => {
            const roomLessons = availability[room.code] || [];
            
            if (filterStatus === "FREE") {
                // Показать только полностью свободные аудитории
                return roomLessons.length === 0;
            }
            
            // Для других фильтров — показать аудитории с занятиями этого статуса
            return roomLessons.some(lesson => lesson.status === filterStatus);
        });
    }, [rooms, availability, filterStatus]);

    // Считаем статистику по аудиториям
    const roomStats = useMemo(() => {
        let freeRooms = 0;
        let roomsWithConfirmed = 0;
        let roomsWithDraft = 0;
        let roomsWithConflict = 0;
        
        rooms.forEach(room => {
            const roomLessons = availability[room.code] || [];
            if (roomLessons.length === 0) {
                freeRooms++;
            }
            if (roomLessons.some(l => l.status === "CONFIRMED")) roomsWithConfirmed++;
            if (roomLessons.some(l => l.status === "DRAFT")) roomsWithDraft++;
            if (roomLessons.some(l => l.status === "CONFLICT")) roomsWithConflict++;
        });
        
        return { freeRooms, roomsWithConfirmed, roomsWithDraft, roomsWithConflict };
    }, [rooms, availability]);

    const navigateDate = (days) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(toLocalDateInputValue(d));
    };

    return (
        <div className="page-container rooms-page">
            <Breadcrumbs items={[
                { label: "Главная", href: "/" },
                { label: "Методист" },
                { label: "Аудитории" }
            ]} />
            
            <h2 className="page-title">🚪 Занятость аудиторий</h2>
            
            {/* Статистика — кликабельная для фильтрации */}
            <div className="rooms-stats">
                <div 
                    className={`rooms-stat rooms-stat-total ${filterStatus === "" ? "rooms-stat-active" : ""}`}
                    onClick={() => setFilterStatus("")}
                    title="Показать все аудитории"
                >
                    <div className="rooms-stat-value">{stats.total}</div>
                    <div className="rooms-stat-label">Всего аудиторий</div>
                </div>
                <div 
                    className={`rooms-stat rooms-stat-free ${filterStatus === "FREE" ? "rooms-stat-active" : ""}`}
                    onClick={() => setFilterStatus(filterStatus === "FREE" ? "" : "FREE")}
                    title="Показать только полностью свободные аудитории"
                >
                    <div className="rooms-stat-value">{roomStats.freeRooms}</div>
                    <div className="rooms-stat-label">🆓 Свободны</div>
                </div>
                <div 
                    className={`rooms-stat rooms-stat-confirmed ${filterStatus === "CONFIRMED" ? "rooms-stat-active" : ""}`}
                    onClick={() => setFilterStatus(filterStatus === "CONFIRMED" ? "" : "CONFIRMED")}
                    title="Аудитории с подтверждёнными занятиями"
                >
                    <div className="rooms-stat-value">{roomStats.roomsWithConfirmed}</div>
                    <div className="rooms-stat-label">✅ С занятиями</div>
                </div>
                <div 
                    className={`rooms-stat rooms-stat-draft ${filterStatus === "DRAFT" ? "rooms-stat-active" : ""}`}
                    onClick={() => setFilterStatus(filterStatus === "DRAFT" ? "" : "DRAFT")}
                    title="Аудитории с черновиками"
                >
                    <div className="rooms-stat-value">{roomStats.roomsWithDraft}</div>
                    <div className="rooms-stat-label">📝 С черновиками</div>
                </div>
                <div 
                    className={`rooms-stat rooms-stat-conflict ${filterStatus === "CONFLICT" ? "rooms-stat-active" : ""}`}
                    onClick={() => setFilterStatus(filterStatus === "CONFLICT" ? "" : "CONFLICT")}
                    title="Аудитории с конфликтами"
                >
                    <div className="rooms-stat-value">{roomStats.roomsWithConflict}</div>
                    <div className="rooms-stat-label">⚠️ С конфликтами</div>
                </div>
            </div>
            
            {filterStatus && (
                <div className="filter-active-hint">
                    Фильтр: {filterStatus === "FREE" ? "Полностью свободные" : filterStatus === "CONFIRMED" ? "С подтверждёнными" : filterStatus === "DRAFT" ? "С черновиками" : "С конфликтами"} 
                    ({filteredRooms.length} из {rooms.length})
                    <button className="btn btn-sm btn-secondary" onClick={() => setFilterStatus("")}>Сбросить</button>
                </div>
            )}
            
            {/* Выбор даты */}
            <div className="filters-card">
                <div className="filters-row">
                    <div className="filter-group">
                        <label className="filter-label">Дата</label>
                        <input className="input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                    </div>
                    <div className="week-buttons">
                        <button className="btn btn-sm" onClick={() => setSelectedDate(toLocalDateInputValue(new Date()))}>Сегодня</button>
                        <button className="btn btn-sm" onClick={() => navigateDate(-1)}>← Пред</button>
                        <button className="btn btn-sm" onClick={() => navigateDate(1)}>След →</button>
                    </div>
                </div>
            </div>

            {err && <div className="error">{err}</div>}
            {loading && <div className="loading-state">Загрузка...</div>}

            {/* Таблица занятости */}
            {!loading && filteredRooms.length > 0 && (
                <div className="rooms-table-wrapper">
                    <table className="rooms-table">
                        <thead>
                            <tr>
                                <th className="rooms-table-header-room">Аудитория</th>
                                {TIME_SLOTS.map(slot => (
                                    <th key={slot.label} className="rooms-table-header-slot">
                                        <div>{slot.label}</div>
                                        <div className="rooms-table-slot-time">{slot.start}-{slot.end}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRooms.map(room => (
                                <tr key={room.id}>
                                    <td className="rooms-table-room" onClick={() => handleRoomClick(room)}>
                                        <div className="room-info">
                                            <span className="room-icon">🚪</span>
                                            <div>
                                                <div className="room-code">{room.code}</div>
                                                <div className="room-details">{room.capacity} мест • {ROOM_TYPE_LABELS[room.type] || room.type}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {TIME_SLOTS.map(slot => {
                                        const lesson = getLessonInSlot(room.code, slot);
                                        const isFree = !lesson;
                                        const status = lesson?.status || null;
                                        
                                        // Определяем, соответствует ли слот фильтру
                                        const matchesFilter = !filterStatus 
                                            || (filterStatus === "FREE" && isFree)
                                            || (filterStatus === "CONFIRMED" && status === "CONFIRMED")
                                            || (filterStatus === "DRAFT" && status === "DRAFT")
                                            || (filterStatus === "CONFLICT" && status === "CONFLICT");
                                        
                                        return (
                                            <td key={slot.label} className={`rooms-table-cell ${!matchesFilter ? "slot-dimmed" : ""}`}>
                                                {lesson ? (
                                                    <div className={`slot-busy slot-${lesson.status?.toLowerCase() || "confirmed"} ${matchesFilter ? "slot-highlight" : ""}`} title={`${lesson.subject}\n${lesson.teacher || "Не указан"}`}>
                                                        <div className="slot-subject">{lesson.subject}</div>
                                                        <div className="slot-target">{lesson.target?.replace("GROUP:", "").replace("STREAM:", "") || "—"}</div>
                                                    </div>
                                                ) : (
                                                    <div className={`slot-free ${matchesFilter && filterStatus === "FREE" ? "slot-highlight" : ""}`} title="Свободно">✓</div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && filteredRooms.length === 0 && filterStatus && (
                <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    {filterStatus === "FREE" 
                        ? "Нет полностью свободных аудиторий на эту дату"
                        : filterStatus === "CONFIRMED"
                        ? "Нет аудиторий с подтверждёнными занятиями"
                        : filterStatus === "DRAFT"
                        ? "Нет аудиторий с черновиками"
                        : "Нет аудиторий с конфликтами"
                    }
                </div>
            )}

            {/* Легенда — кликабельная */}
            <div className="rooms-legend">
                <div 
                    className={`legend-item legend-item-clickable ${filterStatus === "FREE" ? "legend-item-active" : ""}`}
                    onClick={() => setFilterStatus(filterStatus === "FREE" ? "" : "FREE")}
                >
                    <div className="legend-box legend-free">✓</div>
                    <span>🆓 Свободно</span>
                </div>
                <div 
                    className={`legend-item legend-item-clickable ${filterStatus === "CONFIRMED" ? "legend-item-active" : ""}`}
                    onClick={() => setFilterStatus(filterStatus === "CONFIRMED" ? "" : "CONFIRMED")}
                >
                    <div className="legend-box legend-confirmed"></div>
                    <span>✅ Подтверждено</span>
                </div>
                <div 
                    className={`legend-item legend-item-clickable ${filterStatus === "DRAFT" ? "legend-item-active" : ""}`}
                    onClick={() => setFilterStatus(filterStatus === "DRAFT" ? "" : "DRAFT")}
                >
                    <div className="legend-box legend-draft"></div>
                    <span>📝 Черновик</span>
                </div>
                <div 
                    className={`legend-item legend-item-clickable ${filterStatus === "CONFLICT" ? "legend-item-active" : ""}`}
                    onClick={() => setFilterStatus(filterStatus === "CONFLICT" ? "" : "CONFLICT")}
                >
                    <div className="legend-box legend-conflict"></div>
                    <span>⚠️ Конфликт</span>
                </div>
            </div>

            {/* Модальное окно */}
            {selectedRoom && (
                <div className="modal-overlay" onClick={() => setSelectedRoom(null)}>
                    <div className="modal-content room-modal" onClick={e => e.stopPropagation()}>
                        <div className="room-modal-header">
                            <div>
                                <h3>🚪 {selectedRoom.code}</h3>
                                <div className="room-modal-subtitle">{selectedRoom.capacity} мест • {ROOM_TYPE_LABELS[selectedRoom.type] || selectedRoom.type}</div>
                            </div>
                            <button onClick={() => setSelectedRoom(null)} className="modal-close modal-close-light">✕</button>
                        </div>
                        <div className="modal-body">
                            <h4 className="room-schedule-title">Расписание на {selectedDate}</h4>
                            {roomDetails.length === 0 ? (
                                <div className="room-free-day">
                                    <div className="room-free-icon">✅</div>
                                    Аудитория свободна весь день
                                </div>
                            ) : (
                                <div className="room-schedule-list">
                                    {roomDetails.map(lesson => {
                                        const statusInfo = LESSON_STATUS_INFO[lesson.status] || {};
                                        return (
                                            <div key={lesson.id} className={`room-lesson room-lesson-${lesson.status?.toLowerCase() || "confirmed"}`}>
                                                <div className="room-lesson-header">
                                                    <div>
                                                        <div className="room-lesson-time">{formatTime(lesson.startsAtIso)} - {formatTime(lesson.endsAtIso)}</div>
                                                        <div className="room-lesson-subject">{lesson.subject}</div>
                                                        <div className="room-lesson-details">👤 {lesson.teacher || <em>Не указан</em>} • {lesson.target || <em>Не указано</em>}</div>
                                                    </div>
                                                    <span className={`status-badge ${statusInfo.className}`}>{statusInfo.icon} {statusInfo.label}</span>
                                                </div>
                                                {lesson.conflictInfo && <div className="conflict-info">{lesson.conflictInfo}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
