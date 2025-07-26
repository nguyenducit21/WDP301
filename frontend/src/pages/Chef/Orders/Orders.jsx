import React, { useState, useEffect, useContext } from 'react';
import axios from '../../../utils/axios.customize';
import { ToastContext } from '../../../context/StoreContext';
import { AuthContext } from '../../../context/AuthContext';
import io from 'socket.io-client';
import './Orders.css';

const Orders = () => {
    const [orders, setOrders] = useState({
        pre_orders: [],
        staff_orders: [],
        all_orders: []
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'pre_orders', 'staff_orders', 'completed', 'cancelled'
    const [editingOrderId, setEditingOrderId] = useState(null);
    const { showToast } = useContext(ToastContext);
    const { user } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);
    const [newOrderNotification, setNewOrderNotification] = useState(null);

    // Filter states
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterTable, setFilterTable] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const getTodayString = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    const [filterDate, setFilterDate] = useState(getTodayString());

    useEffect(() => {
        fetchOrders();

        // Khởi tạo socket connection
        const newSocket = io('http://localhost:3000');
        setSocket(newSocket);

        // Join chef room
        if (user) {
            newSocket.emit('join-chef-room', {
                userId: user.userId || user._id,
                fullName: user.full_name || user.username
            });
        }

        // Lắng nghe new order notification
        newSocket.on('new_order_for_chef', (data) => {
            console.log('🔔 New order notification received:', data);
            setNewOrderNotification(data);

            // Hiển thị toast notification
            showToast(`Có đơn hàng mới từ ${data.order.customer_name}!`, 'info');

            // Phát âm thanh thông báo (nếu browser hỗ trợ)
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
                audio.play();
            } catch (error) {
                console.log('Audio notification not supported');
            }

            // Tự động refresh danh sách đơn hàng sau 2 giây
            setTimeout(() => {
                fetchOrders();
            }, 2000);

            // Tự động ẩn notification sau 8 giây
            setTimeout(() => {
                setNewOrderNotification(null);
            }, 8000);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

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
            { value: 'confirmed', label: 'Nấu lại' },
            { value: 'cooked', label: 'Đã nấu xong' }, // Thêm trạng thái này
            // { value: 'completed', label: 'Hoàn thành' },
            // { value: 'cancelled', label: 'Hủy đơn' }
        ];

        // Luôn trả về tất cả status trừ status hiện tại
        return allStatuses.filter(status => status.value !== currentStatus);
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
            case 'confirmed':
                return '#ff9800';
            // case 'pending':
            //     return '#2196f3';
            case 'cooked':
                return '#00bcd4'; // Màu riêng cho cooked
            // case 'completed':
            //     return '#4caf50';
            case 'cancelled':
                return '#f44336';
            default:
                return '#757575';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'confirmed':
                return 'Chờ xử lý';
            case 'pending':
                return 'Đang chế biến';
            case 'cooked':
                return 'Đã nấu xong';
            // case 'completed':
            //     return 'Hoàn thành';
            case 'cancelled':
                return 'Đã hủy';
            default:
                return status;
        }
    };

    const renderOrderCard = (order, index) => {
        return (
            <div key={`${order.id}-${order.type}-${index}`} className="order-card">
                <div className="order-header">
                    <div className="order-type">
                        {order.type === 'pre_order' ? '🕐 Đặt trước' : '🏃 Đơn tại quán'}
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
                        <h4>📅 Thời gian: {order.type === 'pre_order' ?
                            `Đặt trước: ${order.slot_time || formatDateTime(order.created_at)}` :
                            `Tại quán: ${order.order_time || formatDateTime(order.created_at)}`}</h4>
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
                    return orders.pre_orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'cooked');
                case 'staff_orders':
                    return orders.staff_orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'cooked');
                case 'completed':
                    return orders.all_orders.filter(order => order.status === 'cooked');
                case 'cancelled':
                    return orders.all_orders.filter(order => order.status === 'cancelled');
                default:
                    return orders.all_orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'cooked');
            }
        })();

        // Loại bỏ duplicate orders dựa trên ID
        let uniqueOrders = filtered.filter((order, index, self) =>
            index === self.findIndex(o => o.id === order.id)
        );

        // Áp dụng filter nâng cao
        if (filterCustomer.trim()) {
            uniqueOrders = uniqueOrders.filter(order =>
                order.customer_name && order.customer_name.toLowerCase().includes(filterCustomer.trim().toLowerCase())
            );
        }
        if (filterTable.trim()) {
            uniqueOrders = uniqueOrders.filter(order =>
                order.tables && order.tables.toString().toLowerCase().includes(filterTable.trim().toLowerCase())
            );
        }
        if (filterStatus) {
            uniqueOrders = uniqueOrders.filter(order => order.status === filterStatus);
        }
        if (filterDate) {
            uniqueOrders = uniqueOrders.filter(order => {
                const orderDate = new Date(order.created_at);
                const filterDateObj = new Date(filterDate);
                return orderDate.toDateString() === filterDateObj.toDateString();
            });
        }
        return uniqueOrders;
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
            {/* New Order Notification */}
            {newOrderNotification && (
                <div className="new-order-notification">
                    <div className="notification-content">
                        <div className="notification-icon">🔔</div>
                        <div className="notification-text">
                            <h4>Có đơn hàng mới!</h4>
                            <p>Khách hàng: {newOrderNotification.order.customer_name}</p>
                            <p>Bàn: {newOrderNotification.order.tables}</p>
                            <p>Số món: {newOrderNotification.order.items?.length || 0}</p>
                            <p>Loại: {newOrderNotification.order.type === 'pre_order' ? 'Đặt trước' : 'Tại quán'}</p>
                            {newOrderNotification.order.items && newOrderNotification.order.items.length > 0 && (
                                <div className="notification-items">
                                    <p><strong>Món ăn:</strong></p>
                                    {newOrderNotification.order.items.slice(0, 3).map((item, index) => (
                                        <p key={index} className="notification-item">
                                            • {item.menu_item?.name || 'Món không xác định'} x{item.quantity}
                                        </p>
                                    ))}
                                    {newOrderNotification.order.items.length > 3 && (
                                        <p className="notification-more">... và {newOrderNotification.order.items.length - 3} món khác</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            className="notification-close"
                            onClick={() => setNewOrderNotification(null)}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            <div className="orders-header modern">
                <div className="orders-title">Danh sách đơn hàng</div>
                <button onClick={fetchOrders} className="refresh-btn outline">Làm mới</button>
            </div>

            {/* Filter UI */}
            <div className="orders-filter-bar modern">
                <input
                    type="text"
                    placeholder="Tìm theo tên khách hàng"
                    value={filterCustomer}
                    onChange={e => setFilterCustomer(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Tìm theo bàn"
                    value={filterTable}
                    onChange={e => setFilterTable(e.target.value)}
                />

                <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                />
            </div>

            <div className="orders-tabs modern">
                <button
                    className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    Tất cả ({orders.all_orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled').length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'pre_orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pre_orders')}
                >
                    Đặt trước ({orders.pre_orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'cooked').length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'staff_orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('staff_orders')}
                >
                    Đơn tại quán ({orders.staff_orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'cooked').length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    Đã hoàn thành ({orders.all_orders.filter(order => order.status === 'cooked').length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cancelled')}
                >
                    Đã hủy ({orders.all_orders.filter(order => order.status === 'cancelled').length})
                </button>
            </div>

            <div className="orders-list modern">
                {getFilteredOrders().length === 0 ? (
                    <div className="no-orders">
                        <p>Không có đơn hàng nào</p>
                    </div>
                ) : (
                    getFilteredOrders().map((order, index) => (
                        <div key={`${order.id}-${order.type}-${index}`} className="order-card modern">
                            <div className="order-header modern" style={{ paddingBottom: '20px' }}>
                                <div className="order-type modern">{order.type === 'pre_order' ? 'Đặt trước' : 'Đơn tại quán'}</div>
                                <div className="status-container modern">
                                    <div
                                        className={`order-status modern badge badge-${order.status}`}
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
                            <div className="order-info modern">
                                <div className="order-info-row">
                                    <span className="order-label">Khách hàng:</span>
                                    <span className="order-value">{order.customer_name}</span>
                                </div>
                                <div className="order-info-row">
                                    <span className="order-label">Bàn:</span>
                                    <span className="order-value">{order.tables}</span>
                                </div>
                                <div className="order-info-row">
                                    <span className="order-label">Thời gian:</span>
                                    <span className="order-value">{order.type === 'pre_order' ?
                                        `Đặt trước: ${order.slot_time || formatDateTime(order.created_at)}` :
                                        `Tại quán: ${order.order_time || formatDateTime(order.created_at)}`}</span>
                                </div>
                                {order.staff_name && (
                                    <div className="order-info-row">
                                        <span className="order-label">Nhân viên:</span>
                                        <span className="order-value">{order.staff_name}</span>
                                    </div>
                                )}
                                <div className="order-info-row order-items-row">
                                    <span className="order-label">Món ăn:</span>
                                    <div className="order-items-list">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="order-item modern">
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
                                </div>
                                {order.note && (
                                    <div className="order-info-row order-note modern">
                                        <span className="order-label">Ghi chú:</span>
                                        <span className="order-value">{order.note}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Orders;