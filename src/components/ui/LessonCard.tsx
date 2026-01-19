"use client";

import { LESSON_TYPE_COLORS, LESSON_TYPE_LABELS, type LessonType, type LessonStatus } from "../../lib/constants";
import { formatTime } from "../../lib/dateUtils";
import StatusBadge from "./StatusBadge";

export interface LessonData {
    id: number;
    startsAtIso: string;
    endsAtIso: string;
    lessonType: LessonType;
    subject: string;
    teacher?: string | null;
    teacherId?: number | null;
    room?: string | null;
    roomId?: number | null;
    target?: string | null;
    groupId?: number | null;
    streamId?: number | null;
    note?: string | null;
    status: LessonStatus;
    conflictInfo?: string | null;
}

interface LessonCardProps {
    lesson: LessonData;
    showActions?: boolean;
    onEdit?: (lesson: LessonData) => void;
    onDelete?: (lesson: LessonData) => void;
    onConfirm?: (lesson: LessonData) => void;
}

export default function LessonCard({ 
    lesson, 
    showActions = false,
    onEdit,
    onDelete,
    onConfirm
}: LessonCardProps) {
    const typeColor = LESSON_TYPE_COLORS[lesson.lessonType] || "#6C757D";
    const typeLabel = LESSON_TYPE_LABELS[lesson.lessonType] || lesson.lessonType;
    
    const targetDisplay = lesson.target?.startsWith("GROUP:") 
        ? `👥 ${lesson.target.replace("GROUP:", "")}`
        : lesson.target?.startsWith("STREAM:")
        ? `📚 ${lesson.target.replace("STREAM:", "")}`
        : lesson.target || null;

    return (
        <div className={`lesson-card lesson-card-${lesson.status?.toLowerCase() || "confirmed"}`}>
            <div 
                className="lesson-card-type"
                style={{ background: typeColor }}
            >
                {typeLabel}
            </div>
            
            <div className="lesson-card-content">
                <div className="lesson-card-header">
                    <span className="lesson-card-time">
                        {formatTime(lesson.startsAtIso)} - {formatTime(lesson.endsAtIso)}
                    </span>
                    <StatusBadge status={lesson.status} size="sm" />
                </div>
                
                <div className="lesson-card-subject">{lesson.subject}</div>
                
                <div className="lesson-card-details">
                    <span>👤 {lesson.teacher || <em className="text-muted">Не указан</em>}</span>
                    <span>🚪 {lesson.room || <em className="text-muted">Не указана</em>}</span>
                    {targetDisplay && <span>{targetDisplay}</span>}
                </div>
                
                {lesson.note && (
                    <div className="lesson-card-note">📝 {lesson.note}</div>
                )}
                
                {lesson.conflictInfo && (
                    <div className="conflict-info">{lesson.conflictInfo}</div>
                )}
            </div>
            
            {showActions && (
                <div className="lesson-card-actions">
                    {lesson.status !== "CONFIRMED" && onConfirm && (
                        <button 
                            onClick={() => onConfirm(lesson)} 
                            className="btn-icon btn-icon-success"
                            title="Подтвердить"
                        >
                            ✅
                        </button>
                    )}
                    {onEdit && (
                        <button 
                            onClick={() => onEdit(lesson)} 
                            className="btn-icon btn-icon-primary"
                            title="Редактировать"
                        >
                            ✏️
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            onClick={() => onDelete(lesson)} 
                            className="btn-icon btn-icon-danger"
                            title="Удалить"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
