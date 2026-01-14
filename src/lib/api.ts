export type ApiFetchOptions = {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    token?: string;
    body?: unknown;
    headers?: Record<string, string>;
};


function getApiBaseUrl(): string {
    if (typeof window !== "undefined") {
        
        return "/api";
    }
    
    return process.env.BACKEND_URL || "http://localhost:8080";
}

export async function apiFetch<T = any>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
    const { method = "GET", token, body, headers } = opts;
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${path}`;

    const res = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(headers || {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data: any = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        if (data && typeof data === "object") {
            msg = data.error || data.details || data.message || msg;
            
            if (data.details && data.error && data.details !== data.error) {
                msg = `${data.error}: ${data.details}`;
            }
        } else if (typeof data === "string") {
            msg = data;
        }
        const error = new Error(msg);
        (error as any).status = res.status;
        (error as any).data = data;
        throw error;
    }

    return data as T;
}