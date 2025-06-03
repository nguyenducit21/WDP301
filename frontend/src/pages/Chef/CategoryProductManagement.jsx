import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./CategoryProductManagement.css";
import { toast } from "react-toastify";

// Modal Edit
const EditModal = ({ open, onClose, category, onSave }) => {
    const [form, setForm] = useState({ name: "", description: "", is_active: true });
    const [error, setError] = useState("");

    useEffect(() => {
        if (category) {
            setForm({
                name: category.name,
                description: category.description || "",
                is_active: category.is_active !== false,
            });
        }
    }, [category]);

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
        onSave({ ...category, ...form });
    };

    return (
        <div className="modal-overlay">
            <div className="modal modal-large">
                <h3>Sửa danh mục</h3>
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
                                style={{ display: "none" }} // Ẩn checkbox gốc
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
                            Lưu
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Confirm delete modal
const ConfirmDelete = ({ open, onClose, onConfirm }) =>
    open ? (
        <div className="modal-overlay">
            <div className="modal">
                <p>Bạn có chắc muốn xóa danh mục này?</p>
                <div className="modal-actions">
                    <button className="btn" onClick={onClose}>
                        Hủy
                    </button>
                    <button className="btn btn-danger" onClick={onConfirm}>
                        Xóa
                    </button>
                </div>
            </div>
        </div>
    ) : null;

const CategoryProductManagement = () => {
    const [categories, setCategories] = useState([]);
    const [selected, setSelected] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [editModal, setEditModal] = useState({ open: false, category: null });
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch categories
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await axios.get("http://localhost:9999/api/categories");
                setCategories(res.data);
            } catch {
                toast.error("Không thể tải danh mục", { autoClose: 3000 });
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // Phân trang (useMemo cho hiệu quả)
    const totalPages = Math.ceil(categories.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = useMemo(
        () => categories.slice(startIndex, startIndex + itemsPerPage),
        [categories, startIndex, itemsPerPage]
    );

    // Select row/all
    const handleSelect = (id) =>
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    const handleSelectAll = (e) =>
        setSelected(e.target.checked ? currentItems.map((c) => c._id) : []);

    // Edit modal
    const openEdit = (category) => setEditModal({ open: true, category });
    const closeEdit = () => setEditModal({ open: false, category: null });

    // Update category
    const handleEditSave = async (edited) => {
        setActionLoading(true);
        try {
            const res = await axios.put(
                `http://localhost:9999/api/categories/${edited._id}`,
                edited
            );
            setCategories((prev) =>
                prev.map((cat) => (cat._id === edited._id ? res.data : cat))
            );
            closeEdit();
            toast.success("Cập nhật danh mục thành công!", { autoClose: 3000 });
        } catch (e) {
            toast.error("Lỗi khi lưu. Có thể tên bị trùng.", { autoClose: 3000 });
        }
        setActionLoading(false);
    };

    // Delete modal
    const openDelete = (id) => setDeleteModal({ open: true, id });
    const closeDelete = () => setDeleteModal({ open: false, id: null });

    // Delete
    const handleDelete = async () => {
        setActionLoading(true);
        try {
            await axios.delete(`http://localhost:9999/api/categories/${deleteModal.id}`);
            setCategories((prev) => prev.filter((cat) => cat._id !== deleteModal.id));
            setSelected((prev) => prev.filter((id) => id !== deleteModal.id));
            closeDelete();
            toast.success("Xóa danh mục thành công!", { autoClose: 3000 });
        } catch {
            toast.error("Lỗi khi xóa.", { autoClose: 3000 });
        }
        setActionLoading(false);
    };

    // Định dạng ngày
    const formatDate = (date) => {
        if (!date) return "-";
        const d = new Date(date);
        if (isNaN(d)) return "-";
        // Điều chỉnh múi giờ về UTC+07:00 (Việt Nam)
        const vietnamTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
        return (
            vietnamTime.toLocaleDateString("vi-VN") +
            " " +
            vietnamTime.toLocaleTimeString("vi-VN", { hour12: false })
        );
    };

    return (
        <div className="category-product-management">
            <h2>Quản lý danh mục sản phẩm</h2>
            {loading ? (
                <div className="loading">Đang tải...</div>
            ) : (
                <>
                    <table className="category-table">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        checked={
                                            selected.length === currentItems.length &&
                                            currentItems.length > 0
                                        }
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th>STT</th>
                                <th>Tên danh mục</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo</th>
                                <th>Ngày cập nhật</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((category, idx) => (
                                <tr key={category._id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(category._id)}
                                            onChange={() => handleSelect(category._id)}
                                        />
                                    </td>
                                    <td>{startIndex + idx + 1}</td>
                                    <td>{category.name}</td>
                                    <td>
                                        {category.is_active !== false ? (
                                            <span className="status-active">Hoạt động</span>
                                        ) : (
                                            <span className="status-inactive">Ngừng</span>
                                        )}
                                    </td>
                                    <td>{formatDate(category.created_at)}</td>
                                    <td>{formatDate(category.updated_at)}</td>
                                    <td>
                                        <button
                                            className="edit-btn"
                                            onClick={() => openEdit(category)}
                                            disabled={actionLoading}
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => openDelete(category._id)}
                                            disabled={actionLoading}
                                        >
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* Phân trang */}
                    <div className="pagination">
                        <label>Số lượng mục</label>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                        </select>
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            {"<"}
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                            (page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={currentPage === page ? "active" : ""}
                                >
                                    {page}
                                </button>
                            )
                        )}
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            {">"}
                        </button>

                    </div>
                </>
            )}
            {/* Modal */}
            <EditModal
                open={editModal.open}
                onClose={closeEdit}
                category={editModal.category}
                onSave={handleEditSave}
            />
            <ConfirmDelete
                open={deleteModal.open}
                onClose={closeDelete}
                onConfirm={handleDelete}
            />
            {actionLoading && <div className="loading-overlay">Đang xử lý...</div>}
        </div>
    );
};

export default CategoryProductManagement;