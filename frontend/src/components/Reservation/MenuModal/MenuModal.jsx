import React, { useState, useEffect } from 'react';
import customFetch from '../../../utils/axios.customize';

const MenuModal = ({
    isOpen,
    onClose,
    preOrderItems,
    onMenuItemChange,
    calculatePreOrderTotal,
    getSelectedItemsCount,
    menuItems,
    categories,
    loadingMenu,
    getFilteredMenuItems,
    getItemQuantity
}) => {
    const [selectedCategory, setSelectedCategory] = useState("All");

    if (!isOpen) return null;

    return (
        <div className="menu-modal-overlay">
            <div className="menu-modal">
                <div className="menu-modal-header">
                    <h3>Chọn món đặt trước</h3>
                    <button className="close-modal-btn" onClick={() => onClose(false)}>×</button>
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
                                {getFilteredMenuItems(selectedCategory)
                                    .filter(item => item.is_available !== false)
                                    .map((item) => {
                                        const quantity = getItemQuantity(item._id);
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
                    <button className="confirm-menu-btn" onClick={() => onClose(true)}>
                        Xác nhận ({getSelectedItemsCount()} món)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MenuModal; 