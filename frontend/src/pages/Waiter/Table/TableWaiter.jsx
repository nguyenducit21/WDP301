import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AuthContext } from '../../../context/AuthContext';
import '../../../pages/TableManagement/TableLayout.css';
import axios from '../../../utils/axios.customize';
import MenuModal from '../../../components/Reservation/MenuModal/MenuModal';

const TableWaiter = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    // States cho sơ đồ bàn
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [tables, setTables] = useState([]);
    const [allTables, setAllTables] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('');
    const [formData, setFormData] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [orders, setOrders] = useState([]);
    const [bookingSlots, setBookingSlots] = useState([]);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [menuModalTable, setMenuModalTable] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [loadingMenu, setLoadingMenu] = useState(false);
    const [preOrderItems, setPreOrderItems] = useState([]);

    // Notification states
    const [notifications, setNotifications] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);

    // Date selector state
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().slice(0, 10);
    });

    const tablesPerPage = 10;

    // Utility functions
    const safeGet = (obj, path, defaultValue = null) => {
        try {
            return path.split('.').reduce((o, p) => o && o[p], obj) || defaultValue;
        } catch {
            return defaultValue;
        }
    };

    const getReservationStatusLabel = (status) => {
        const statusMap = {
            'pending': 'Chờ xác nhận',
            'confirmed': 'Đã xác nhận',
            'seated': 'Đã vào bàn',
            'cancelled': 'Đã hủy',
            'no_show': 'Không đến',
            'completed': 'Đã hoàn thành'
        };
        return statusMap[status] || status;
    };

    const getTableStatusLabel = (status) => {
        const statusMap = {
            'available': 'Bàn trống',
            'reserved': 'Đã đặt',
            'occupied': 'Đang phục vụ',
            // 'cleaning': 'Đang dọn',
            'maintenance': 'Bảo trì'
        };
        return statusMap[status] || status;
    };

    // Authorization check
    useEffect(() => {
        if (user !== null && user !== undefined) {
            const userRole = safeGet(user, 'user.role') || safeGet(user, 'role');
            const allowedRoles = ['admin', 'waiter', 'manager', 'staff'];
            if (!userRole || !allowedRoles.includes(userRole)) {
                navigate('/login');
            }
        }
    }, [user, navigate]);

    // API Functions
    const loadAreas = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/areas');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                const validAreas = response.data.data.filter(area => area && area._id);
                setAreas(validAreas);
                if (validAreas.length > 0 && !selectedArea) {
                    setSelectedArea(validAreas[0]._id);
                }
            }
        } catch (error) {
            setError('Lỗi khi tải danh sách khu vực');
        } finally {
            setLoading(false);
        }
    }, [selectedArea]);

    const loadAllTables = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/tables?limit=1000');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                const validTables = response.data.data.filter(table =>
                    table && table._id && table.area_id
                );
                setAllTables(validTables);
            }
        } catch (error) {
            setError('Lỗi khi tải danh sách bàn');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadReservations = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/reservations?limit=1000&sort=-created_at');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                const validReservations = response.data.data.filter(res => res && res._id);
                setReservations(validReservations);
            }
        } catch (error) {
            setError('Lỗi khi tải danh sách đặt bàn');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadOrders = useCallback(async () => {
        try {
            const response = await axios.get('/orders?limit=1000&sort=-created_at');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                const validOrders = response.data.data.filter(order =>
                    order && order._id && order.table_id
                );
                setOrders(validOrders);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }, []);

    const loadBookingSlots = useCallback(async () => {
        try {
            const response = await axios.get('/booking-slots');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                setBookingSlots(response.data.data);
            }
        } catch (error) {
            console.error('Error loading booking slots:', error);
        }
    }, []);

    // Load initial data
    useEffect(() => {
        const initializeData = async () => {
            await Promise.all([
                loadAreas(),
                loadAllTables(),
                loadOrders(),
                loadReservations(),
                loadBookingSlots()
            ]);
        };
        initializeData();
    }, [loadAreas, loadAllTables, loadOrders, loadReservations, loadBookingSlots]);

    // WebSocket for notifications
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const newSocket = io('http://localhost:3000');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setIsConnected(true);
            newSocket.emit('join-waiter-room');
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });

        newSocket.on('new_reservation', (data) => {
            const newNotification = {
                id: Date.now(),
                type: 'new_reservation',
                title: '🆕 Đặt bàn mới',
                message: `Khách hàng ${data.reservation.customer_name} vừa đặt bàn`,
                data: data.reservation,
                timestamp: new Date(),
                read: false
            };

            setNotifications(prev => [newNotification, ...prev]);

            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Đặt bàn mới', {
                    body: `Khách hàng ${data.reservation.customer_name} vừa đặt bàn ${data.reservation.tables}`,
                    icon: '/favicon.ico'
                });
            }

            loadReservations();
        });

        return () => {
            newSocket.close();
        };
    }, [loadReservations]);

    // Filter tables by area
    useEffect(() => {
        if (selectedArea && allTables.length > 0) {
            const filteredTables = allTables.filter(table => {
                const tableAreaId = typeof table.area_id === 'string'
                    ? table.area_id
                    : safeGet(table, 'area_id._id');
                return tableAreaId === selectedArea;
            });

            const tablesWithUpdatedStatus = filteredTables.map(table => {
                const reservationsForSelectedDate = reservations.filter(res => {
                    const resDate = new Date(res.date).toISOString().split('T')[0];
                    return resDate === selectedDate;
                });

                // Helper function để kiểm tra table có trong reservation không
                const isTableInReservation = (reservation, tableId) => {
                    // Kiểm tra table_ids (multiple tables)
                    if (reservation.table_ids && Array.isArray(reservation.table_ids)) {
                        return reservation.table_ids.some(t =>
                            (typeof t === 'object' ? t._id : t) === tableId
                        );
                    }
                    // Kiểm tra table_id đơn
                    return (safeGet(reservation, 'table_id._id') || reservation.table_id) === tableId;
                };

                const reservationIds = reservationsForSelectedDate
                    .filter(res => isTableInReservation(res, table._id))
                    .map(res => res._id);

                const hasActiveOrder = orders.some(order =>
                    (safeGet(order, 'table_id._id') || order.table_id) === table._id &&
                    ['pending', 'preparing', 'served'].includes(order.status) &&
                    (reservationIds.includes(order.reservation_id) ||
                        reservationIds.includes(safeGet(order, 'reservation_id._id')))
                );

                // Kiểm tra trạng thái reservation cho bàn này
                const tableReservations = reservationsForSelectedDate.filter(res =>
                    isTableInReservation(res, table._id)
                );

                let status = table.status;

                // Ưu tiên theo thứ tự: seated > pending/confirmed > completed/cancelled
                const hasSeatedReservation = tableReservations.some(res => res.status === 'seated');
                const hasPendingOrConfirmedReservation = tableReservations.some(res =>
                    ['pending', 'confirmed'].includes(res.status)
                );

                if (hasSeatedReservation || hasActiveOrder) {
                    // Khi có reservation seated hoặc có order đang hoạt động -> đang phục vụ
                    status = 'occupied';
                } else if (hasPendingOrConfirmedReservation) {
                    // Khi có reservation pending/confirmed -> đã đặt
                    status = 'reserved';
                } else if (table.status !== 'maintenance') {
                    // Khi không có reservation hoặc reservation đã completed/cancelled -> trống
                    status = 'available';
                }

                return { ...table, status };
            });

            const totalPages = Math.max(1, Math.ceil(tablesWithUpdatedStatus.length / tablesPerPage));
            const startIndex = (currentPage - 1) * tablesPerPage;
            const endIndex = startIndex + tablesPerPage;
            const currentTables = tablesWithUpdatedStatus.slice(startIndex, endIndex);

            setTables(currentTables);
            setTotalPages(totalPages);

            if (currentPage > totalPages && totalPages > 0) {
                setCurrentPage(totalPages);
            }
        }
    }, [selectedArea, allTables, currentPage, reservations, orders, selectedDate]);

    // Helper functions
    const hasActiveReservations = useCallback((tableId) => {
        return reservations.some(res => {
            // Kiểm tra multiple tables
            const isTableInRes = res.table_ids && Array.isArray(res.table_ids)
                ? res.table_ids.some(t => (typeof t === 'object' ? t._id : t) === tableId)
                : (safeGet(res, 'table_id._id') || res.table_id) === tableId;

            return isTableInRes &&
                ['confirmed', 'pending', 'seated'].includes(res.status) &&
                new Date(res.date).toISOString().split('T')[0] === selectedDate;
        });
    }, [reservations, selectedDate]);

    const getTableReservations = (tableId) => {
        if (!tableId || !Array.isArray(reservations)) return [];
        return reservations.filter(res => {
            if (!res) return false;

            // Kiểm tra multiple tables
            const isTableInRes = res.table_ids && Array.isArray(res.table_ids)
                ? res.table_ids.some(t => (typeof t === 'object' ? t._id : t) === tableId)
                : (safeGet(res, 'table_id._id') || res.table_id) === tableId;

            return isTableInRes &&
                ['confirmed', 'pending', 'seated'].includes(res.status) &&
                new Date(res.date).toISOString().split('T')[0] === selectedDate;
        });
    };

    const getTableOrders = useCallback((tableId) => {
        if (!tableId || !orders.length) return [];
        return orders.filter(order =>
            (safeGet(order, 'table_id._id') || order.table_id) === tableId
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [orders]);

    const getAreaName = (areaId) => {
        if (!areaId || !Array.isArray(areas)) return 'N/A';
        const area = areas.find(a => a && a._id === areaId);
        return area?.name || 'N/A';
    };

    const getStaffName = (reservation) => {
        if (!reservation) return 'N/A';
        const createdByStaff = reservation.created_by_staff;
        if (!createdByStaff) return 'Khách tự đặt';
        const staffName = safeGet(createdByStaff, 'full_name') ||
            safeGet(createdByStaff, 'username') || 'Nhân viên';
        return `Nhân viên: ${staffName}`;
    };

    const getSlotDisplayText = (slot_id) => {
        if (!slot_id || !bookingSlots.length) return '';
        const slot = bookingSlots.find(s => s._id === slot_id);
        if (!slot) return '';
        return slot.name ?
            `${slot.name} (${slot.start_time}-${slot.end_time})` :
            `${slot.start_time}-${slot.end_time}`;
    };

    const getTimeDisplayText = (reservation) => {
        // Nếu là khách vãng lai (có current_time), hiển thị giờ hiện tại
        if (reservation.current_time && reservation.contact_name === 'Khách vãng lai') {
            return reservation.current_time;
        }
        // Nếu có slot_id, hiển thị slot thời gian
        if (reservation.slot_id) {
            return getSlotDisplayText(safeGet(reservation, 'slot_id._id') || reservation.slot_id);
        }
        // Fallback
        return 'N/A';
    };

    // Event handlers
    const handleAreaChange = (areaId) => {
        setSelectedArea(areaId);
        setCurrentPage(1);
        setSelectedTable(null);
        setError('');
    };

    const handleDateChange = (date) => {
        setSelectedDate(date);
        setCurrentPage(1);
        setSelectedTable(null);
        setError('');
    };

    const handleTableClick = async (table) => {
        if (!table || !table._id) return;
        setSelectedTable(table);
        // Nếu bàn trống thì mở modal chọn món
        if (table.status === 'available') {
            setMenuModalTable(table);
            setShowMenuModal(true);
            setPreOrderItems([]);
        }
    };

    // Hàm xử lý chọn món (cập nhật preOrderItems)
    const handleMenuItemChange = (menuItemId, quantity) => {
        setPreOrderItems(prev => {
            const updated = prev.filter(item => item.menu_item_id !== menuItemId);
            if (quantity > 0) {
                updated.push({ menu_item_id: menuItemId, quantity });
            }
            return updated;
        });
    };
    const calculatePreOrderTotal = () => {
        return preOrderItems.reduce((total, item) => {
            const menuItem = menuItems.find(m => m._id === item.menu_item_id);
            return total + ((menuItem?.price || 0) * item.quantity);
        }, 0);
    };
    const getSelectedItemsCount = () => preOrderItems.reduce((sum, item) => sum + item.quantity, 0);
    const getFilteredMenuItems = (cat) => {
        if (!cat || cat === 'All') return menuItems;
        return menuItems.filter(item => item.category_id === cat || item.category_id?._id === cat);
    };
    const getItemQuantity = (menuItemId) => {
        const found = preOrderItems.find(i => i.menu_item_id === menuItemId);
        return found ? found.quantity : 0;
    };
    // Đóng modal
    const handleCloseMenuModal = () => {
        setShowMenuModal(false);
        setMenuModalTable(null);
        setPreOrderItems([]);
    };

    const handlePageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    // Modal handlers - CHỈ GIỮ LẠI CHỨC NĂNG SỬA, XÓA VÀ THÊM BÀN MỚI
    const openModal = async (type, item = null) => {
        setModalType(type);
        setError('');

        if (type === 'createTable') {
            setFormData({
                name: '',
                area_id: selectedArea,
                capacity: 4,
                type: 'standard',
                status: 'available',
                description: ''
            });
        } else if (type === 'editTable' && item) {
            setFormData({
                _id: item._id,
                name: item.name || '',
                area_id: safeGet(item, 'area_id._id') || item.area_id,
                capacity: item.capacity || 4,
                type: item.type || 'standard',
                status: item.status || 'available',
                description: item.description || ''
            });
        } else if (type === 'deleteTable' && item) {
            setFormData({
                _id: item._id,
                name: item.name || ''
            });
        }

        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalType('');
        setError('');
        setFormData({});
    };

    // Input change handler
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Submit handler - CHỈ XỬ LÝ SỬA, XÓA VÀ THÊM BÀN MỚI
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;

            switch (modalType) {
                case 'createTable':
                    response = await axios.post('/tables', {
                        name: formData.name,
                        area_id: formData.area_id,
                        capacity: parseInt(formData.capacity),
                        type: formData.type,
                        description: formData.description
                    });
                    if (response?.data?.success) {
                        alert('Tạo bàn thành công');
                        await loadAllTables();
                        closeModal();
                    } else {
                        setError(response?.data?.message || 'Lỗi khi tạo bàn mới');
                    }
                    break;

                case 'editTable':
                    response = await axios.put(`/tables/${formData._id}`, {
                        name: formData.name,
                        capacity: parseInt(formData.capacity),
                        type: formData.type,
                        description: formData.description
                    });
                    if (response?.data?.success) {
                        alert('Cập nhật bàn thành công');
                        await loadAllTables();
                        closeModal();
                    } else {
                        setError(response?.data?.message || 'Lỗi khi cập nhật bàn');
                    }
                    break;

                case 'deleteTable':
                    response = await axios.delete(`/tables/${formData._id}`);
                    if (response?.data?.success) {
                        alert('Xóa bàn thành công');
                        setSelectedTable(null);
                        await loadAllTables();
                        closeModal();
                    } else {
                        setError(response?.data?.message || 'Lỗi khi xóa bàn');
                    }
                    break;

                default:
                    break;
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setError(error.response?.data?.message || 'Có lỗi xảy ra khi xử lý yêu cầu');
        } finally {
            setLoading(false);
        }
    };

    // Notification functions
    const markNotificationAsRead = (notificationId) => {
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === notificationId ? { ...notif, read: true } : notif
            )
        );
    };

    const removeNotification = (notificationId) => {
        setNotifications(prev =>
            prev.filter(notif => notif.id !== notificationId)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAllNotifications = () => {
        setNotifications([]);
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

    const unreadCount = notifications.filter(n => !n.read).length;

    // Load menu items & categories khi mở modal chọn món
    useEffect(() => {
        if (showMenuModal) {
            setLoadingMenu(true);
            Promise.all([
                axios.get('/menu-items'),
                axios.get('/categories')
            ]).then(([menuRes, catRes]) => {
                if (menuRes?.data?.success) setMenuItems(menuRes.data.data);
                if (catRes?.data?.success) setCategories(catRes.data.data);
                // Debug log
                console.log('MenuModal categories:', catRes?.data?.data);
            }).finally(() => setLoadingMenu(false));
        }
    }, [showMenuModal]);

    // Xử lý xác nhận đặt bàn mới cho khách vãng lai
    const handleConfirmMenu = async () => {
        if (!menuModalTable || preOrderItems.length === 0) {
            handleCloseMenuModal();
            return;
        }
        setLoading(true);
        try {
            // Tạo đơn đặt bàn mới
            const now = new Date();
            let dateObj = new Date(now);
            let dateStr = [
                dateObj.getFullYear(),
                String(dateObj.getMonth() + 1).padStart(2, '0'),
                String(dateObj.getDate()).padStart(2, '0')
            ].join('-');
            // Tạo giờ hiện tại cho khách vãng lai
            const currentTime = now.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            const reservationData = {
                table_id: menuModalTable._id,
                date: dateStr,
                current_time: currentTime,
                guest_count: menuModalTable.capacity || 2,
                status: 'seated',
                contact_name: 'Khách vãng lai',
                contact_phone: '',
                pre_order_items: preOrderItems.map(item => ({
                    menu_item_id: item.menu_item_id,
                    quantity: item.quantity
                })),
                payment_status: 'pending'
            };
            await axios.post('/reservations', reservationData);
            // Làm mới dữ liệu
            await Promise.all([
                loadAllTables(),
                loadReservations()
            ]);
        } catch (e) {
            alert('Có lỗi khi tạo đơn đặt bàn mới!');
        } finally {
            setLoading(false);
            handleCloseMenuModal();
        }
    };

    if (loading && areas.length === 0) {
        return (
            <div className="table-management">
                <div className="table-management-content">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="table-management">
            <div className="table-management-content">
                <div className="table-management-header">
                    <h1>Sơ đồ bàn ăn</h1>

                    {/* Date selector and notifications */}
                    <div className="date-selector-container">
                        <div className="date-selector">
                            <label>Chọn ngày:</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="date-input"
                            />
                        </div>

                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError('')} className="close-error">×</button>
                    </div>
                )}

                {/* Area selector */}
                <div className="area-selector">
                    <div className="area-buttons">
                        {areas.map(area => (
                            <button
                                key={area._id}
                                className={`area-button ${selectedArea === area._id ? 'active' : ''}`}
                                onClick={() => handleAreaChange(area._id)}
                            >
                                {area.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tables grid - CHỈ GIỮ NGUYÊN NÚT SỬA VÀ XÓA */}
                <div className="tables-container">
                    <div className="tables-grid">
                        {tables.map(table => (
                            <div key={table._id} className={`table-card ${table.status} ${selectedTable?._id === table._id ? 'selected' : ''}`}
                                onClick={() => handleTableClick(table)}>
                                <div className="table-number">
                                    {table.name.match(/\d+/)?.[0] || table.name}
                                </div>
                                <div className="table-status-text">
                                    {getTableStatusLabel(table.status)}
                                </div>
                                <div className="table-capacity">
                                    Sức chứa: {table.capacity} người
                                </div>
                                {/* XÓA table-actions (nút Sửa, Xóa) */}
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="pagination-button"
                            >
                                Trước
                            </button>
                            {Array.from({ length: totalPages }, (_, index) => (
                                <button
                                    key={index + 1}
                                    onClick={() => handlePageChange(index + 1)}
                                    className={`pagination-button ${currentPage === index + 1 ? 'active' : ''}`}
                                >
                                    {index + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="pagination-button"
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </div>

                {/* Table details panel */}
                {selectedTable && (
                    <div className="table-details">
                        <h3>Chi tiết bàn: {selectedTable.name}</h3>
                        <div className="table-info-details">
                            <p><strong>Sức chứa:</strong> {selectedTable.capacity} người</p>
                            <p><strong>Loại:</strong> {selectedTable.type}</p>
                            <p><strong>Khu vực:</strong> {getAreaName(safeGet(selectedTable, 'area_id._id') || selectedTable.area_id)}</p>
                            <p><strong>Trạng thái:</strong>
                                <span className={`status-badge ${selectedTable.status}`}>
                                    {getTableStatusLabel(selectedTable.status)}
                                </span>
                            </p>
                            {selectedTable.description && (
                                <p><strong>Mô tả:</strong> {selectedTable.description}</p>
                            )}
                        </div>

                        {/* Show reservations for selected table */}
                        {/* {selectedTable.status === 'occupied' && (
                            <div className="table-reservations">
                                <h4>Thông tin đặt bàn (Ngày {new Date(selectedDate).toLocaleDateString()})</h4>
                                {getTableReservations(selectedTable._id).map(res => (
                                    <div key={res._id} className="reservation-item">
                                        <p><strong>Khách hàng:</strong> {res.contact_name}</p>
                                        <p><strong>SĐT:</strong> {res.contact_phone}</p>
                                        <p><strong>Thời gian:</strong> {getSlotDisplayText(safeGet(res, 'slot_id._id') || res.slot_id)}</p>
                                        <p><strong>Số khách:</strong> {res.guest_count}</p>
                                        <p><strong>Trạng thái:</strong>
                                            <span className={`status-badge ${res.status}`}>
                                                {getReservationStatusLabel(res.status)}
                                            </span>
                                        </p>
                                        <p><strong>Nguồn:</strong> {getStaffName(res)}</p>
                                        {res.notes && <p><strong>Ghi chú:</strong> {res.notes}</p>}
                                    </div>
                                ))}
                            </div>
                        )} */}
                    </div>
                )}
            </div>

            {/* XÓA modal thêm/sửa/xóa bàn (isModalOpen && ...) */}
            {/* Modal chọn món cho bàn trống */}
            {showMenuModal && menuModalTable && (
                <MenuModal
                    isOpen={showMenuModal}
                    onClose={handleCloseMenuModal}
                    preOrderItems={preOrderItems}
                    onMenuItemChange={(id, qty) => handleMenuItemChange(id, qty)}
                    calculatePreOrderTotal={calculatePreOrderTotal}
                    getSelectedItemsCount={getSelectedItemsCount}
                    menuItems={menuItems}
                    categories={Array.isArray(categories) ? categories : []}
                    loadingMenu={loadingMenu}
                    getFilteredMenuItems={getFilteredMenuItems}
                    getItemQuantity={getItemQuantity}
                    onConfirm={handleConfirmMenu}
                />
            )}
        </div>
    );
};

export default TableWaiter;
