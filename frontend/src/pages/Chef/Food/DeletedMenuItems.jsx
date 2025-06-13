import React, { useState, useEffect, useMemo, useContext } from "react";
import { toast } from "react-toastify";
import "./DeletedMenuItems.css";
import ConfirmDelete from "./ConfirmDelete";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import axios from '../../../utils/axios.customize';

// ===== HÀM BỎ DẤU TIẾNG VIỆT =====
function removeVietnameseTones(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d").replace(/Đ/g, "D");
}
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

const DeletedMenuItems = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selected, setSelected] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [restoreModal, setRestoreModal] = useState({ open: false, id: null });
    const [searchText, setSearchText] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    const safeGet = (obj, path, defaultValue = null) => {
        try {
            return path.split('.').reduce((o, p) => o && o[p], obj) || defaultValue;
        } catch {
            return defaultValue;
        }
    };

    useEffect(() => {
        if (user !== null && user !== undefined) {
            const userRole = safeGet(user, 'user.role') || safeGet(user, 'role');
            const allowedRoles = ['chef'];
            if (!userRole || !allowedRoles.includes(userRole)) {
                navigate('/login');
            }
        }
    }, [user, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [menuRes, categoriesRes] = await Promise.all([
                    axios.get("/menu-items/deleted", { withCredentials: true }),
                    axios.get("/categories", { withCredentials: true }),
                ]);
                setMenuItems(menuRes.data?.data);
                if (Array.isArray(categoriesRes.data)) {
                    setCategories(categoriesRes.data);
                } else if (Array.isArray(categoriesRes.data?.data)) {
                    setCategories(categoriesRes.data.data);
                } else {
                    console.error("Invalid categories data format:", categoriesRes.data);
                    setCategories([]);
                }
            } catch (error) {
                toast.error("Không thể tải dữ liệu", { autoClose: 3000 });
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // Filter & search
    const filteredItems = useMemo(() => {
        let filtered = menuItems;
        if (searchText) {
            filtered = filtered.filter(item => fuzzyMatch(item.name, searchText));
        }
        if (selectedCategory) {
            filtered = filtered.filter(item =>
                item.category_id?._id === selectedCategory
            );
        }
        // Món mới xóa gần nhất lên đầu
        return [...filtered].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
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

    const openRestore = (id) => setRestoreModal({ open: true, id });
    const closeRestore = () => setRestoreModal({ open: false, id: null });

    const handleRestore = async () => {
        setActionLoading(true);
        try {
            await axios.put(
                `/menu-items/${restoreModal.id}/restore`,
                {},
                { withCredentials: true }
            );
            setMenuItems((prev) => prev.filter((m) => m._id !== restoreModal.id));
            setSelected((prev) => prev.filter((s) => s !== restoreModal.id));
            closeRestore();
            toast.success("Khôi phục món ăn thành công!", { autoClose: 3000 });
        } catch (error) {
            toast.error("Lỗi khi khôi phục.", { autoClose: 3000 });
        }
        setActionLoading(false);
    };

    return (
        <div className="deleted-menu-items">
            <div className="header-section">
                <h2>Sản phẩm tạm xóa</h2>
                <div className="toolbar-row">
                    <div className="filter-section">
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên món..."
                            value={searchText}
                            onChange={e => {
                                setSearchText(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                        <select
                            value={selectedCategory}
                            onChange={e => {
                                setSelectedCategory(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="">Tất cả danh mục</option>
                            {categories.map(cat => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            {loading ? (
                <div className="loading">Đang tải...</div>
            ) : (
                <>
                    <table className="deleted-menu-items-table">
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
                                                src={`/uploads/${menuItem.image}`}
                                                alt={menuItem.name}
                                                style={{ width: "110px", height: "95px" }}
                                            />
                                        )}
                                    </td>
                                    <td>{menuItem.name}</td>
                                    <td>{menuItem.category_id?.name || "-"}</td>
                                    <td>
                                        <span className="status-inactive">Ngừng kinh doanh</span>
                                    </td>
                                    <td>{menuItem.price.toLocaleString()} VND</td>
                                    <td>
                                        <button
                                            className="restore-btn"
                                            onClick={() => openRestore(menuItem._id)}
                                            disabled={actionLoading}
                                        >
                                            Khôi phục
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
            <ConfirmDelete
                open={restoreModal.open}
                onClose={closeRestore}
                onConfirm={handleRestore}
                message="Bạn có chắc muốn khôi phục món ăn này không?"
            />
            {actionLoading && <div className="loading-overlay">Đang xử lý...</div>}
        </div>
    );
};

export default DeletedMenuItems;
