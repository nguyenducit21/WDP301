import React, { useState, useEffect } from 'react';
import axios from '../../../utils/axios.customize';
import './WaiterOrders.css';

const WaiterOrders = () => {
    const [orders, setOrders] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ordersResponse, tablesResponse] = await Promise.all([
                axios.get('/orders/waiter'),
                axios.get('/tables')
            ]);

            if (ordersResponse.data.success) {
                setOrders(ordersResponse.data.data);
            }
            if (tablesResponse.data.success) {
                setTables(tablesResponse.data.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            const response = await axios.patch(`/orders/${orderId}/status`, {
                status: newStatus
            });

            if (response.data.success) {
                fetchData();
            }
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    const getFilteredOrders = () => {
        let filtered = orders;

        if (selectedTable !== 'all') {
            filtered = filtered.filter(order => order.table_id === selectedTable);
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(order => order.status === filterStatus);
        }

        return filtered;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#ff9800';
            case 'preparing': return '#2196f3';
            case 'ready': return '#4caf50';
            case 'served': return '#4caf50';
            case 'completed': return '#4caf50';
            case 'cancelled': return '#f44336';
            default: return '#757575';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Chờ xử lý';
            case 'preparing': return 'Đang chế biến';
            case 'ready': return 'Sẵn sàng';
            case 'served': return 'Đã phục vụ';
            case 'completed': return 'Hoàn thành';
            case 'cancelled': return 'Đã hủy';
            default: return status;
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateTotal = (items) => {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const handleViewOrder = (order) => {
        setSelectedOrder(order);
    };

    const closeOrderModal = () => {
        setSelectedOrder(null);
    };

    if (loading) {
        return (
            <div className="waiter-orders">
                <div className="loading">Đang tải danh sách đơn hàng...</div>
            </div>
        );
    }

    return (
        <div className="waiter-orders">
            <div className="orders-header">
                <div className="header-left">
                    <h1>🍽️ Quản lý đơn hàng</h1>
                    <p>Quản lý và theo dõi đơn hàng theo bàn</p>
                </div>
                <div className="header-actions">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="create-order-btn"
                    >
                        ➕ Tạo đơn hàng mới
                    </button>
                    <button onClick={fetchData} className="refresh-btn">
                        🔄 Làm mới
                    </button>
                </div>
            </div>

            <div className="filters">
                <div className="filter-group">
                    <label>Bàn:</label>
                    <select
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="table-select"
                    >
                        <option value="all">Tất cả bàn</option>
                        {tables.map(table => (
                            <option key={table._id} value={table._id}>
                                {table.name} ({table.capacity} người)
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Trạng thái:</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="status-select"
                    >
                        <option value="all">Tất cả</option>
                        <option value="pending">Chờ xử lý</option>
                        <option value="preparing">Đang chế biến</option>
                        <option value="ready">Sẵn sàng</option>
                        <option value="served">Đã phục vụ</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                </div>
            </div>

            <div className="orders-overview">
                <div className="overview-stats">
                    <div className="stat-item">
                        <span className="stat-number">{getFilteredOrders().length}</span>
                        <span className="stat-label">Tổng đơn hàng</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">
                            {getFilteredOrders().filter(o => o.status === 'pending').length}
                        </span>
                        <span className="stat-label">Chờ xử lý</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">
                            {getFilteredOrders().filter(o => o.status === 'ready').length}
                        </span>
                        <span className="stat-label">Sẵn sàng</span>
                    </div>
                </div>
            </div>

            <div className="orders-list">
                {getFilteredOrders().length === 0 ? (
                    <div className="no-orders">
                        <p>📭 Không có đơn hàng nào</p>
                    </div>
                ) : (
                    getFilteredOrders().map(order => (
                        <div key={order._id} className="order-card">
                            <div className="order-header">
                                <div className="order-info">
                                    <h3>🪑 Bàn {order.table_name}</h3>
                                    <p className="order-time">{formatDateTime(order.created_at)}</p>
                                    <p className="order-customer">
                                        {order.customer_name || 'Khách lẻ'}
                                    </p>
                                </div>

                                <div className="order-status">
                                    <span
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(order.status) }}
                                    >
                                        {getStatusText(order.status)}
                                    </span>
                                </div>
                            </div>

                            <div className="order-items">
                                <h4>🍽️ Món ăn:</h4>
                                <div className="items-list">
                                    {order.order_items.slice(0, 3).map((item, index) => (
                                        <div key={index} className="item-preview">
                                            <span className="item-name">{item.menu_item.name}</span>
                                            <span className="item-quantity">x{item.quantity}</span>
                                        </div>
                                    ))}
                                    {order.order_items.length > 3 && (
                                        <div className="more-items">
                                            +{order.order_items.length - 3} món khác
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="order-footer">
                                <div className="order-total">
                                    <span className="total-label">Tổng cộng:</span>
                                    <span className="total-amount">
                                        {calculateTotal(order.order_items).toLocaleString('vi-VN')}đ
                                    </span>
                                </div>

                                <div className="order-actions">
                                    <button
                                        onClick={() => handleViewOrder(order)}
                                        className="action-btn view-btn"
                                    >
                                        👁️ Xem chi tiết
                                    </button>

                                    {order.status === 'pending' && (
                                        <button
                                            onClick={() => handleStatusUpdate(order._id, 'preparing')}
                                            className="action-btn prepare-btn"
                                        >
                                            🔄 Bắt đầu chế biến
                                        </button>
                                    )}

                                    {order.status === 'preparing' && (
                                        <button
                                            onClick={() => handleStatusUpdate(order._id, 'ready')}
                                            className="action-btn ready-btn"
                                        >
                                            ✅ Sẵn sàng
                                        </button>
                                    )}

                                    {order.status === 'ready' && (
                                        <button
                                            onClick={() => handleStatusUpdate(order._id, 'served')}
                                            className="action-btn serve-btn"
                                        >
                                            🍽️ Đã phục vụ
                                        </button>
                                    )}

                                    {order.status === 'served' && (
                                        <button
                                            onClick={() => handleStatusUpdate(order._id, 'completed')}
                                            className="action-btn complete-btn"
                                        >
                                            ✅ Hoàn thành
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="modal-overlay" onClick={closeOrderModal}>
                    <div className="order-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Chi tiết đơn hàng - Bàn {selectedOrder.table_name}</h2>
                            <button onClick={closeOrderModal} className="close-btn">×</button>
                        </div>

                        <div className="modal-content">
                            <div className="order-details">
                                <div className="detail-row">
                                    <span className="label">Khách hàng:</span>
                                    <span>{selectedOrder.customer_name || 'Khách lẻ'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Thời gian:</span>
                                    <span>{formatDateTime(selectedOrder.created_at)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Trạng thái:</span>
                                    <span className="status-text" style={{ color: getStatusColor(selectedOrder.status) }}>
                                        {getStatusText(selectedOrder.status)}
                                    </span>
                                </div>
                            </div>

                            <div className="items-detail">
                                <h3>🍽️ Chi tiết món ăn</h3>
                                {selectedOrder.order_items.map((item, index) => (
                                    <div key={index} className="item-detail">
                                        <div className="item-info">
                                            <span className="item-name">{item.menu_item.name}</span>
                                            <span className="item-price">{item.price.toLocaleString('vi-VN')}đ</span>
                                        </div>
                                        <div className="item-quantity">
                                            x{item.quantity}
                                        </div>
                                        <div className="item-total">
                                            {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="order-summary">
                                <div className="total-row">
                                    <span>Tổng cộng:</span>
                                    <span className="total-amount">
                                        {calculateTotal(selectedOrder.order_items).toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaiterOrders; 