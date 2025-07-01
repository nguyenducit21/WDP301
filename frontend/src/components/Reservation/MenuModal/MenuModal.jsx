import React, { useState, useEffect } from 'react';
import customFetch from '../../../utils/axios.customize';

const MenuModal = ({
    isOpen,
    onClose,
    preOrderItems,
    onMenuItemChange,
    calculatePreOrderTotal,
    getSelectedItemsCount
}) => {
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [loadingMenu, setLoadingMenu] = useState(false);

    // Fetch menu items and categories
    useEffect(() => {
        if (!isOpen) return;

        const fetchMenuData = async () => {
            try {
                setLoadingMenu(true);

                // Fetch menu items
                const menuResponse = await customFetch.get('/menu-items');
                if (menuResponse?.data?.success && Array.isArray(menuResponse.data.data)) {
                    setMenuItems(menuResponse.data.data);
                }

                // Fetch categories
                const categoriesResponse = await customFetch.get('/categories');
                if (Array.isArray(categoriesResponse.data)) {
                    setCategories(categoriesResponse.data);
                } else if (Array.isArray(categoriesResponse.data?.data)) {
                    setCategories(categoriesResponse.data.data);
                }
            } catch (error) {
                console.error('Error fetching menu data:', error);
            } finally {
                setLoadingMenu(false);
            }
        };

        fetchMenuData();
    }, [isOpen]);

    const getFilteredMenuItems = () => {
        return menuItems.filter(
            (item) =>
                selectedCategory === "All" ||
                item.category_id === selectedCategory ||
                (item.category_id?._id && item.category_id._id === selectedCategory)
        );
    };

    if (!isOpen) return null;

    return (
        <div className="menu-modal-overlay">
            <div className="menu-modal">
                <div className="menu-modal-header">
                    <h3>Chọn món đặt trước (Giảm 15%)</h3>
                    <button className="close-modal-btn" onClick={onClose}>×</button>
                </div>

                <div className="menu-modal-content">
                    <div className="menu-sidebar">
                        <div className="menu-sidebar-title">
                            <span className="decor">—</span>
                            <span>THỰC ĐƠN</span>
                            <span className="decor">—</span>
                        </div>
                        <ul className="sidebar-list">
                            <li
                                className={selectedCategory === "All" ? "active" : ""}
                                onClick={() => setSelectedCategory("All")}
                            >
                                Xem tất cả
                            </li>
                            {categories.map((cat) => (
                                <li
                                    key={cat._id}
                                    className={selectedCategory === cat._id ? "active" : ""}
                                    onClick={() => setSelectedCategory(cat._id)}
                                >
                                    {cat.name}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="menu-content">
                        <div className="menu-heading">
                            <span className="sub-title">Nhà Hàng Hương Sen</span>
                            <h2>
                                {selectedCategory === "All"
                                    ? "Thực đơn"
                                    : categories.find((c) => c._id === selectedCategory)?.name || ""}
                            </h2>
                        </div>

                        {loadingMenu ? (
                            <div className="loading">Đang tải menu...</div>
                        ) : (
                            <div className="menu-items-grid">
                                {getFilteredMenuItems().map((item) => {
                                    const preOrderItem = preOrderItems.find(i => i.menu_item_id === item._id);
                                    const quantity = preOrderItem ? preOrderItem.quantity : 0;

                                    return (
                                        <div key={item._id} className="menu-item-card">
                                            <div className="menu-item-image">
                                                {item.image && (
                                                    <img src={item.image} alt={item.name} />
                                                )}
                                            </div>
                                            <div className="menu-item-info">
                                                <h4>{item.name}</h4>
                                                <p>{item.description}</p>
                                                <div className="menu-item-price">{item.price ? item.price.toLocaleString() : 0}đ</div>
                                            </div>
                                            <div className="menu-item-actions">
                                                <div className="quantity-controls">
                                                    <button
                                                        type="button"
                                                        className="quantity-btn"
                                                        onClick={() => onMenuItemChange(item._id, Math.max(0, quantity - 1))}
                                                    >-</button>
                                                    <span className="quantity-display">{quantity}</span>
                                                    <button
                                                        type="button"
                                                        className="quantity-btn"
                                                        onClick={() => onMenuItemChange(item._id, quantity + 1)}
                                                    >+</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="menu-modal-footer">
                    <div className="order-summary">
                        <span>Tổng tiền: <strong>{calculatePreOrderTotal().toLocaleString()}đ</strong></span>
                        <span>Số món: <strong>{getSelectedItemsCount()}</strong></span>
                    </div>
                    <button className="confirm-menu-btn" onClick={onClose}>
                        Xác nhận ({getSelectedItemsCount()} món)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MenuModal; 