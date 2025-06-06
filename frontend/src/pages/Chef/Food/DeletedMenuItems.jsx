import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./DeletedMenuItems.css";
import ConfirmDelete from "./ConfirmDelete"; // Tái sử dụng ConfirmDelete

const DeletedMenuItems = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [selected, setSelected] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [restoreModal, setRestoreModal] = useState({ open: false, id: null }); // Thêm trạng thái xác nhận khôi phục

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await axios.get("http://localhost:5000/api/menuitems/deleted");
                setMenuItems(res.data);
            } catch (error) {
                toast.error("Không thể tải dữ liệu", { autoClose: 3000 });
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const totalPages = Math.ceil(menuItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = useMemo(
        () => menuItems.slice(startIndex, startIndex + itemsPerPage),
        [menuItems, startIndex, itemsPerPage]
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
            const res = await axios.put(`http://localhost:5000/api/menuitems/${restoreModal.id}/restore`);
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
                                                src={`http://localhost:5000/uploads/${menuItem.image}`}
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