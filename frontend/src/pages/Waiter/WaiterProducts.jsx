import React from 'react';
import './WaiterProducts.css';

const WaiterProducts = () => {
    return (
        <div className="waiter-products">
            <div className="products-header">
                <h1>🍽️ Quản lý món ăn</h1>
                <p>Xem và quản lý các món ăn trong menu</p>
            </div>

            <div className="products-content">
                <div className="product-card">
                    <h3>📋 Danh sách món ăn</h3>
                    <p>Đây là trang quản lý món ăn cho waiter</p>
                </div>
            </div>
        </div>
    );
};

export default WaiterProducts;