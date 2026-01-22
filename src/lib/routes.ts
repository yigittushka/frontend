export function homeForRole(role?: string) {
    if (role === "ADMIN" || role === "METHODIST") return "/methodist/schedules";
    if (role === "TEACHER" || role === "STUDENT") return "/my";
    return "/login";
}