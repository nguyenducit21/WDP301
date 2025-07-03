import React, { useState, useEffect, useContext } from 'react';
import axios from '../../../utils/axios.customize';
import { ToastContext } from '../../../context/StoreContext';
import './Orders.css';

const Orders = () => {
    const [orders, setOrders] = useState({
        pre_orders: [],
        staff_orders: [],
        all_orders: []
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'pre_orders', 'staff_orders', 'completed'
    const [editingOrderId, setEditingOrderId] = useState(null);
    const { showToast } = useContext(ToastContext);

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
    }, [orders]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/reservations/orders');
            if (response.data.success) {
                setOrders(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            showToast('Lỗi khi tải danh sách orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {

            const response = await axios.patch(`/reservations/${orderId}/status`, {
                status: newStatus
            });


            if (response.data.success) {
                showToast('Cập nhật trạng thái thành công', 'success');
                fetchOrders(); // Refresh danh sách
                setEditingOrderId(null); // Đóng dropdown
            } else {
                console.error('Update failed:', response.data);
                showToast(response.data.message || 'Cập nhật trạng thái thất bại', 'error');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            console.error('Error response:', error.response?.data);
            showToast(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái', 'error');
        }
    };

    const handleStatusClick = (orderId) => {
        setEditingOrderId(editingOrderId === orderId ? null : orderId);
    };

    const getAvailableStatuses = (currentStatus, orderType = 'active') => {
        const allStatuses = [
            { value: 'pending', label: 'Chờ xử lý' },
            { value: 'confirmed', label: 'Xác nhận' },
            { value: 'completed', label: 'Hoàn thành' },
            { value: 'cancelled', label: 'Hủy đơn' }
        ];

        if (orderType === 'completed') {
            return allStatuses.filter(status => status.value !== currentStatus);
        }

        return allStatuses.filter(status =>
            status.value !== currentStatus && status.value !== 'completed'
        );
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return '#ff9800';
            case 'confirmed':
                return '#2196f3';

            case 'completed':
                return '#4caf50';
            case 'cancelled':
                return '#f44336';
            default:
                return '#757575';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending':
                return 'Chờ xử lý';
            case 'confirmed':
                return 'Đang chế biến';

            case 'completed':
                return 'Hoàn thành';
            case 'cancelled':
                return 'Đã hủy';
            default:
                return status;
        }
    };

    const renderOrderCard = (order) => {
        return (
            <div key={order.id} className="order-card">
                <div className="order-header">
                    <div className="order-type">
                        {order.type === 'pre_order' ? '🕐 Đặt trước' : '👨‍💼 Nhân viên đặt'}
                    </div>
                    <div className="status-container">
                        <div
                            className="order-status"
                            style={{ backgroundColor: getStatusColor(order.status) }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleStatusClick(order.id);
                            }}
                        >
                            {getStatusText(order.status)}
                            <span className="status-arrow">▼</span>
                        </div>

                        {editingOrderId === order.id && (
                            <div className="status-dropdown">
                                {getAvailableStatuses(order.status, activeTab === 'completed' ? 'completed' : 'active').map(status => (
                                    <div
                                        key={status.value}
                                        className="status-option"
                                        onClick={() => {
                                            updateOrderStatus(order.id, status.value);
                                        }}
                                    >
                                        {status.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="order-info">
                    <div className="customer-info">
                        <h4>👤 Khách hàng: {order.customer_name}</h4>
                        <h4>🪑 Bàn: {order.tables}</h4>
                        <h4>📅 Thời gian: {formatDateTime(order.created_at)}</h4>
                        {order.staff_name && <p>👨‍💼 Nhân viên: {order.staff_name}</p>}
                    </div>

                    <div className="order-items">
                        <h4>🍽️ Món ăn:</h4>
                        {order.items.map((item, index) => (
                            <div key={index} className="order-item">
                                <img
                                    src={item.menu_item.image}
                                    alt={item.menu_item.name}
                                    className="item-image"
                                />
                                <div className="item-details">
                                    <span className="item-name">{item.menu_item.name}</span>
                                    <span className="item-quantity">x{item.quantity}</span>
                                </div>

                            </div>
                        ))}
                    </div>

                    {order.note && (
                        <div className="order-note">
                            <h4>📝 Ghi chú:</h4>
                            <p>{order.note}</p>
                        </div>
                    )}


                </div>
            </div>
        );
    };

    const getFilteredOrders = () => {
        const filtered = (() => {
            switch (activeTab) {
                case 'pre_orders':
                    return orders.pre_orders.filter(order => order.status !== 'completed');
                case 'staff_orders':
                    return orders.staff_orders.filter(order => order.status !== 'completed');
                case 'completed':
                    return orders.all_orders.filter(order => order.status === 'completed');
                default:
                    return orders.all_orders.filter(order => order.status !== 'completed');
            }
        })();

        return filtered;
    };

    if (loading) {
        return (
            <div className="orders-container">
                <div className="loading">Đang tải danh sách orders...</div>
            </div>
        );
    }

    return (
        <div className="orders-container">
            <div className="orders-header">
                <h2>📋 Danh sách Orders</h2>
                <button onClick={fetchOrders} className="refresh-btn">
                    🔄 Làm mới
                </button>
            </div>

            <div className="orders-tabs">
                <button
                    className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    Tất cả ({orders.all_orders.filter(order => order.status !== 'completed').length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'pre_orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pre_orders')}
                >
                    Đặt trước ({orders.pre_orders.filter(order => order.status !== 'completed').length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'staff_orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('staff_orders')}
                >
                    Nhân viên đặt ({orders.staff_orders.filter(order => order.status !== 'completed').length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    Đã hoàn thành ({orders.all_orders.filter(order => order.status === 'completed').length})
                </button>
            </div>

            <div className="orders-list">
                {getFilteredOrders().length === 0 ? (
                    <div className="no-orders">
                        <p>📭 Không có orders nào</p>
                    </div>
                ) : (
                    getFilteredOrders().map(renderOrderCard)
                )}
            </div>
        </div>
    );
};

export default Orders;