/**
 * Утилиты для работы с датами и временем.
 * Централизованный модуль для избежания дублирования.
 */

// ===== Форматирование для input[type="date"] =====

export function toLocalDateInputValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ===== Конвертация в ISO для API =====

export function toIsoDateTime(dateStr: string, timeStr: string): string {
    if (!dateStr || !timeStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(year, month - 1, day, hours, minutes, 0);
    return date.toISOString();
}

export function fromDateStartIso(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    return dt.toISOString();
}

export function toDateEndIso(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
    return dt.toISOString();
}

// ===== Манипуляции с датами =====

export function addDaysLocal(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export function getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// ===== Форматирование для отображения =====

export function formatTime(isoString: string): string {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(isoString: string): string {
    if (!isoString) return "";
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}.${month} ${hours}:${minutes}`;
}

export function formatDayHeader(isoString: string): string {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

export function formatDayShort(isoString: string): string {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("ru-RU", {
        weekday: "short",
        day: "numeric"
    });
}

export function formatDateTimeShort(isoString: string): string {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// ===== Группировка и сравнение =====

export function getDayKey(isoString: string): string {
    if (!isoString) return "";
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isPastDay(isoString: string): boolean {
    if (!isoString) return false;
    const lessonDate = new Date(isoString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lessonDate.setHours(0, 0, 0, 0);
    return lessonDate < today;
}

// ===== Временные слоты =====

export function parseTimeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

export function getMinutesFromIso(iso: string): number {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
}

// ===== Предустановленные временные слоты (пары) =====

export const TIME_SLOTS = [
    { start: "08:00", end: "09:30", label: "1 пара", number: 1 },
    { start: "09:40", end: "11:10", label: "2 пара", number: 2 },
    { start: "11:20", end: "12:50", label: "3 пара", number: 3 },
    { start: "13:30", end: "15:00", label: "4 пара", number: 4 },
    { start: "15:10", end: "16:40", label: "5 пара", number: 5 },
    { start: "16:50", end: "18:20", label: "6 пара", number: 6 },
    { start: "18:30", end: "20:00", label: "7 пара", number: 7 },
] as const;

export type TimeSlot = typeof TIME_SLOTS[number];
