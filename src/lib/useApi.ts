"use client";

import { useCallback } from "react";
import { useAuth } from "../components/AuthProvider";
import { apiFetch, ApiFetchOptions } from "./api";

/**
 * Хук для упрощения API-запросов с автоматическим токеном.
 * Использует токен из AuthProvider автоматически.
 * 
 * @example
 * const api = useApi();
 * const data = await api.get("/catalog/groups");
 * await api.post("/schedule/lessons", { body: lessonData });
 */
export function useApi() {
    const { token } = useAuth();

    const request = useCallback(
        async <T = unknown>(path: string, opts: Omit<ApiFetchOptions, "token"> = {}): Promise<T> => {
            return apiFetch<T>(path, { ...opts, token });
        },
        [token]
    );

    const get = useCallback(
        <T = unknown>(path: string, opts: Omit<ApiFetchOptions, "token" | "method"> = {}) => {
            return request<T>(path, { ...opts, method: "GET" });
        },
        [request]
    );

    const post = useCallback(
        <T = unknown>(path: string, opts: Omit<ApiFetchOptions, "token" | "method"> = {}) => {
            return request<T>(path, { ...opts, method: "POST" });
        },
        [request]
    );

    const put = useCallback(
        <T = unknown>(path: string, opts: Omit<ApiFetchOptions, "token" | "method"> = {}) => {
            return request<T>(path, { ...opts, method: "PUT" });
        },
        [request]
    );

    const del = useCallback(
        <T = unknown>(path: string, opts: Omit<ApiFetchOptions, "token" | "method"> = {}) => {
            return request<T>(path, { ...opts, method: "DELETE" });
        },
        [request]
    );

    return { request, get, post, put, del, token };
}

export default useApi;
