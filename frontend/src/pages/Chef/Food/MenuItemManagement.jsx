import React, { useState, useEffect, useMemo, useContext } from "react";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import "./MenuItemManagement.css";
import EditMenuItemModal from "./EditMenuItemModal";
import ConfirmDelete from "./ConfirmDelete";
import { AuthContext } from "../../../context/AuthContext";
import axios from '../../../utils/axios.customize';

function removeVietnameseTones(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d").replace(/Đ/g, "D");
}

// ===== HÀM TÌM KIẾM FUZZY RỜI RẠC =====
function fuzzyMatch(text, pattern) {
    text = removeVietnameseTones(text).toLowerCase();
    pattern = removeVietnameseTones(pattern).toLowerCase();

    let i = 0, j = 0;
    while (i < text.length && j < pattern.length) {
        if (text[i] === pattern[j]) j++;
        i++;
    }
    return j === pattern.length;
}

const MenuItemManagement = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selected, setSelected] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [editModal, setEditModal] = useState({ open: false, menuItem: null });
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
    const [deleteSelectedModal, setDeleteSelectedModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    // Utility function for safe object access
    const safeGet = (obj, path, defaultValue = null) => {
        try {
            return path.split('.').reduce((o, p) => o && o[p], obj) || defaultValue;
        } catch {
            return defaultValue;
        }
    };

    // Check authorization
    useEffect(() => {
        if (user !== null && user !== undefined) {
            const userRole = safeGet(user, 'user.role') || safeGet(user, 'role');
            const allowedRoles = ['kitchen_staff', 'manager'];
            if (!userRole || !allowedRoles.includes(userRole)) {
                console.log('Unauthorized access, redirecting to login');
                navigate('/login');
            }
        }
    }, [user, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [menuItemsRes, categoriesRes] = await Promise.all([
                    axios.get("/menu-items", { withCredentials: true }),
                    axios.get("/categories", { withCredentials: true }),
                ]);
                console.log('Menu Items Response:', menuItemsRes.data);
                console.log('Categories Response:', categoriesRes.data);

                // Set menu items
                setMenuItems(Array.isArray(menuItemsRes.data?.data) ? menuItemsRes.data.data : []);

                // Set categories - check if data is directly in response or nested
                const categoriesData = categoriesRes.data?.data || categoriesRes.data;
                setCategories(Array.isArray(categoriesData) ? categoriesData : []);

                console.log('Processed Categories:', categoriesData); // Debug log
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error("Không thể tải dữ liệu", { autoClose: 3000 });
                setMenuItems([]);
                setCategories([]);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // ==== LỌC TÌM KIẾM KHÔNG DẤU VÀ FUZZY ====
    const filteredItems = useMemo(() => {
        // Ensure menuItems is an array; use empty array as fallback
        let filtered = Array.isArray(menuItems) ? menuItems : [];

        if (searchText) {
            filtered = filtered.filter(item =>
                fuzzyMatch(item.name, searchText)
            );
        }
        if (selectedCategory) {
            filtered = filtered.filter(item =>
                item.category_id?._id === selectedCategory
            );
        }
        // Sort by creation date (newest first)
        return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [menuItems, searchText, selectedCategory]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = useMemo(
        () => filteredItems.slice(startIndex, startIndex + itemsPerPage),
        [filteredItems, startIndex, itemsPerPage]
    );

    const handleSelect = (id) =>
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    const handleSelectAll = (e) =>
        setSelected(e.target.checked ? currentItems.map((m) => m._id) : []);

    const openEdit = (menuItem = null) => setEditModal({ open: true, menuItem });
    const closeEdit = () => setEditModal({ open: false, menuItem: null });

    const handleEditSave = async (data) => {
        setActionLoading(true);
        try {
            if (editModal.menuItem?._id) {
                const res = await axios.put(
                    `/menu-items/${editModal.menuItem._id}`,
                    data,
                    { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
                );
                setMenuItems((prev) =>
                    prev.map((m) => (m._id === res.data._id ? res.data : m))
                );
                toast.success("Cập nhật món ăn thành công!", { autoClose: 3000 });
            } else {
                const res = await axios.post(
                    "/menu-items",
                    data,
                    { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true },
                );
                setMenuItems((prev) => [res.data, ...prev]); // Đẩy món mới lên đầu
                toast.success("Thêm món ăn thành công!", { autoClose: 3000 });
            }
            closeEdit();
        } catch (error) {
            toast.error(`Lỗi: ${error.response?.data?.message || error.message}`, { autoClose: 3000 });
        }
        setActionLoading(false);
    };

    const openDelete = (id) => setDeleteModal({ open: true, id });
    const closeDelete = () => setDeleteModal({ open: false, id: null });

    const handleDelete = async () => {
        setActionLoading(true);
        try {
            await axios.delete(`/menu-items/${deleteModal.id}`, { withCredentials: true });
            setMenuItems((prev) => prev.filter((m) => m._id !== deleteModal.id));
            setSelected((prev) => prev.filter((id) => id !== deleteModal.id));
            closeDelete();
            toast.success("Xóa món ăn thành công!", { autoClose: 3000 });
        } catch (error) {
            toast.error("Lỗi khi xóa.", { autoClose: 3000 });
        }
        setActionLoading(false);
    };

    const openDeleteSelected = () => {
        if (selected.length === 0) {
            toast.warn("Vui lòng chọn ít nhất một món ăn để xóa!", { autoClose: 3000 });
            return;
        }
        setDeleteSelectedModal(true);
    };

    const closeDeleteSelected = () => setDeleteSelectedModal(false);

    const handleDeleteSelected = async () => {
        setActionLoading(true);
        try {
            await axios.post("/menu-items/delete-many", { ids: selected }, { withCredentials: true });
            setMenuItems((prev) => prev.filter((m) => !selected.includes(m._id)));
            setSelected([]);
            closeDeleteSelected();
            toast.success("Xóa các món ăn đã chọn thành công!", { autoClose: 3000 });
        } catch (error) {
            toast.error("Lỗi khi xóa các món ăn đã chọn.", { autoClose: 3000 });
        }
        setActionLoading(false);
    };

    const formatDate = (date) => {
        if (!date) return "-";
        const d = new Date(date);
        if (isNaN(d)) return "-";
        return (
            d.toLocaleDateString("vi-VN") +
            " " +
            d.toLocaleTimeString("vi-VN", { hour12: false })
        );
    };

    return (
        <div className="menu-item-management">
            <div className="header-section">
                <h2>Danh sách món ăn</h2>
                <div className="toolbar-row">
                    <div className="filter-section">
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên món..."
                            value={searchText}
                            onChange={(e) => {
                                setSearchText(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                        <select
                            value={selectedCategory}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="">Tất cả danh mục</option>
                            {categories.map((cat) => (
                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="action-buttons">
                        <button
                            className="delete-selected-btn"
                            onClick={openDeleteSelected}
                            disabled={actionLoading || selected.length === 0}
                        >
                            Xóa mục đã chọn
                        </button>
                        <Link to="/chef/deleted-menu-items">
                            <button className="deleted-items-btn">
                                Sản phẩm tạm xóa
                            </button>
                        </Link>
                        <button
                            className="add-btn"
                            onClick={() => openEdit()}
                            disabled={actionLoading}
                        >
                            Thêm món ăn
                        </button>
                    </div>
                </div>
            </div>
            {loading ? (
                <div className="loading">Đang tải...</div>
            ) : (
                <>
                    <table className="menu-item-table">
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
                                <th>Ảnh</th>
                                <th>Tên món ăn</th>
                                <th>Danh mục</th>
                                <th>Trạng thái</th>
                                <th>Giá</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((menuItem, idx) => (
                                <tr key={menuItem._id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(menuItem._id)}
                                            onChange={() => handleSelect(menuItem._id)}
                                        />
                                    </td>
                                    <td>{startIndex + idx + 1}</td>
                                    <td>
                                        {menuItem.image && (
                                            <img
                                                src={menuItem.image.startsWith('http') ? menuItem.image : `/uploads/${menuItem.image}`}
                                                alt={menuItem.name}
                                                style={{ width: "110px", height: "95px" }}
                                            />
                                        )}
                                    </td>
                                    <td>{menuItem.name}</td>
                                    <td>{menuItem.category_id?.name || "-"}</td>
                                    <td>
                                        {menuItem.is_available ? (
                                            <span className="status-active">Có sẵn</span>
                                        ) : (
                                            <span className="status-inactive">Hết hàng</span>
                                        )}
                                    </td>
                                    <td>{menuItem.price.toLocaleString()} VND</td>
                                    <td>
                                        <button
                                            className="edit-btn"
                                            onClick={() => openEdit(menuItem)}
                                            disabled={actionLoading}
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => openDelete(menuItem._id)}
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
            <EditMenuItemModal
                open={editModal.open}
                onClose={closeEdit}
                menuItem={editModal.menuItem}
                categories={categories}
                onSave={handleEditSave}
            />
            <ConfirmDelete
                open={deleteModal.open}
                onClose={closeDelete}
                onConfirm={handleDelete}
            />
            <ConfirmDelete
                open={deleteSelectedModal}
                onClose={closeDeleteSelected}
                onConfirm={handleDeleteSelected}
                message="Bạn có chắc muốn xóa các món ăn đã chọn không?"
            />
            {actionLoading && <div className="loading-overlay">Đang xử lý...</div>}
        </div>
    );
};

export default MenuItemManagement;
