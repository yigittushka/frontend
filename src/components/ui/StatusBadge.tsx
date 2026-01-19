"use client";

import { LESSON_STATUS_INFO, type LessonStatus } from "../../lib/constants";

interface StatusBadgeProps {
    status: LessonStatus;
    size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
    const info = LESSON_STATUS_INFO[status] || { label: status, icon: "", className: "" };
    
    return (
        <span className={`status-badge ${info.className} ${size === "sm" ? "status-badge-sm" : ""}`}>
            {info.icon} {info.label}
        </span>
    );
}
