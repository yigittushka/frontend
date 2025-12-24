"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";

export default function TeacherRequestsPage() {
    return (
        <AuthGuard roles={["TEACHER"]}>
            <TeacherRequestsInner />
        </AuthGuard>
    );
}

function TeacherRequestsInner() {
    const { token } = useAuth();
    const [lessonId, setLessonId] = useState("");
    const [message, setMessage] = useState("");
    const [items, setItems] = useState([]);
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");

    async function load() {
        setErr(""); setOk("");
        try {
            const data = await apiFetch("/changes/my-open", { token });
            setItems(data);
        } catch (e) {
            setErr(e.message || "Ошибка загрузки");
        }
    }

    useEffect(() => { load(); }, []); // eslint-disable-line

    async function submit(e) {
        e.preventDefault();
        setErr(""); setOk("");

        try {
            await apiFetch("/changes", {
                method: "POST",
                token,
                body: { lessonId: Number(lessonId), message }
            });
            setOk("Запрос отправлен");
            setLessonId("");
            setMessage("");
            load();
        } catch (e2) {
            setErr(e2.message || "Ошибка отправки");
        }
    }

    return (
        <div className="card">
            <h3 style={{ marginTop: 0 }}>Запросы на изменение (TEACHER)</h3>

            <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
                <input className="input" placeholder="lessonId" value={lessonId} onChange={(e) => setLessonId(e.target.value)} />
                <textarea className="textarea" placeholder="Сообщение" value={message} onChange={(e) => setMessage(e.target.value)} />
                <button className="btn" type="submit">Отправить</button>
                {err && <div className="error">{err}</div>}
                {ok && <div className="ok">{ok}</div>}
            </form>

            <h4 style={{ marginTop: 16 }}>Открытые запросы</h4>
            <ul>
                {items.map(x => (
                    <li key={x.id}>
                        #{x.id} lesson={x.lessonId} status={x.status} — {x.message}
                    </li>
                ))}
            </ul>
        </div>
    );
}