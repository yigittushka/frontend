export function homeForRole(role?: string) {
    if (role === "ADMIN") return "/admin/catalog";
    if (role === "TEACHER" || role === "STUDENT") return "/my";
    return "/login";
}