"use client";

import { useEffect, useState, useMemo } from "react";
import AuthGuard from "../../../src/components/AuthGuard";
import { useAuth } from "../../../src/components/AuthProvider";
import { apiFetch } from "../../../src/lib/api";
import { ROOM_TYPE_LABELS } from "../../../src/lib/constants";
import { Breadcrumbs } from "../../../src/components/ui";

// Конфигурация сущностей
const ENTITIES = {
    groups: {
        title: "Группы студентов",
        icon: "👥",
        endpoint: "/catalog/groups",
        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        columns: [
            { key: "code", label: "Код", required: true },
            { key: "title", label: "Название", required: true },
        ],
        getDisplayName: (item) => item.code,
    },
    teachers: {
        title: "Преподаватели",
        icon: "👨‍🏫",
        endpoint: "/catalog/teachers",
        gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
        columns: [
            { key: "fullName", label: "ФИО", required: true },
            { key: "email", label: "Email" },
        ],
        getDisplayName: (item) => item.fullName,
    },
    subjects: {
        title: "Дисциплины",
        icon: "📖",
        endpoint: "/catalog/subjects",
        gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        columns: [
            { key: "code", label: "Код", required: true },
            { key: "title", label: "Название", required: true },
        ],
        getDisplayName: (item) => item.code,
    },
    rooms: {
        title: "Аудитории",
        icon: "🏢",
        endpoint: "/catalog/rooms",
        gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        columns: [
            { key: "code", label: "Номер", required: true },
            { key: "type", label: "Тип", type: "select", options: ["CLASS", "LECTURE", "LAB"], required: true },
            { key: "capacity", label: "Вместимость", type: "number", required: true },
        ],
        getDisplayName: (item) => item.code,
        formatCell: (key, value) => {
            if (key === "type") return ROOM_TYPE_LABELS[value] || value;
            if (key === "capacity") return `${value} мест`;
            return value;
        },
    },
    streams: {
        title: "Потоки",
        icon: "🎓",
        endpoint: "/catalog/streams",
        gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
        columns: [
            { key: "title", label: "Название", required: true },
        ],
        getDisplayName: (item) => item.title,
    },
};

export default function MethodistCatalogPage() {
    return (
        <AuthGuard roles={["METHODIST"]}>
            <CatalogPageInner />
        </AuthGuard>
    );
}

function CatalogPageInner() {
    const { token } = useAuth();
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");
    const [search, setSearch] = useState("");
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    const entityConfig = selectedEntity ? ENTITIES[selectedEntity] : null;

    // Load items when entity is selected
    useEffect(() => {
        if (!selectedEntity || !token) return;
        loadItems();
    }, [selectedEntity, token]);

    async function loadItems() {
        setLoading(true);
        setErr("");
        try {
            const data = await apiFetch(entityConfig.endpoint, { token });
            setItems(data || []);
        } catch (e) {
            setErr(e.message || "Ошибка загрузки");
        } finally {
            setLoading(false);
        }
    }

    // Filtered items
    const filteredItems = useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(item => 
            entityConfig.columns.some(col => {
                const val = item[col.key];
                return val && String(val).toLowerCase().includes(q);
            })
        );
    }, [items, search, entityConfig]);

    // Open create modal
    function handleCreate() {
        const initial = {};
        entityConfig.columns.forEach(col => {
            initial[col.key] = col.type === "number" ? "" : "";
        });
        setFormData(initial);
        setEditingItem(null);
        setShowModal(true);
    }

    // Open edit modal
    function handleEdit(item) {
        const data = {};
        entityConfig.columns.forEach(col => {
            data[col.key] = item[col.key] ?? "";
        });
        setFormData(data);
        setEditingItem(item);
        setShowModal(true);
    }

    // Save (create or update)
    async function handleSave() {
        setErr("");
        setSaving(true);
        try {
            const body = { ...formData };
            // Convert number fields
            entityConfig.columns.forEach(col => {
                if (col.type === "number" && body[col.key]) {
                    body[col.key] = Number(body[col.key]);
                }
            });

            if (editingItem) {
                await apiFetch(`${entityConfig.endpoint}/${editingItem.id}`, {
                    method: "PUT",
                    token,
                    body,
                });
                setOk("Сохранено!");
            } else {
                await apiFetch(entityConfig.endpoint, {
                    method: "POST",
                    token,
                    body,
                });
                setOk("Создано!");
            }
            setShowModal(false);
            loadItems();
        } catch (e) {
            setErr(e.message || "Ошибка сохранения");
        } finally {
            setSaving(false);
        }
    }

    // Delete
    async function handleDelete(item) {
        const name = entityConfig.getDisplayName(item);
        if (!confirm(`Удалить "${name}"?`)) return;
        
        setErr("");
        try {
            await apiFetch(`${entityConfig.endpoint}/${item.id}`, {
                method: "DELETE",
                token,
            });
            setOk("Удалено!");
            loadItems();
        } catch (e) {
            setErr(e.message || "Ошибка удаления");
        }
    }

    // Back to category selection
    function handleBack() {
        setSelectedEntity(null);
        setItems([]);
        setSearch("");
        setErr("");
        setOk("");
    }

    // Clear messages after timeout
    useEffect(() => {
        if (ok) {
            const t = setTimeout(() => setOk(""), 3000);
            return () => clearTimeout(t);
        }
    }, [ok]);

    return (
        <div className="page-container">
            <Breadcrumbs items={[
                { label: "Главная", href: "/" },
                { label: "Методист" },
                { label: "Справочники", href: selectedEntity ? "/admin/catalog" : undefined },
                ...(selectedEntity ? [{ label: entityConfig.title }] : [])
            ]} />

            {/* Category Selection */}
            {!selectedEntity && (
                <>
                    <h2 className="page-title">📚 Справочники</h2>
                    <p className="page-subtitle">Выберите раздел для управления</p>
                    
                    <div className="catalog-categories">
                        {Object.entries(ENTITIES).map(([key, config]) => (
                            <button
                                key={key}
                                className="catalog-category-card"
                                onClick={() => setSelectedEntity(key)}
                            >
                                <div className="catalog-category-icon" style={{ background: config.gradient }}>
                                    {config.icon}
                                </div>
                                <div className="catalog-category-title">{config.title}</div>
                                <div className="catalog-category-arrow">→</div>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Entity List with CRUD */}
            {selectedEntity && (
                <>
                    <div className="catalog-header">
                        <button className="btn btn-secondary btn-back" onClick={handleBack}>
                            ← Назад
                        </button>
                        <h2 className="page-title">
                            {entityConfig.icon} {entityConfig.title}
                        </h2>
                        <button className="btn btn-primary" onClick={handleCreate}>
                            ➕ Добавить
                        </button>
                    </div>

                    {err && <div className="error">{err}</div>}
                    {ok && <div className="ok">{ok}</div>}

                    {/* Search */}
                    <div className="catalog-toolbar">
                        <input
                            type="text"
                            className="input catalog-search-input"
                            placeholder="🔍 Поиск..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="catalog-count">
                            {filteredItems.length} из {items.length}
                        </span>
                    </div>

                    {loading && <div className="loading-state">Загрузка...</div>}

                    {!loading && filteredItems.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-icon">📭</div>
                            {search ? `Ничего не найдено по "${search}"` : "Нет данных"}
                        </div>
                    )}

                    {!loading && filteredItems.length > 0 && (
                        <div className="catalog-list-card">
                            <table className="catalog-table">
                                <thead>
                                    <tr>
                                        <th className="catalog-th catalog-th-id">#</th>
                                        {entityConfig.columns.map(col => (
                                            <th key={col.key} className="catalog-th">{col.label}</th>
                                        ))}
                                        <th className="catalog-th catalog-th-actions">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item, idx) => (
                                        <tr key={item.id} className="catalog-row">
                                            <td className="catalog-cell catalog-cell-id">{idx + 1}</td>
                                            {entityConfig.columns.map(col => (
                                                <td key={col.key} className="catalog-cell">
                                                    {entityConfig.formatCell 
                                                        ? entityConfig.formatCell(col.key, item[col.key])
                                                        : (item[col.key] || "—")}
                                                </td>
                                            ))}
                                            <td className="catalog-cell catalog-cell-actions">
                                                <button 
                                                    className="btn-icon btn-icon-primary" 
                                                    onClick={() => handleEdit(item)}
                                                    title="Редактировать"
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    className="btn-icon btn-icon-danger" 
                                                    onClick={() => handleDelete(item)}
                                                    title="Удалить"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingItem ? "✏️ Редактирование" : "➕ Создание"}</h3>
                            <button onClick={() => setShowModal(false)} className="modal-close">✕</button>
                        </div>
                        <div className="modal-body">
                            {entityConfig.columns.map(col => (
                                <div key={col.key} className="form-group">
                                    <label className="form-label">
                                        {col.label}
                                        {col.required && <span className="form-required">*</span>}
                                    </label>
                                    {col.type === "select" ? (
                                        <select
                                            className="input"
                                            value={formData[col.key] || ""}
                                            onChange={e => setFormData({...formData, [col.key]: e.target.value})}
                                            required={col.required}
                                        >
                                            <option value="">Выберите...</option>
                                            {col.options.map(opt => (
                                                <option key={opt} value={opt}>
                                                    {ROOM_TYPE_LABELS[opt] || opt}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={col.type || "text"}
                                            className="input"
                                            value={formData[col.key] || ""}
                                            onChange={e => setFormData({...formData, [col.key]: e.target.value})}
                                            required={col.required}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                Отмена
                            </button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? "..." : (editingItem ? "Сохранить" : "Создать")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
