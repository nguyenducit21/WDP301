// src/pages/Chef/Category/EditModal.jsx
import React, { useState, useEffect } from "react";

const EditModal = ({ open, onClose, category, onSave }) => {
    const [form, setForm] = useState({ name: "", description: "", is_active: true });
    const [error, setError] = useState("");

    useEffect(() => {
        if (category) {
            // Chế độ chỉnh sửa
            setForm({
                name: category.name,
                description: category.description || "",
                is_active: category.is_active !== false,
            });
        } else {
            // Chế độ thêm mới
            setForm({ name: "", description: "", is_active: true });
        }
    }, [category, open]); // Thêm `open` để reset form khi modal mở

    if (!open) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({
            ...f,
            [name]: type === "checkbox" ? checked : value,
        }));
        setError("");
    };

    const handleToggleActive = () => {
        setForm((f) => ({ ...f, is_active: !f.is_active }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError("Tên danh mục không được để trống");
            return;
        }
        onSave({ ...category, ...form }); // Gửi dữ liệu lên CategoryManagement
    };

    return (
        <div className="modal-overlay">
            <div className="modal modal-large">
                <h3>{category ? "Sửa danh mục" : "Thêm danh mục"}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Tên danh mục</label>
                        <input name="name" value={form.name} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Mô tả</label>
                        <textarea name="description" value={form.description} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Trạng thái</label>
                        <div className="toggle-switch" onClick={handleToggleActive}>
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={form.is_active}
                                onChange={handleChange}
                                style={{ display: "none" }}
                            />
                            <span className={`slider ${form.is_active ? "active" : ""}`}></span>
                            <span className="toggle-label">
                                {form.is_active ? "Hoạt động" : "Ngừng hoạt động"}
                            </span>
                        </div>
                    </div>
                    {error && <div className="form-error">{error}</div>}
                    <div className="modal-actions">
                        <button type="button" className="btn" onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {category ? "Lưu" : "Thêm"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditModal;