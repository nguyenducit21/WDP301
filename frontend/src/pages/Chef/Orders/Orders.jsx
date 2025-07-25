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
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'pre_orders', 'staff_orders', 'completed', 'cancelled'
    const [editingOrderId, setEditingOrderId] = useState(null);
    const { showToast } = useContext(ToastContext);

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
            { value: 'confirmed', label: 'Xác nhận' },
            { value: 'cooked', label: 'Đã nấu xong' }, // Thêm trạng thái này
            // { value: 'completed', label: 'Hoàn thành' },
            { value: 'cancelled', label: 'Hủy đơn' }
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
            case 'pending':
                return '#2196f3';
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
                    return orders.pre_orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled');
                case 'staff_orders':
                    return orders.staff_orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled');
                case 'completed':
                    return orders.all_orders.filter(order => order.status === 'completed');
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
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="confirmed">Chờ xử lý</option>
                    <option value="pending">Đang chế biến</option>
                    <option value="cooked">Đã nấu xong</option>
                    <option value="cancelled">Đã hủy</option>
                </select>
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
                    Đặt trước ({orders.pre_orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled').length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'staff_orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('staff_orders')}
                >
                    Nhân viên đặt ({orders.staff_orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled').length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    Đã hoàn thành ({orders.all_orders.filter(order => order.status === 'completed').length})
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
                            <div className="order-header modern">
                                <div className="order-type modern">{order.type === 'pre_order' ? 'Đặt trước' : 'Nhân viên đặt'}</div>
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
                                    <span className="order-value">{formatDateTime(order.created_at)}</span>
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