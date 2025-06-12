// src/pages/Chef/Category/CategoryManagement.jsx
import React, { useState, useEffect, useMemo } from "react";
import "./CategoryManagement.css";
import { toast } from "react-toastify";
import EditModal from "./EditModal";
import ConfirmDelete from "./ConfirmDelete";
import axios from "../../../utils/axios.customize";

const CategoryManagement = () => {
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
                const res = await axios.get("/categories");
                setCategories(res.data?.data || []);
            } catch {
                toast.error("Không thể tải danh mục", { autoClose: 3000 });
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // Phân trang
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

    // Edit/Add modal
    const openEdit = (category = null) => setEditModal({ open: true, category });
    const closeEdit = () => setEditModal({ open: false, category: null });

    // Add or Update category
    const handleEditSave = async (data) => {
        setActionLoading(true);
        try {
            if (data._id) {
                // Chế độ chỉnh sửa
                const res = await axios.put(
                    `/categories/${data._id}`,
                    data
                );
                setCategories((prev) =>
                    prev.map((cat) => (cat._id === data._id ? res.data : cat))
                );
                toast.success("Cập nhật danh mục thành công!", { autoClose: 3000 });
            } else {
                // Chế độ thêm mới
                const res = await axios.post("/categories", data);
                setCategories((prev) => [...prev, res.data]);
                toast.success("Thêm danh mục thành công!", { autoClose: 3000 });
            }
            closeEdit();
        } catch (e) {
            toast.error(data._id ? "Lỗi khi lưu. Có thể tên bị trùng." : "Lỗi khi thêm danh mục.", { autoClose: 3000 });
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
            await axios.delete(`/categories/${deleteModal.id}`);
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
        // Không cần thêm 7 tiếng vì JavaScript tự động điều chỉnh theo múi giờ client (+07:00)
        return (
            d.toLocaleDateString("vi-VN") +
            " " +
            d.toLocaleTimeString("vi-VN", { hour12: false })
        );
    };

    return (
        <div className="category-product-management">
            <div className="header-actions">
                <h2>Quản lý danh mục sản phẩm</h2>
                <button
                    className="add-btn btn btn-primary"
                    onClick={() => openEdit()} // Mở modal để thêm mới
                    disabled={actionLoading}
                >
                    Thêm danh mục
                </button>
            </div>
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

export default CategoryManagement;