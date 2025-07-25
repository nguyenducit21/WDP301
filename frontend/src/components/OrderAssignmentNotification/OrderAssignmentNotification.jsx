import React, { useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/StoreContext';
import axios from '../../utils/axios.customize';
import './OrderAssignmentNotification.css';
import { useNavigate, useLocation } from 'react-router-dom';

const AUTO_REFRESH_INTERVAL = 15000;

const OrderAssignmentNotification = ({ isPage = false }) => {


    const getCurrentDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Thêm số 0 nếu cần
        const day = String(today.getDate()).padStart(2, '0'); // Thêm số 0 nếu cần
        return `${year}-${month}-${day}`; // Định dạng YYYY-MM-DD
    };

    const [orderAssignments, setOrderAssignments] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'completed_reservations'
    const [completedReservations, setCompletedReservations] = useState([]);
    const [showConfirmClear, setShowConfirmClear] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDate, setFilterDate] = useState(getCurrentDate()); // YYYY-MM-DD
    const [releaseReason, setReleaseReason] = useState('');
    const [showArrivedPopup, setShowArrivedPopup] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const { user } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);
    const navigate = useNavigate();
    const location = useLocation();


    // Nếu là popup và đang ở trang /order-assignments, không render để tránh lặp socket/thông báo
    if (!isPage && location.pathname.startsWith('/order-assignments')) {
        return null;
    }

    // Nếu là trang, luôn hiển thị panel
    const alwaysShowPanel = isPage;

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

            let title = '🛎️ Đặt bàn thành công';
            let icon = isPreOrder ? '🍽️' : '🛎️';
            let message = '';
            if (isPreOrder && data.order_details.items?.length > 0) {
                message += `\nKhách đã đặt trước ${data.order_details.items.length} món ăn.`;
            }
            message += `\nBàn: ${data.order_details.tables}`;

            const newAssignment = {
                id: data.assignment_id,
                type: data.order_details.reservation_type || 'new_order',
                title: title,
                message: message,
                data: data,
                timestamp: new Date(),
                status: 'processing',
                priority: data.priority,
                can_take: true,
                is_mine: false,
                icon: icon
            };

            setOrderAssignments(prev => [newAssignment, ...prev]);

            // Hiển thị browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Đặt bàn mới', {
                    body: message,
                    icon: '/favicon.ico',
                    tag: data.assignment_id
                });
            }

            // Hiển thị toast
            showToast(`Khách hàng ${data.order_details.customer_name} đã đặt bàn thành công. Vui lòng chuẩn bị bàn đúng giờ!`, 'info');
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
                        message: `${data.order_details.customer_name} - ${data.order_details.tables}`,
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

        // Lắng nghe reservation_reminder (15 phút trước giờ đến)
        newSocket.on('reservation_reminder', (data) => {
            showToast(
                `⏰ Bàn ${data.tables} sẽ có khách đến trong 15 phút nữa (${data.slot_time}). Vui lòng chuẩn bị bàn!`,
                'warning'
            );
            // Nếu muốn, có thể push vào danh sách orderAssignments ở đây
        });

        // Load pending orders khi component mount
        loadPendingOrders();

        // Auto refresh interval
        let interval;
        if (showPanel) {
            interval = setInterval(() => {
                loadPendingOrders();
            }, AUTO_REFRESH_INTERVAL);
        }
        return () => {
            if (interval) clearInterval(interval);
            if (socket) socket.close();
        };
    }, [user, showPanel]);

    const loadPendingOrders = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/order-assignments/pending');

            if (response.data.success) {
                const formattedAssignments = response.data.data.map(assignment => ({
                    id: assignment.assignment_id,
                    type: 'existing_order',
                    title: assignment.status === 'processing' ? '⏳ Đơn đang chờ' : '🔄 Đơn đang xử lý',
                    message: `${assignment.order_details.customer_name} - ${assignment.order_details.tables}`,
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
                    assigned_to: assignment.assigned_to,
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

    // Tìm kiếm và lọc
    const filteredAssignments = orderAssignments.filter(a => {
        const matchSearch =
            (a.data?.order_details?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.data?.order_details?.tables?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.data?.order_details?.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchStatus =
            filterStatus === 'all' ||
            (filterStatus === 'processing' && a.status === 'processing') ||
            (filterStatus === 'completed' && a.status === 'completed');
        let matchDate = true;
        if (filterDate) {
            // order_details.date là ISO string hoặc Date object
            const orderDate = a.data?.order_details?.date;
            if (orderDate) {
                const d = new Date(orderDate);
                const dStr = d.toISOString().slice(0, 10);
                matchDate = dStr === filterDate;
            } else {
                matchDate = false;
            }
        }
        return matchSearch && matchStatus && matchDate;
    });

    const waitingOrders = filteredAssignments.filter(o =>
        o.status === 'processing' &&
        o.data?.order_details?.status !== 'completed'
    );
    const myOrders = filteredAssignments.filter(o => o.is_mine && o.status === 'processing');
    const cookedOrders = filteredAssignments.filter(o => o.data?.order_details?.status === 'cooked');
    const totalPending = waitingOrders.length + myOrders.length;

    // Thêm hàm xóa tất cả thông báo
    const handleClearAllNotifications = () => {
        setOrderAssignments([]);
        setCompletedReservations([]);
        setShowConfirmClear(false);
        showToast('Đã xóa tất cả thông báo', 'success');
    };

    // Xác nhận trước khi hoàn thành/trả lại đơn
    const handleActionWithConfirm = (type, assignmentId) => {
        // setShowConfirmAction({ show: true, type, assignmentId }); // Removed
        // if (type === 'release') setReleaseReason(''); // Removed
    };
    // const handleConfirmAction = async () => { // Removed
    //     if (showConfirmAction.type === 'complete') { // Removed
    //         await handleCompleteOrder(showConfirmAction.assignmentId); // Removed
    //     } else if (showConfirmAction.type === 'release') { // Removed
    //         await handleReleaseOrder(showConfirmAction.assignmentId, releaseReason); // Removed
    //     } // Removed
    //     setShowConfirmAction({ show: false, type: '', assignmentId: null }); // Removed
    //     setReleaseReason(''); // Removed
    // }; // Removed
    // const handleCancelConfirm = () => { // Removed
    //     setShowConfirmAction({ show: false, type: '', assignmentId: null }); // Removed
    //     setReleaseReason(''); // Removed
    // }; // Removed

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

    // Thêm hàm getSlotDisplayText nội bộ nếu chưa có
    const getSlotDisplayText = (slot) => {
        if (!slot) return '';
        if (typeof slot === 'object') {
            // Nếu slot là object đã populate
            return slot.name ? `${slot.name} (${slot.start_time}-${slot.end_time})` : `${slot.start_time}-${slot.end_time}`;
        }
        // Nếu slot là string, chỉ trả về chuỗi
        return slot;
    };

    // Hàm mở popup xác nhận khách đã đến
    const handleShowArrived = (assignment) => {
        setSelectedAssignment(assignment);
        setShowArrivedPopup(true);
    };
    const handleConfirmArrived = async () => {
        if (selectedAssignment) {
            const assignmentId = selectedAssignment.id;
            try {
                const res = await axios.post(`/order-assignments/${assignmentId}/confirm-arrived`);
                if (res.data.success) {
                    showToast(`Đã xác nhận khách đã đến bàn ${selectedAssignment.data?.order_details?.tables || ''}`, 'success');
                    navigate('/waiter/reservation-management', {
                        state: {
                            statusFilter: 'seated',
                            reservationId: selectedAssignment.data?.order_details?.reservation_id
                        }
                    });
                } else {
                    showToast(res.data.message || 'Có lỗi khi xác nhận khách đã đến', 'error');
                }
            } catch (err) {
                showToast(err.response?.data?.message || 'Có lỗi khi xác nhận khách đã đến', 'error');
            }
        }
        setShowArrivedPopup(false);
        setSelectedAssignment(null);
    };
    const handleCancelArrived = () => {
        setShowArrivedPopup(false);
        setSelectedAssignment(null);
    };

    // Không hiển thị nếu không phải staff
    if (!user?.user?.role || !['waiter', 'kitchen_staff', 'manager', 'admin'].includes(user.user.role)) {
        return null;
    }

    // Nếu là trang, luôn show panel, không cần nút đóng/mở
    return (
        <div className={isPage ? "order-assignments-page-container" : "order-assignment-notification"}>
            {/* Notification Button (Floating) */}
            {!isPage && (
                <div className="notification-fab" onClick={() => setShowPanel(!showPanel)}>
                    <span className="fab-icon">📋</span>
                    {(totalPending > 0 || completedReservations.length > 0) && (
                        <span className="fab-badge">{totalPending + completedReservations.length}</span>
                    )}
                    <span className={`fab-status ${isConnected ? 'connected' : 'disconnected'}`}></span>
                </div>
            )}
            {(isPage || showPanel) && (
                <div className={isPage ? "notification-panel modern-panel page-panel" : "notification-panel modern-panel"}>
                    {/* Header */}
                    <div className="panel-header-modern">
                        <div className="panel-header-left">
                            <span className="panel-header-icon">📋</span>
                            <span className="panel-header-title">Thông báo đơn hàng</span>
                        </div>
                        <div className="panel-header-actions">
                            <button className="panel-clear-btn" title="Xóa tất cả" onClick={() => setShowConfirmClear(true)}>
                                <span>🗑️</span>
                            </button>
                            {!isPage && (
                                <button className="panel-close-btn" title="Đóng" onClick={() => setShowPanel(false)}>
                                    <span>✖️</span>
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Tabs */}
                    <div className="notification-tabs-modern">
                        <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Đơn chờ</button>
                        <button className={activeTab === 'completed_reservations' ? 'active' : ''} onClick={() => setActiveTab('completed_reservations')}>Bàn sẵn sàng</button>
                    </div>
                    {/* Search & Filter */}
                    <div className="search-filter-bar-modern">
                        <input
                            type="text"
                            placeholder="Tìm kiếm khách, SĐT, bàn..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="search-input-modern"
                        />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            className="filter-date-modern"
                        />
                    </div>
                    {/* Panel Content */}
                    <div className="panel-content-modern">
                        {activeTab === 'orders' && (
                            <>
                                {/* Đơn hàng đang chờ */}
                                {waitingOrders.length > 0 && (
                                    <div className="orders-section-modern">
                                        {waitingOrders.map(assignment => (
                                            <div
                                                key={assignment.id}
                                                className={`order-card-modern waiting${assignment.is_mine ? ' my-order' : ''}`}
                                                tabIndex={0}
                                                title="Xem chi tiết đơn"
                                                onClick={() => handleShowArrived(assignment)}
                                            >
                                                <div className="order-card-header">
                                                    <span className="order-card-avatar">{assignment.icon || '🛎️'}</span>
                                                    <div className="order-card-info">
                                                        <span className="order-card-title">{assignment.title}</span>
                                                        <span className="order-card-time">{formatDateTime(assignment.timestamp)}</span>
                                                    </div>
                                                    <span className={`order-card-priority priority-${assignment.priority}`}>{getPriorityText(assignment.priority)}</span>
                                                </div>
                                                <div className="order-card-body">
                                                    <div className="order-card-message">{assignment.message}</div>
                                                    {assignment.data?.order_details && (
                                                        <div className="order-card-details">
                                                            <span>👤 {assignment.data.order_details.customer_name}</span>
                                                            <span>📞 {assignment.data.order_details.customer_phone}</span>
                                                            <span>👥 {assignment.data.order_details.guest_count} khách</span>
                                                            {assignment.data.order_details.date && (
                                                                <span>🕒 {new Date(assignment.data.order_details.date).toLocaleDateString('vi-VN')} - {assignment.data.order_details.slot_start_time || 'Chưa rõ'}</span>
                                                            )}
                                                            {assignment.data.order_details.has_pre_order && assignment.data.order_details.items?.length > 0 && (
                                                                <div className="order-card-preorder">
                                                                    <span>🍽️ {assignment.data.order_details.items.length} món đặt trước</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Đơn đã nấu xong */}
                                {/* {cookedOrders.length > 0 && (
                                    <div className="orders-section-modern">
                                        <div className="my-orders-title">👨‍🍳 Đơn đã nấu xong ({cookedOrders.length})</div>
                                        {cookedOrders.map(assignment => (
                                            <div
                                                key={assignment.id}
                                                className="order-card-modern cooked-order"
                                                tabIndex={0}
                                                title="Xem chi tiết đơn"
                                                onClick={() => handleShowArrived(assignment)}
                                            >
                                                <div className="order-card-header">
                                                    <span className="order-card-avatar">👨‍🍳</span>
                                                    <div className="order-card-info">
                                                        <span className="order-card-title">{assignment.title}</span>
                                                        <span className="order-card-time">{formatDateTime(assignment.timestamp)}</span>
                                                    </div>
                                                    <span className={`order-card-priority priority-${assignment.priority}`}>{getPriorityText(assignment.priority)}</span>
                                                </div>
                                                <div className="order-card-body">
                                                    <div className="order-card-message">{assignment.message}</div>
                                                    {assignment.data?.order_details && (
                                                        <div className="order-card-details">
                                                            <span>👤 {assignment.data.order_details.customer_name}</span>
                                                            <span>📞 {assignment.data.order_details.customer_phone}</span>
                                                            <span>👥 {assignment.data.order_details.guest_count} khách</span>
                                                            {assignment.data.order_details.has_pre_order && assignment.data.order_details.items?.length > 0 && (
                                                                <div className="order-card-preorder">
                                                                    <span>🍽️ {assignment.data.order_details.items.length} món đặt trước</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )} */}
                                {/* Đơn hàng của tôi */}
                                {myOrders.length > 0 && (
                                    <div className="orders-section-modern">
                                        <div className="my-orders-title">🔄 Đơn của tôi ({myOrders.length})</div>
                                        {myOrders.map(assignment => (
                                            <div
                                                key={assignment.id}
                                                className="order-card-modern processing my-order"
                                                tabIndex={0}
                                                title="Xem chi tiết đơn"
                                                onClick={() => handleShowArrived(assignment)}
                                            >
                                                <div className="order-card-header">
                                                    <span className="order-card-avatar">{assignment.icon || '🛎️'}</span>
                                                    <div className="order-card-info">
                                                        <span className="order-card-title">{assignment.title}</span>
                                                        <span className="order-card-time">{formatDateTime(assignment.timestamp)}</span>
                                                    </div>
                                                    <span className={`order-card-priority priority-${assignment.priority}`}>{getPriorityText(assignment.priority)}</span>
                                                    <span className="my-order-badge-modern">Của tôi</span>
                                                </div>
                                                <div className="order-card-body">
                                                    <div className="order-card-message">{assignment.message}</div>
                                                    {assignment.data?.order_details && (
                                                        <div className="order-card-details">
                                                            <span>👤 {assignment.data.order_details.customer_name}</span>
                                                            <span>📞 {assignment.data.order_details.customer_phone}</span>
                                                            <span>👥 {assignment.data.order_details.guest_count} khách</span>
                                                            {assignment.data.order_details.has_pre_order && assignment.data.order_details.items?.length > 0 && (
                                                                <div className="order-card-preorder">
                                                                    <span>🍽️ {assignment.data.order_details.items.length} món đặt trước</span>
                                                                </div>
                                                            )}
                                                            {!assignment.data.order_details.has_pre_order && (
                                                                <span>📅 Đặt bàn (chưa order món)</span>
                                                            )}
                                                            {assignment.data.order_details.notes && (
                                                                <span>📝 {assignment.data.order_details.notes}</span>
                                                            )}
                                                            {assignment.data.order_details.payment_status && (
                                                                <span className={assignment.data.order_details.payment_status === 'paid' ? 'paid-status-modern' : 'unpaid-status-modern'}>{assignment.data.order_details.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="order-card-actions">
                                                    {assignment.is_mine && assignment.status === 'processing' && (
                                                        <>
                                                            <button className="order-card-btn complete" onClick={e => { e.stopPropagation(); handleActionWithConfirm('complete', assignment.id); }}>Hoàn thành</button>
                                                            <button className="order-card-btn release" onClick={e => { e.stopPropagation(); handleActionWithConfirm('release', assignment.id); }}>Trả lại</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {totalPending === 0 && cookedOrders.length === 0 && !loading && (
                                    <div className="no-orders-modern">
                                        <span>📭 Không có đơn hàng nào</span>
                                    </div>
                                )}
                                {loading && (
                                    <div className="loading-modern">
                                        <span>⏳ Đang tải...</span>
                                    </div>
                                )}
                            </>
                        )}
                        {activeTab === 'completed_reservations' && (
                            <div className="orders-section-modern">
                                <div className="my-orders-title">🎉 Bàn sẵn sàng phục vụ ({completedReservations.length})</div>
                                {completedReservations.length === 0 ? (
                                    <div className="no-orders-modern">
                                        <span>📭 Không có bàn nào chờ phục vụ</span>
                                    </div>
                                ) : (
                                    completedReservations.map(res => (
                                        <div key={res.id + res.time} className="order-card-modern completed-reservation">
                                            <div className="order-card-header">
                                                <span className="order-card-avatar">🎉</span>
                                                <div className="order-card-info">
                                                    <span className="order-card-title">Bàn: {res.tables} đã sẵn sàng</span>
                                                    <span className="order-card-time">{formatDateTime(res.time)}</span>
                                                </div>
                                            </div>
                                            <div className="order-card-body">
                                                <span>👤 {res.customer}</span>
                                                <span>👥 {res.guest_count}</span>
                                                {res.note && <span>📝 {res.note}</span>}
                                                <span className="ready-message-modern">🛎️ Vui lòng mang món ra cho khách!</span>
                                                {res.items && res.items.length > 0 && (
                                                    <div className="order-card-preorder">
                                                        <span>🍽️ Món ăn:</span>
                                                        <ul className="order-card-items-list">
                                                            {res.items.map((item, idx) => (
                                                                <li key={idx} className="order-card-item">
                                                                    {item.image && <img src={item.image} alt={item.name} className="item-image-modern" />}
                                                                    <span className="item-name-modern">{item.name}</span>
                                                                    <span className="item-quantity-modern">x{item.quantity}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    {/* Popup xác nhận xóa */}
                    {showConfirmClear && (
                        <div className="confirm-clear-overlay-modern">
                            <div className="confirm-clear-modal-modern">
                                <span className="modal-title">Xóa tất cả thông báo?</span>
                                <div className="confirm-clear-actions-modern">
                                    <button className="modal-btn confirm" onClick={handleClearAllNotifications}>Xác nhận</button>
                                    <button className="modal-btn cancel" onClick={() => setShowConfirmClear(false)}>Hủy</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Popup xác nhận khách đã đến */}
                    {showArrivedPopup && selectedAssignment && (
                        <div className="confirm-clear-overlay-modern">
                            <div className="confirm-clear-modal-modern">
                                <span className="modal-title">Xác nhận khách đã đến bàn?</span>
                                <div className="modal-content">
                                    <span><strong>Bàn:</strong> {selectedAssignment.data?.order_details?.tables}</span>
                                    <span><strong>Khách:</strong> {selectedAssignment.data?.order_details?.customer_name}</span>
                                    <span><strong>Số khách:</strong> {selectedAssignment.data?.order_details?.guest_count}</span>
                                    <span><strong>Giờ đến:</strong> {selectedAssignment.data?.order_details?.slot_start_time} - {selectedAssignment.data?.order_details?.slot_end_time}</span>
                                    {/* Hiển thị món đặt trước nếu có */}
                                    {selectedAssignment.data?.order_details?.has_pre_order && Array.isArray(selectedAssignment.data?.order_details?.items) && selectedAssignment.data.order_details.items.length > 0 && (
                                        <div className="order-card-preorder">
                                            <span>
                                                🍽️ Món khách đặt trước:
                                                {selectedAssignment.data.order_details.status === 'cooked' && (
                                                    <span className="cooked-status"> (Đã nấu xong)</span>
                                                )}
                                            </span>
                                            <ul className="order-card-items-list">
                                                {selectedAssignment.data.order_details.items.map((item, idx) => (
                                                    <li key={idx} className="order-card-item">
                                                        {item.menu_item_id?.image && (
                                                            <img src={item.menu_item_id.image} alt={item.menu_item_id.name} className="item-image-modern" />
                                                        )}
                                                        <span className="item-name-modern">{item.menu_item_id?.name}</span>
                                                        <span className="item-quantity-modern">x{item.quantity || 1}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                <div className="confirm-clear-actions-modern">
                                    <button className="modal-btn confirm" onClick={handleConfirmArrived}>Xác nhận</button>
                                    <button className="modal-btn cancel" onClick={handleCancelArrived}>Hủy</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrderAssignmentNotification; 