/**
 * Константы приложения.
 * Централизованное место для всех magic strings.
 */

// ===== Типы занятий =====

export const LESSON_TYPES = {
    LECTURE: "LECTURE",
    PRACTICE: "PRACTICE",
    LAB: "LAB",
} as const;

export type LessonType = typeof LESSON_TYPES[keyof typeof LESSON_TYPES];

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
    LECTURE: "Лекция",
    PRACTICE: "Практика",
    LAB: "Лабораторная",
};

export const LESSON_TYPE_COLORS: Record<LessonType, string> = {
    LECTURE: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    PRACTICE: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    LAB: "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)",
};

export const LESSON_TYPE_OPTIONS = [
    { value: LESSON_TYPES.LECTURE, label: LESSON_TYPE_LABELS.LECTURE },
    { value: LESSON_TYPES.PRACTICE, label: LESSON_TYPE_LABELS.PRACTICE },
    { value: LESSON_TYPES.LAB, label: LESSON_TYPE_LABELS.LAB },
];

// ===== Статусы занятий =====

export const LESSON_STATUSES = {
    DRAFT: "DRAFT",
    CONFLICT: "CONFLICT",
    CONFIRMED: "CONFIRMED",
} as const;

export type LessonStatus = typeof LESSON_STATUSES[keyof typeof LESSON_STATUSES];

export const LESSON_STATUS_INFO: Record<LessonStatus, { label: string; icon: string; className: string }> = {
    DRAFT: { label: "Черновик", icon: "📝", className: "status-draft" },
    CONFLICT: { label: "Конфликт", icon: "⚠️", className: "status-conflict" },
    CONFIRMED: { label: "Подтверждено", icon: "✅", className: "status-confirmed" },
};

// ===== Роли пользователей =====

export const USER_ROLES = {
    ADMIN: "ADMIN",           // Технический администратор (пользователи)
    METHODIST: "METHODIST",   // Методист (расписание, справочники, заявки)
    TEACHER: "TEACHER",       // Преподаватель
    STUDENT: "STUDENT",       // Студент
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
    ADMIN: "Администратор",
    METHODIST: "Методист",
    TEACHER: "Преподаватель",
    STUDENT: "Студент",
};

// ===== Типы аудиторий =====

export const ROOM_TYPES = {
    CLASS: "CLASS",
    LAB: "LAB",
    LECTURE: "LECTURE",
} as const;

export type RoomType = typeof ROOM_TYPES[keyof typeof ROOM_TYPES];

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
    CLASS: "Класс",
    LAB: "Лаборатория",
    LECTURE: "Лекционная",
};

// ===== Навигация =====

export const ROUTES = {
    LOGIN: "/login",
    MY_SCHEDULE: "/my",
    ADMIN: {
        CATALOG: "/admin/catalog",
        SCHEDULE: "/admin/schedule",
        SCHEDULES: "/admin/schedules",
        ROOMS: "/admin/rooms",
        USERS: "/admin/users",
        REQUESTS: "/admin/requests",
    },
    TEACHER: {
        REQUESTS: "/teacher/requests",
    },
} as const;

// ===== API пути =====

export const API_PATHS = {
    AUTH: {
        LOGIN: "/auth/login",
    },
    SCHEDULE: {
        LESSONS: "/schedule/lessons",
        MY: "/schedule/my",
        ALL: "/schedule/all",
        CHECK_CONFLICTS: "/schedule/check-conflicts",
        ROOMS_AVAILABILITY: "/schedule/rooms/availability",
    },
    CATALOG: {
        GROUPS: "/catalog/groups",
        STREAMS: "/catalog/streams",
        SUBJECTS: "/catalog/subjects",
        TEACHERS: "/catalog/teachers",
        ROOMS: "/catalog/rooms",
        STUDENTS: "/catalog/students",
    },
} as const;

// ===== Временные слоты (пары) =====

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
