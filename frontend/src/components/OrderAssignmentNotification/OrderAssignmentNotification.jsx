import React, { useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/StoreContext';
import axios from '../../utils/axios.customize';
import './OrderAssignmentNotification.css';

const OrderAssignmentNotification = () => {
    const [orderAssignments, setOrderAssignments] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'completed_reservations'
    const [completedReservations, setCompletedReservations] = useState([]);
    const { user } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);

    useEffect(() => {
        // Chỉ kết nối nếu user là staff
        if (!user?.user?.role || !['waiter', 'kitchen_staff', 'manager', 'admin'].includes(user.user.role)) {
            return;
        }

        // Kết nối WebSocket
        const newSocket = io('http://localhost:3000');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to WebSocket for order assignments');
            setIsConnected(true);

            // Join staff room
            const staffData = {
                userId: user.user.id,
                role: user.user.role,
                fullName: user.user.full_name || user.user.username
            };
            console.log('Joining staff room with data:', staffData);
            newSocket.emit('join-staff-room', staffData);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
            setIsConnected(false);
        });

        // Lắng nghe đơn hàng assignment mới
        newSocket.on('new_order_assignment', (data) => {
            console.log('✅ Received new order assignment:', data);

            // Phân loại loại thông báo dựa trên dữ liệu
            const isPreOrder = data.order_details.has_pre_order;
            const isTableBooking = data.order_details.reservation_type === 'table_booking';

            let title = '🔔 Đơn hàng mới';
            let icon = '📋';

            if (isPreOrder) {
                title = '🍽️ Đặt trước mới';
                icon = '🍽️';
            } else if (isTableBooking) {
                title = '📅 Đặt bàn mới';
                icon = '📅';
            }

            const newAssignment = {
                id: data.assignment_id,
                type: data.order_details.reservation_type || 'new_order',
                title: title,
                message: `${data.order_details.customer_name} - Bàn ${data.order_details.tables}`,
                data: data,
                timestamp: new Date(),
                status: 'waiting',
                priority: data.priority,
                can_take: true,
                is_mine: false,
                icon: icon
            };

            setOrderAssignments(prev => [newAssignment, ...prev]);

            // Hiển thị browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Đơn hàng mới cần xử lý', {
                    body: `${data.order_details.customer_name} - ${data.order_details.tables}`,
                    icon: '/favicon.ico',
                    tag: data.assignment_id
                });
            }

            // Hiển thị toast
            showToast(`Đơn hàng mới: ${data.order_details.customer_name}`, 'info');
        });

        // Đơn hàng đã được nhận
        newSocket.on('order_claimed', (data) => {
            setOrderAssignments(prev => prev.map(assignment =>
                assignment.id === data.assignment_id
                    ? {
                        ...assignment,
                        status: 'processing',
                        assigned_to: data.assigned_to,
                        can_take: false,
                        is_mine: data.assigned_to.id === user.user.id
                    }
                    : assignment
            ));

            if (data.assigned_to.id === user.user.id) {
                showToast('Bạn đã nhận đơn hàng thành công!', 'success');
            } else {
                showToast(`${data.assigned_to.full_name} đã nhận đơn hàng`, 'info');
            }
        });

        // Đơn hàng được trả lại
        newSocket.on('order_released', (data) => {
            setOrderAssignments(prev => prev.map(assignment =>
                assignment.id === data.assignment_id
                    ? {
                        ...assignment,
                        status: 'waiting',
                        assigned_to: null,
                        can_take: true,
                        is_mine: false
                    }
                    : assignment
            ));

            showToast('Có đơn hàng được trả lại', 'warning');
        });

        // Đơn hàng hoàn thành
        newSocket.on('order_completed', (data) => {
            setOrderAssignments(prev => prev.filter(assignment =>
                assignment.id !== data.assignment_id
            ));

            if (data.completed_by === user.user.id) {
                showToast('Đã hoàn thành đơn hàng!', 'success');
            }
        });

        // Đơn hàng được cập nhật (khi khách chọn món)
        newSocket.on('order_assignment_updated', (data) => {
            console.log('🔄 Received assignment update:', data);

            setOrderAssignments(prev => prev.map(assignment => {
                if (assignment.id === data.assignment_id) {
                    // Phân loại loại thông báo dựa trên dữ liệu mới
                    const isPreOrder = data.order_details.has_pre_order;
                    const isTableBooking = data.order_details.reservation_type === 'table_booking';

                    let title = '🔔 Đơn hàng mới';
                    let icon = '📋';

                    if (isPreOrder) {
                        title = '🍽️ Đặt trước mới';
                        icon = '🍽️';
                    } else if (isTableBooking) {
                        title = '📅 Đặt bàn mới';
                        icon = '📅';
                    }

                    return {
                        ...assignment,
                        title: title,
                        icon: icon,
                        priority: data.priority,
                        type: data.order_details.reservation_type || 'updated_order',
                        data: data,
                        message: `${data.order_details.customer_name} - Bàn ${data.order_details.tables}`,
                        timestamp: new Date(data.updated_at)
                    };
                }
                return assignment;
            }));

            // Hiển thị toast thông báo
            const updateType = data.order_details.has_pre_order ? 'đã chọn món' : 'đã cập nhật thông tin';
            showToast(`${data.order_details.customer_name} ${updateType}`, 'info');
        });

        // Lắng nghe reservation_completed
        newSocket.on('reservation_completed', (data) => {
            console.log('🎉 Received reservation_completed:', data);
            setCompletedReservations(prev => [
                {
                    id: data.id,
                    tables: data.tables,
                    customer: data.customer,
                    guest_count: data.guest_count,
                    time: data.time,
                    note: data.note,
                    items: data.items // Add items to completed reservation
                },
                ...prev
            ]);
            showToast(`Bàn ${data.tables} đã sẵn sàng, vui lòng mang món ra cho khách!`, 'info');
        });

        // Load pending orders khi component mount
        loadPendingOrders();

        // Cleanup
        return () => {
            newSocket.close();
        };
    }, [user]);

    const loadPendingOrders = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/order-assignments/pending');

            if (response.data.success) {
                const formattedAssignments = response.data.data.map(assignment => ({
                    id: assignment.assignment_id,
                    type: 'existing_order',
                    title: assignment.status === 'waiting' ? '⏳ Đơn đang chờ' : '🔄 Đơn đang xử lý',
                    message: `${assignment.order_details.customer_name} - Bàn ${assignment.order_details.tables}`,
                    data: {
                        assignment_id: assignment.assignment_id,
                        order_details: assignment.order_details,
                        priority: assignment.priority
                    },
                    timestamp: new Date(assignment.created_at),
                    status: assignment.status,
                    priority: assignment.priority,
                    can_take: assignment.can_take,
                    is_mine: assignment.is_mine,
                    assigned_to: assignment.assigned_to
                }));

                setOrderAssignments(formattedAssignments);
            }
        } catch (error) {
            console.error('Error loading pending orders:', error);
            showToast('Lỗi khi tải danh sách đơn hàng', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClaimOrder = async (assignmentId) => {
        try {
            const response = await axios.post(`/order-assignments/${assignmentId}/claim`);

            if (response.data.success) {
                // Socket event sẽ update UI
                showToast('Đang xử lý đơn hàng...', 'success');
            }
        } catch (error) {
            console.error('Error claiming order:', error);
            showToast(error.response?.data?.message || 'Lỗi khi nhận đơn hàng', 'error');
        }
    };

    const handleReleaseOrder = async (assignmentId, reason = '') => {
        try {
            const response = await axios.post(`/order-assignments/${assignmentId}/release`, {
                reason
            });

            if (response.data.success) {
                showToast('Đã trả lại đơn hàng', 'success');
            }
        } catch (error) {
            console.error('Error releasing order:', error);
            showToast(error.response?.data?.message || 'Lỗi khi trả lại đơn hàng', 'error');
        }
    };

    const handleCompleteOrder = async (assignmentId) => {
        try {
            const response = await axios.post(`/order-assignments/${assignmentId}/complete`);

            if (response.data.success) {
                showToast('Đã hoàn thành đơn hàng!', 'success');
            }
        } catch (error) {
            console.error('Error completing order:', error);
            showToast(error.response?.data?.message || 'Lỗi khi hoàn thành đơn hàng', 'error');
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 3: return '#f44336'; // Khẩn cấp - Đỏ
            case 2: return '#ff9800'; // Cao - Cam
            default: return '#2196f3'; // Bình thường - Xanh
        }
    };

    const getPriorityText = (priority) => {
        switch (priority) {
            case 3: return '🚨 Khẩn cấp';
            case 2: return '⚡ Cao';
            default: return '📋 Bình thường';
        }
    };

    const waitingOrders = orderAssignments.filter(o => o.status === 'waiting');
    const myOrders = orderAssignments.filter(o => o.is_mine && o.status === 'processing');
    const totalPending = waitingOrders.length + myOrders.length;

    // Không hiển thị nếu không phải staff
    if (!user?.user?.role || !['waiter', 'kitchen_staff', 'manager', 'admin'].includes(user.user.role)) {
        return null;
    }

    return (
        <div className="order-assignment-notification">
            {/* Notification Button */}
            <div className="notification-button" onClick={() => setShowPanel(!showPanel)}>
                <div className="notification-icon">
                    📋
                    {(totalPending > 0 || completedReservations.length > 0) && (
                        <span className="notification-badge">{totalPending + completedReservations.length}</span>
                    )}
                </div>
                <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>{isConnected ? '🟢' : '🔴'}</div>
            </div>

            {/* Notification Panel */}
            {showPanel && (
                <div className="notification-panel">
                    <div className="panel-header">
                        <h3>Thông báo</h3>
                        <div className="panel-actions">
                            <button onClick={loadPendingOrders} className="refresh-btn" disabled={loading}>
                                {loading ? '⏳' : '🔄'}
                            </button>
                            <button onClick={() => setShowPanel(false)} className="close-btn">✕</button>
                        </div>
                    </div>
                    <div className="notification-tabs">
                        <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Đơn hàng</button>
                        <button className={activeTab === 'completed_reservations' ? 'active' : ''} onClick={() => setActiveTab('completed_reservations')}>Bàn đã phục vụ xong</button>
                    </div>
                    <div className="panel-content">
                        {activeTab === 'orders' && (
                            <>
                                {/* Đơn hàng đang chờ */}
                                {waitingOrders.length > 0 && (
                                    <div className="orders-section">
                                        <h4>⏳ Đang chờ xử lý ({waitingOrders.length})</h4>
                                        {waitingOrders.map(assignment => (
                                            <div key={assignment.id} className="order-assignment-item waiting">
                                                <div className="assignment-header">
                                                    <div className="assignment-title">
                                                        <span className="assignment-type-icon">
                                                            {assignment.icon || '📋'}
                                                        </span>
                                                        <span className="priority" style={{ color: getPriorityColor(assignment.priority) }}>
                                                            {getPriorityText(assignment.priority)}
                                                        </span>
                                                    </div>
                                                    <span className="assignment-time">
                                                        {formatDateTime(assignment.timestamp)}
                                                    </span>
                                                </div>

                                                <div className="assignment-content">
                                                    <p className="assignment-message">{assignment.message}</p>

                                                    {assignment.data?.order_details && (
                                                        <div className="order-details">
                                                            <p><strong>📞</strong> {assignment.data.order_details.customer_phone}</p>
                                                            <p><strong>👥</strong> {assignment.data.order_details.guest_count} khách</p>
                                                            {assignment.data.order_details.has_pre_order && assignment.data.order_details.items?.length > 0 && (
                                                                <p><strong>🍽️</strong> {assignment.data.order_details.items.length} món đặt trước</p>
                                                            )}
                                                            {!assignment.data.order_details.has_pre_order && (
                                                                <p><strong>📅</strong> Đặt bàn (chưa order món)</p>
                                                            )}
                                                            {assignment.data.order_details.notes && (
                                                                <p><strong>📝</strong> {assignment.data.order_details.notes}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="assignment-actions">
                                                    {assignment.can_take && (
                                                        <button
                                                            onClick={() => handleClaimOrder(assignment.id)}
                                                            className="claim-btn"
                                                        >
                                                            ✋ Nhận đơn
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Đơn hàng của tôi */}
                                {myOrders.length > 0 && (
                                    <div className="orders-section">
                                        <h4>🔄 Đơn của tôi ({myOrders.length})</h4>
                                        {myOrders.map(assignment => (
                                            <div key={assignment.id} className="order-assignment-item processing">
                                                <div className="assignment-header">
                                                    <div className="assignment-title">
                                                        <span className="priority" style={{ color: getPriorityColor(assignment.priority) }}>
                                                            {getPriorityText(assignment.priority)}
                                                        </span>
                                                        <span className="my-order-badge">Của tôi</span>
                                                    </div>
                                                    <span className="assignment-time">
                                                        {formatDateTime(assignment.timestamp)}
                                                    </span>
                                                </div>

                                                <div className="assignment-content">
                                                    <p className="assignment-message">{assignment.message}</p>

                                                    {assignment.data?.order_details && (
                                                        <div className="order-details">
                                                            <p><strong>📞</strong> {assignment.data.order_details.customer_phone}</p>
                                                            <p><strong>👥</strong> {assignment.data.order_details.guest_count} khách</p>
                                                            {assignment.data.order_details.has_pre_order && assignment.data.order_details.items?.length > 0 && (
                                                                <p><strong>🍽️</strong> {assignment.data.order_details.items.length} món đặt trước</p>
                                                            )}
                                                            {!assignment.data.order_details.has_pre_order && (
                                                                <p><strong>📅</strong> Đặt bàn (chưa order món)</p>
                                                            )}
                                                            {assignment.data.order_details.notes && (
                                                                <p><strong>📝</strong> {assignment.data.order_details.notes}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="assignment-actions">
                                                    <button
                                                        onClick={() => handleCompleteOrder(assignment.id)}
                                                        className="complete-btn"
                                                    >
                                                        ✅ Hoàn thành
                                                    </button>
                                                    <button
                                                        onClick={() => handleReleaseOrder(assignment.id, 'Không thể xử lý')}
                                                        className="release-btn"
                                                    >
                                                        🔄 Trả lại
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {totalPending === 0 && !loading && (
                                    <div className="no-orders">
                                        <p>📭 Không có đơn hàng nào</p>
                                    </div>
                                )}
                                {loading && (
                                    <div className="loading">
                                        <p>⏳ Đang tải...</p>
                                    </div>
                                )}
                            </>
                        )}
                        {activeTab === 'completed_reservations' && (
                            <div className="orders-section">
                                <h4>🎉 Bàn sẵn sàng phục vụ ({completedReservations.length})</h4>
                                {completedReservations.length === 0 ? (
                                    <div className="no-orders">
                                        <p>📭 Không có bàn nào chờ phục vụ</p>
                                    </div>
                                ) : (
                                    completedReservations.map(res => (
                                        <div key={res.id + res.time} className="order-assignment-item completed-reservation">
                                            <div className="assignment-header">
                                                <div className="assignment-title">
                                                    <span className="assignment-type-icon">🎉</span>
                                                    <span>Bàn: {res.tables} đã sẵn sàng</span>
                                                </div>
                                                <span className="assignment-time">{formatDateTime(res.time)}</span>
                                            </div>
                                            <div className="assignment-content">
                                                <p><strong>Khách:</strong> {res.customer}</p>
                                                <p><strong>Số khách:</strong> {res.guest_count}</p>
                                                {res.note && <p><strong>Ghi chú:</strong> {res.note}</p>}
                                                <p className="ready-message">🛎️ Vui lòng mang món ra cho khách!</p>
                                                {res.items && res.items.length > 0 && (
                                                    <div className="order-items">
                                                        <h4>🍽️ Món ăn:</h4>
                                                        {res.items.map((item, idx) => (
                                                            <div key={idx} className="order-item">
                                                                {item.image && <img src={item.image} alt={item.name} className="item-image" />}
                                                                <span className="item-name">{item.name}</span>
                                                                <span className="item-quantity">x{item.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderAssignmentNotification; 