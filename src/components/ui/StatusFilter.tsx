"use client";

import { LESSON_STATUSES, LESSON_STATUS_INFO, type LessonStatus } from "../../lib/constants";

interface StatusFilterProps {
    value: string;
    onChange: (status: string) => void;
}

export default function StatusFilter({ value, onChange }: StatusFilterProps) {
    const toggle = (status: string) => {
        onChange(value === status ? "" : status);
    };

    return (
        <div className="status-filter">
            <button
                className={`status-filter-btn ${value === "" ? "active" : ""}`}
                onClick={() => onChange("")}
            >
                Все
            </button>
            {Object.values(LESSON_STATUSES).map((status) => {
                const info = LESSON_STATUS_INFO[status as LessonStatus];
                const activeClass = value === status ? `active-${status.toLowerCase()}` : "";
                
                return (
                    <button
                        key={status}
                        className={`status-filter-btn ${activeClass}`}
                        onClick={() => toggle(status)}
                    >
                        {info.icon} {info.label}
                    </button>
                );
            })}
        </div>
    );
}
