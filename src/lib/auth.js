export const TOKEN_KEY = "token";

export function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
    if (typeof window === "undefined") return;
    if (!token) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
}