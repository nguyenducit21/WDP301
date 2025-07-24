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
    const [filterStatus, setFilterStatus] = useState('all'); // all | waiting | processing | completed
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
            let message = `Khách hàng ${data.order_details.customer_name} đã đặt bàn thành công. Vui lòng chuẩn bị bàn đúng giờ!`;
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
                status: 'waiting',
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
                    title: assignment.status === 'waiting' ? '⏳ Đơn đang chờ' : '🔄 Đơn đang xử lý',
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
            (filterStatus === 'waiting' && a.status === 'waiting') ||
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

    const waitingOrders = filteredAssignments.filter(o => o.status === 'waiting');
    const myOrders = filteredAssignments.filter(o => o.is_mine && o.status === 'processing');
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
                    navigate('/waiter/reservation-management', { state: { statusFilter: 'seated' } });
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
            {!isPage && (
                <div className="notification-button" onClick={() => setShowPanel(!showPanel)}>
                    <div className="notification-icon">
                        📋
                        {(totalPending > 0 || completedReservations.length > 0) && (
                            <span className="notification-badge">{totalPending + completedReservations.length}</span>
                        )}
                    </div>
                    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>{isConnected ? '🟢' : '🔴'}</div>
                </div>
            )}
            {(isPage || showPanel) && (
                <div className={isPage ? "notification-panel page-panel" : "notification-panel"}>

                    {/* Popup xác nhận xóa */}
                    {showConfirmClear && (
                        <div className="confirm-clear-overlay">
                            <div className="confirm-clear-modal">
                                <p>Bạn có chắc chắn muốn xóa tất cả thông báo?</p>
                                <div className="confirm-clear-actions">
                                    <button className="confirm-btn" onClick={handleClearAllNotifications}>Xác nhận</button>
                                    <button className="cancel-btn" onClick={() => setShowConfirmClear(false)}>Hủy</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Popup xác nhận hoàn thành/trả lại */}
                    {/* Removed */}

                    {/* Tìm kiếm và lọc */}
                    <div className="search-filter-bar">
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên khách, số điện thoại hoặc bàn..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            className="filter-date"
                            style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #bdbdbd', fontSize: '1rem', background: '#fff', marginLeft: 8, marginRight: 8 }}
                        />


                    </div>
                    <div className="panel-content">
                        {activeTab === 'orders' && (
                            <>
                                {/* Đơn hàng đang chờ */}
                                {waitingOrders.length > 0 && (
                                    <div className="orders-section">
                                        {waitingOrders.map(assignment => (
                                            <div
                                                key={assignment.id}
                                                className={`order-assignment-item waiting${assignment.is_mine ? ' my-order' : ''}`}
                                                tabIndex={0}
                                                title="Xem chi tiết đơn"
                                                onClick={() => handleShowArrived(assignment)}
                                            >
                                                <div className="assignment-header">
                                                    <div className="assignment-title">
                                                        <span className="assignment-type-icon">
                                                            {assignment.icon || ''}
                                                        </span>
                                                        <span className="priority" style={{ color: getPriorityColor(assignment.priority) }}>
                                                            {getPriorityText(assignment.priority)}
                                                        </span>
                                                        {assignment.is_mine && <span className="my-order-badge">Của tôi</span>}
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
                                                            {/* Thời gian khách đến nhận bàn: ngày + slot name + giờ */}
                                                            {assignment.data.order_details.date && (
                                                                <p>
                                                                    <strong>🕒</strong> Thời gian đến: {new Date(assignment.data.order_details.date).toLocaleDateString('vi-VN')}
                                                                    {assignment.data.order_details.slot ?
                                                                        ` - ${getSlotDisplayText(assignment.data.order_details.slot)}` :
                                                                        assignment.data.order_details.slot_start_time ? ` - ${assignment.data.order_details.slot_start_time}` : ''}
                                                                </p>
                                                            )}
                                                            {assignment.data.order_details.has_pre_order && assignment.data.order_details.items?.length > 0 && (
                                                                <div className="preorder-items-list">
                                                                    <p><strong>🍽️</strong> {assignment.data.order_details.items.length} món đặt trước:</p>
                                                                    <ul>
                                                                        {assignment.data.order_details.items.map((item, idx) => (
                                                                            <li key={idx} className="preorder-item">
                                                                                {item.menu_item_id?.image && <img src={item.menu_item_id.image} alt={item.menu_item_id.name} className="item-image-mini" />}
                                                                                <span className="item-name">{item.menu_item_id?.name || 'Món'}</span>
                                                                                <span className="item-quantity">x{item.quantity}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {!assignment.data.order_details.has_pre_order && (
                                                                <p><strong>📅</strong> Đặt bàn (chưa order món)</p>
                                                            )}
                                                            {assignment.data.order_details.notes && (
                                                                <p><strong>📝</strong> {assignment.data.order_details.notes}</p>
                                                            )}
                                                            {assignment.data.order_details.payment_status && (
                                                                <p><strong>💵</strong> Trạng thái thanh toán: <span className={assignment.data.order_details.payment_status === 'paid' ? 'paid-status' : 'unpaid-status'}>{assignment.data.order_details.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="assignment-actions"></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Đơn hàng của tôi */}
                                {myOrders.length > 0 && (
                                    <div className="orders-section">
                                        <h4>🔄 Đơn của tôi ({myOrders.length})</h4>
                                        {myOrders.map(assignment => (
                                            <div
                                                key={assignment.id}
                                                className="order-assignment-item processing my-order"
                                                tabIndex={0}
                                                title="Xem chi tiết đơn"
                                                onClick={() => handleShowArrived(assignment)}
                                            >
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
                                                                <div className="preorder-items-list">
                                                                    <p><strong>🍽️</strong> {assignment.data.order_details.items.length} món đặt trước:</p>
                                                                    <ul>
                                                                        {assignment.data.order_details.items.map((item, idx) => (
                                                                            <li key={idx} className="preorder-item">
                                                                                {item.menu_item_id?.image && <img src={item.menu_item_id.image} alt={item.menu_item_id.name} className="item-image-mini" />}
                                                                                <span className="item-name">{item.menu_item_id?.name || 'Món'}</span>
                                                                                <span className="item-quantity">x{item.quantity}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {!assignment.data.order_details.has_pre_order && (
                                                                <p><strong>📅</strong> Đặt bàn (chưa order món)</p>
                                                            )}
                                                            {assignment.data.order_details.notes && (
                                                                <p><strong>📝</strong> {assignment.data.order_details.notes}</p>
                                                            )}
                                                            {assignment.data.order_details.payment_status && (
                                                                <p><strong>💵</strong> Trạng thái thanh toán: <span className={assignment.data.order_details.payment_status === 'paid' ? 'paid-status' : 'unpaid-status'}>{assignment.data.order_details.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="assignment-actions"></div>
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
                    {/* Popup xác nhận khách đã đến */}
                    {showArrivedPopup && selectedAssignment && (
                        <div className="confirm-clear-overlay">
                            <div className="confirm-clear-modal">
                                <h3>Xác nhận khách đã đến bàn?</h3>
                                <div style={{ margin: '16px 0', textAlign: 'left', fontSize: '1rem' }}>
                                    <p><strong>Bàn:</strong> {selectedAssignment.data?.order_details?.tables}</p>
                                    <p><strong>Khách:</strong> {selectedAssignment.data?.order_details?.customer_name}</p>
                                    <p><strong>Số khách:</strong> {selectedAssignment.data?.order_details?.guest_count}</p>
                                    <p><strong>Giờ đến:</strong> {selectedAssignment.data?.order_details?.slot_start_time} - {selectedAssignment.data?.order_details?.slot_end_time}</p>
                                </div>
                                <div className="confirm-clear-actions">
                                    <button className="confirm-btn" onClick={handleConfirmArrived}>Xác nhận</button>
                                    <button className="cancel-btn" onClick={handleCancelArrived}>Hủy</button>
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