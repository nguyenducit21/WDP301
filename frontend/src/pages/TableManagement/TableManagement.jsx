import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Sidebar from '../../components/Sidebar';
import { AuthContext } from '../../context/AuthContext';
import InvoicePrint from '../../components/InvoicePrint/InvoicePrint';
import './TableManagement.css';
import axios from '../../utils/axios.customize';

const TableManagement = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // States
    const [activeTab, setActiveTab] = useState('tables');
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [tables, setTables] = useState([]);
    const [allTables, setAllTables] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('');
    const [formData, setFormData] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [menuItems, setMenuItems] = useState([]);
    const [orders, setOrders] = useState([]);
    const [showInvoice, setShowInvoice] = useState(false);
    const [invoiceData, setInvoiceData] = useState(null);
    const [bookingSlots, setBookingSlots] = useState([]);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [categories, setCategories] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [showPreOrderModal, setShowPreOrderModal] = useState(false);
    const [reservationPage, setReservationPage] = useState(1); // Separate pagination for reservations
    const [reservationsPerPage] = useState(10); // Number of reservations per page
    const [filterByDate, setFilterByDate] = useState(false); // Toggle for date filtering

    // NEW: Notification states (split)
    const [orderNotifications, setOrderNotifications] = useState([]);
    const [reservationNotifications, setReservationNotifications] = useState([]);
    const [activeNotificationTab, setActiveNotificationTab] = useState('order'); // 'order' | 'reservation'

    // NEW: Notification states
    const [notifications, setNotifications] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);

    //Date selector state
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().slice(0, 10);
    });

    const tablesPerPage = 10;

    // Utility function for safe object access
    const safeGet = (obj, path, defaultValue = null) => {
        try {
            return path.split('.').reduce((o, p) => o && o[p], obj) || defaultValue;
        } catch {
            return defaultValue;
        }
    };

    // Status mapping functions
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
            'occupied': 'Đang phục vụ',
            'cleaning': 'Đang dọn',
            'maintenance': 'Bảo trì'
        };
        return statusMap[status] || status;
    };

    const getPaymentStatusLabel = (paymentStatus) => {
        const statusMap = {
            'pending': 'Chưa thanh toán',
            'partial': 'Đã cọc',
            'paid': 'Đã thanh toán',
            'refunded': 'Đã hoàn tiền'
        };
        return statusMap[paymentStatus] || paymentStatus;
    };

    // Debug user context
    useEffect(() => {
        console.log('Current user context:', user);
        console.log('User ID for orders:', user?.userId || user?.user?._id || user?._id);
        console.log('User role:', safeGet(user, 'user.role') || safeGet(user, 'role'));
    }, [user]);

    // Check authorization
    useEffect(() => {
        if (user !== null && user !== undefined) {
            const userRole = safeGet(user, 'user.role') || safeGet(user, 'role');
            const allowedRoles = ['admin', 'waiter', 'manager', 'staff'];
            if (!userRole || !allowedRoles.includes(userRole)) {
                console.log('Unauthorized access, redirecting to login');
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
            console.error('Error loading areas:', error);
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
                    table &&
                    table._id &&
                    table.area_id
                );
                setAllTables(validTables);
            }
        } catch (error) {
            setError('Lỗi khi tải danh sách bàn');
            console.error('Error loading tables:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // NEW: Load reservations with date and status filters
    const loadReservations = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                limit: '1000', // Get all and handle pagination client-side for better filtering
                sort: '-created_at'
            });

            // Add status filter if not 'all'
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }

            // Add date filter if enabled
            if (filterByDate) {
                params.append('date', selectedDate);
            }

            const response = await axios.get(`/reservations?${params}`);
            if (response?.data?.success && Array.isArray(response.data.data)) {
                const validReservations = response.data.data.filter(res =>
                    res && res._id
                );
                setReservations(validReservations);

                // Reset to first page when filters change
                setReservationPage(1);
            }
        } catch (error) {
            setError('Lỗi khi tải danh sách đặt bàn');
            console.error('Error loading reservations:', error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, selectedDate, filterByDate]); // Update dependencies

    const loadMenuItems = useCallback(async () => {
        try {
            const response = await axios.get('/menu-items');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                setMenuItems(response.data.data);
            }

            // Fetch categories
            const categoriesResponse = await axios.get('/categories');
            if (Array.isArray(categoriesResponse.data)) {
                setCategories(categoriesResponse.data);
            } else if (Array.isArray(categoriesResponse.data?.data)) {
                setCategories(categoriesResponse.data.data);
            }
        } catch (error) {
            console.error('Error loading menu items:', error);
        }
    }, []);

    const loadOrders = useCallback(async () => {
        try {
            const response = await axios.get('/orders?limit=1000&sort=-created_at');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                const validOrders = response.data.data.filter(order =>
                    order &&
                    order._id &&
                    order.table_id
                );
                setOrders(validOrders);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }, []);

    const loadTableDetails = useCallback(async (tableId) => {
        if (!tableId) return;

        try {
            const response = await axios.get(`/tables/${tableId}`);
            if (response?.data?.success && response.data.data?.table) {
                setSelectedTable(response.data.data.table);
            }
        } catch (error) {
            setError('Lỗi khi tải chi tiết bàn');
            console.error('Error loading table details:', error);
        }
    }, []);

    // Thêm hàm load booking slots
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
                loadMenuItems(),
                loadOrders(),
                loadBookingSlots() // Thêm load booking slots
            ]);
        };
        initializeData();
    }, [loadAreas, loadAllTables, loadMenuItems, loadOrders, loadBookingSlots]);

    // Load reservations when date changes
    useEffect(() => {
        loadReservations();
    }, [loadReservations]);

    // Update useEffect to reload reservations when status filter changes
    useEffect(() => {
        loadReservations();
    }, [loadReservations, statusFilter, filterByDate]); // Add filterByDate dependency

    // NEW: WebSocket connection for notifications
    useEffect(() => {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Connect to WebSocket
        const newSocket = io('http://localhost:3000');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('TableManagement: Connected to WebSocket server');
            setIsConnected(true);

            // Join waiter room
            newSocket.emit('join-waiter-room');
        });

        newSocket.on('disconnect', () => {
            console.log('TableManagement: Disconnected from WebSocket server');
            setIsConnected(false);
        });

        // Listen for new reservation notifications
        newSocket.on('new_reservation', (data) => {
            console.log('TableManagement: Received new reservation notification:', data);

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

            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Đặt bàn mới', {
                    body: `Khách hàng ${data.reservation.customer_name} vừa đặt bàn ${data.reservation.tables}`,
                    icon: '/favicon.ico'
                });
            }

            // Auto-refresh reservations list
            loadReservations();
        });



        // Listen for completed reservation notifications
        newSocket.on('reservation_completed', (data) => {
            console.log('TableManagement: Received reservation completed notification:', data);

            const newNotification = {
                id: Date.now(),
                type: 'reservation_completed',
                title: '✅ Đặt bàn đã hoàn thành',
                message: `Bàn ${data.tables} đã hoàn thành. Khách: ${data.customer}, Số khách: ${data.guest_count}` + (data.note ? `\nGhi chú: ${data.note}` : ''),
                data,
                timestamp: new Date(),
                read: false
            };

            setNotifications(prev => [newNotification, ...prev]);

            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Đặt bàn đã hoàn thành', {
                    body: `Bàn ${data.tables} đã hoàn thành. Khách: ${data.customer}, Số khách: ${data.guest_count}` + (data.note ? `\nGhi chú: ${data.note}` : ''),
                    icon: '/favicon.ico'
                });
            }
        });

        // Cleanup
        return () => {
            newSocket.close();
        };
    }, []);

    // NEW: Notification helper functions
    const markNotificationAsRead = (notificationId) => {
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === notificationId
                    ? { ...notif, read: true }
                    : notif
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

    // Filter tables by area and update status based on reservations
    useEffect(() => {
        if (selectedArea && allTables.length > 0) {
            const filteredTables = allTables.filter(table => {
                const tableAreaId = typeof table.area_id === 'string'
                    ? table.area_id
                    : safeGet(table, 'area_id._id');
                return tableAreaId === selectedArea;
            });

            // Update table status based on reservations for selected date
            const tablesWithUpdatedStatus = filteredTables.map(table => {
                // Chỉ kiểm tra đơn hàng và đặt bàn cho ngày được chọn
                const reservationsForSelectedDate = reservations.filter(res => {
                    const resDate = new Date(res.date).toISOString().split('T')[0];
                    return resDate === selectedDate;
                });

                const reservationIds = reservationsForSelectedDate
                    .filter(res => (safeGet(res, 'table_id._id') || res.table_id) === table._id)
                    .map(res => res._id);

                // Chỉ lấy đơn hàng liên quan đến đặt bàn của ngày được chọn
                const hasActiveOrder = orders.some(order =>
                    (safeGet(order, 'table_id._id') || order.table_id) === table._id &&
                    ['pending', 'preparing', 'served'].includes(order.status) &&
                    (reservationIds.includes(order.reservation_id) ||
                        reservationIds.includes(safeGet(order, 'reservation_id._id')))
                );

                const hasConfirmedOrSeatedReservation = reservationsForSelectedDate.some(res =>
                    (safeGet(res, 'table_id._id') || res.table_id) === table._id &&
                    ['confirmed', 'seated'].includes(res.status)
                );

                let status = table.status;
                if (hasConfirmedOrSeatedReservation || hasActiveOrder) {
                    status = 'occupied';
                } else if (table.status !== 'cleaning' && table.status !== 'maintenance') {
                    status = 'available';
                }

                return {
                    ...table,
                    status: status
                };
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
        return reservations.some(res =>
            (safeGet(res, 'table_id._id') || res.table_id) === tableId &&
            ['confirmed', 'pending', 'seated'].includes(res.status) &&
            new Date(res.date).toISOString().split('T')[0] === selectedDate
        );
    }, [reservations, selectedDate]);

    const getTableOrders = useCallback((tableId) => {
        if (!tableId || !orders.length) return [];
        return orders.filter(order =>
            (safeGet(order, 'table_id._id') || order.table_id) === tableId
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [orders]);

    const getTableReservations = (tableId) => {
        if (!tableId || !Array.isArray(reservations)) return [];

        return reservations.filter(res =>
            res &&
            (safeGet(res, 'table_id._id') || res.table_id) === tableId &&
            ['confirmed', 'pending', 'seated'].includes(res.status) &&
            new Date(res.date).toISOString().split('T')[0] === selectedDate
        );
    };

    const hasActiveOrder = useCallback((tableId) => {
        if (!tableId) return false;

        // Lấy các đặt bàn của ngày được chọn cho bàn này
        const tableReservations = getTableReservations(tableId);
        const reservationIds = tableReservations.map(res => res._id);

        // Lọc các đơn hàng liên quan đến đặt bàn của ngày được chọn
        const tableOrders = getTableOrders(tableId);
        return tableOrders.some(order =>
            ['pending', 'preparing', 'served'].includes(order.status) &&
            (reservationIds.includes(order.reservation_id) ||
                reservationIds.includes(safeGet(order, 'reservation_id._id')))
        );
    }, [getTableOrders, selectedDate, reservations]);

    const getAreaName = (areaId) => {
        if (!areaId || !Array.isArray(areas)) return 'N/A';
        const area = areas.find(a => a && a._id === areaId);
        return area?.name || 'N/A';
    };

    const getStaffName = (reservation) => {
        if (!reservation) return 'N/A';

        const createdByStaff = reservation.created_by_staff;
        if (!createdByStaff) {
            return 'Khách tự đặt';
        }

        const staffName = safeGet(createdByStaff, 'full_name') ||
            safeGet(createdByStaff, 'username') ||
            'Nhân viên';

        return `Nhân viên: ${staffName}`;
    };

    const getTableById = (id) => {
        if (!id || !Array.isArray(allTables)) return {};
        return allTables.find(table => table && table._id === id) || {};
    };

    // Event Handlers
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(1);
        setError('');
    };

    const handleAreaChange = (areaId) => {
        setSelectedArea(areaId);
        setCurrentPage(1);
        setSelectedTable(null);
        setError('');
    };

    // NEW: Handle date change
    const handleDateChange = (date) => {
        setSelectedDate(date);
        setCurrentPage(1);
        setSelectedTable(null);
        setError('');
    };

    const handleTableClick = async (table) => {
        if (!table || !table._id) return;
        setSelectedTable(table);

        if (table.status === 'occupied') {
            await loadTableDetails(table._id);
        }
    };

    const handleReservationClick = (reservation) => {
        if (!reservation || !reservation._id) return;
        setSelectedReservation(reservation);
    };

    const handlePageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    // Status change handlers
    const handleConfirmReservation = async (reservationId) => {
        try {
            setLoading(true);
            const response = await axios.patch(`/reservations/${reservationId}/confirm`);
            if (response?.data?.success) {
                alert('Xác nhận đặt bàn thành công');
                await Promise.all([
                    loadReservations(),
                    loadAllTables(),
                    loadOrders()
                ]);

                // Find the confirmed reservation to update its table status
                const confirmedReservation = reservations.find(res => res._id === reservationId);
                if (confirmedReservation) {
                    const tableId = safeGet(confirmedReservation, 'table_id._id') || confirmedReservation.table_id;
                    // Update table status to occupied directly
                    await axios.put(`/tables/${tableId}/status`, { status: 'occupied' });
                    await loadAllTables();
                }
            } else {
                setError(response?.data?.message || 'Lỗi khi xác nhận đặt bàn');
            }
        } catch (error) {
            console.error('Error confirming reservation:', error);
            setError('Lỗi khi xác nhận đặt bàn');
        } finally {
            setLoading(false);
        }
    };

    const handleSeatCustomer = async (reservationId) => {
        try {
            setLoading(true);
            const response = await axios.patch(`/reservations/${reservationId}/seat`);
            if (response?.data?.success) {
                alert('Khách đã vào bàn');
                await Promise.all([
                    loadReservations(),
                    loadAllTables(),
                    loadOrders()
                ]);

                // Find the seated reservation to update its table status
                const seatedReservation = reservations.find(res => res._id === reservationId);
                if (seatedReservation) {
                    const tableId = safeGet(seatedReservation, 'table_id._id') || seatedReservation.table_id;
                    // Ensure table status is occupied
                    await axios.put(`/tables/${tableId}/status`, { status: 'occupied' });
                    await loadAllTables();
                }
            } else {
                setError(response?.data?.message || 'Lỗi khi cập nhật trạng thái');
            }
        } catch (error) {
            console.error('Error seating customer:', error);
            setError('Lỗi khi cập nhật trạng thái');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteReservation = async (reservationId) => {
        try {
            setLoading(true);
            const response = await axios.patch(`/reservations/${reservationId}/complete`);
            if (response?.data?.success) {
                alert('Đặt bàn đã hoàn thành');
                await Promise.all([
                    loadReservations(),
                    loadAllTables(),
                    loadOrders()
                ]);
            } else {
                setError(response?.data?.message || 'Lỗi khi hoàn thành đặt bàn');
            }
        } catch (error) {
            console.error('Error completing reservation:', error);
            setError('Lỗi khi hoàn thành đặt bàn');
        } finally {
            setLoading(false);
        }
    };

    // Open invoice
    const openInvoice = async (reservation) => {
        try {
            setLoading(true);
            const response = await axios.get(`/reservations/${reservation._id}/invoice`);
            if (response?.data?.success) {
                setInvoiceData(response.data.data);
                setShowInvoice(true);
            } else {
                setError('Lỗi khi tải thông tin hóa đơn');
            }
        } catch (error) {
            console.error('Error loading invoice:', error);
            setError('Lỗi khi tải thông tin hóa đơn');
        } finally {
            setLoading(false);
        }
    };

    const openModal = async (type, item = null) => {
        setModalType(type);
        setError('');

        if (type === 'add') {
            setFormData({
                date: selectedDate,
                slot_id: '',
                table_id: '',
                contact_name: '',
                contact_phone: '',
                contact_email: '',
                guest_count: 2,
                status: 'pending',
                payment_status: 'pending',
                notes: '',
                pre_order_items: [],
                availableTables: [],
                bookingSlots: bookingSlots, // Sử dụng booking slots từ state
                isCheckingInventory: false,
                inventoryStatus: null
            });
        } else if (type === 'edit' && item) {
            const currentTableId = safeGet(item, 'table_id._id') || item.table_id;
            const availableTablesForEdit = allTables.filter(table =>
                table && (
                    table.status === 'available' ||
                    table._id === currentTableId
                )
            );

            setFormData({
                _id: item._id,
                table_id: currentTableId,
                contact_name: item.contact_name || '',
                contact_phone: item.contact_phone || '',
                contact_email: item.contact_email || '',
                date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
                slot_id: safeGet(item, 'slot_id._id') || item.slot_id || '',
                guest_count: item.guest_count || 1,
                status: item.status || 'pending',
                payment_status: item.payment_status || 'pending',
                notes: item.notes || '',
                pre_order_items: item.pre_order_items || [],
                availableTables: availableTablesForEdit,
                bookingSlots: bookingSlots
            });

            // // If there are pre-order items, open the menu modal instead
            // if (item.pre_order_items && item.pre_order_items.length > 0) {
            //     setShowPreOrderModal(true);
            //     setSelectedCategory("All");
            //     return;
            // }
        } else if (type === 'move' && item) {
            // Lấy tất cả bàn trống từ tất cả khu vực, không chỉ khu vực hiện tại
            const availableTables = allTables.filter(table =>
                table &&
                (table.status === 'available' || table.status === 'cleaning') &&
                table._id !== (safeGet(item, 'table_id._id') || item.table_id)
            );

            setFormData({
                _id: item._id,
                table_id: safeGet(item, 'table_id._id') || item.table_id,
                new_table_id: '',
                contact_name: item.contact_name || '',
                current_status: item.status,
                availableTables: availableTables
            });
        } else if (type === 'delete' && item) {
            setFormData({
                _id: item._id,
                contact_name: item.contact_name || '',
                table_id: safeGet(item, 'table_id._id') || item.table_id,
                date: item.date,
                time: item.time
            });
        } else if (type === 'updatePayment' && item) {
            setFormData({
                _id: item._id,
                contact_name: item.contact_name || '',
                current_payment_status: item.payment_status || 'pending',
                payment_status: item.payment_status || 'pending',
                payment_method: 'bank_transfer',
                payment_note: ''
            });
        } else if (type === 'addMenuItems' && item) {
            // Instead of showing the modal, open the menu modal
            openMenuModal(item);
            return;
        } else if (type === 'payment' && item) {
            const currentOrders = getTableOrders(item._id);
            const currentOrder = currentOrders.length > 0 ? currentOrders[0] : null;

            if (!currentOrder) {
                setError('Không tìm thấy đơn hàng cho bàn này');
                return;
            }

            let orderItems = [];
            if (currentOrder.order_items) {
                orderItems = currentOrder.order_items.map(orderItem => ({
                    menu_item_id: safeGet(orderItem, 'menu_item_id._id') || orderItem.menu_item_id,
                    quantity: orderItem.quantity,
                    price: orderItem.price
                }));
            }

            const tableReservations = getTableReservations(item._id);
            const currentReservation = tableReservations.length > 0 ? tableReservations[0] : null;

            const preOrderTotal = currentReservation?.pre_order_items ?
                currentReservation.pre_order_items.reduce((total, item) => {
                    if (!item || !item.menu_item_id) return total;
                    const menuItem = typeof item.menu_item_id === 'object' ? item.menu_item_id :
                        menuItems.find(m => m && m._id === item.menu_item_id);
                    const price = menuItem ? menuItem.price : 0;
                    return total + (price * item.quantity);
                }, 0) : 0;

            const orderItemsTotal = calculateOrderTotal(orderItems);
            const grandTotal = preOrderTotal + orderItemsTotal;

            setFormData({
                order_id: currentOrder._id,
                table_id: item._id,
                table_name: item.name,
                reservation_id: currentReservation?._id,
                order_items: orderItems,
                status: currentOrder.status,
                paid: currentOrder.paid || false,
                pre_order_total: preOrderTotal,
                order_items_total: orderItemsTotal,
                total_amount: grandTotal,
                payment_method: 'cash'
            });
        } else if (type === 'createTable') {
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

    // Thêm hàm chuyển đổi slot thời gian sang định dạng API
    const convertTimeSlotToApiFormat = (timeSlot) => {
        if (!timeSlot) return '';
        // Lấy thời gian bắt đầu từ slot (ví dụ: "07:00-09:00" -> "07:00")
        return timeSlot.split('-')[0];
    };

    const handleInputChange = async (e) => {
        const { name, value } = e.target;

        // Xử lý đặc biệt khi thay đổi ngày hoặc giờ trong form đặt bàn
        if (modalType === 'add' || modalType === 'edit') {
            if (name === 'slot_id' && value && formData.date) {
                // Khi chọn slot, lấy danh sách bàn trống
                try {
                    setLoading(true);
                    const response = await axios.get(`/reservations/available-tables?date=${formData.date}&slot_id=${value}`);
                    if (response?.data?.success) {
                        // Tìm slot đã chọn để lưu thông tin
                        const selectedSlot = bookingSlots.find(slot => slot._id === value);

                        setFormData({
                            ...formData,
                            [name]: value,
                            availableTables: response.data.data,
                            table_id: '', // Reset bàn đã chọn
                            selectedSlotInfo: selectedSlot // Lưu thông tin slot đã chọn
                        });
                    } else {
                        setError('Không thể lấy danh sách bàn trống');
                    }
                    setLoading(false);
                } catch (error) {
                    console.error('Error fetching available tables:', error);
                    setError('Lỗi khi lấy danh sách bàn trống');
                    setLoading(false);
                }
                return;
            }

            if (name === 'date') {
                // Khi thay đổi ngày, reset slot, bàn đã chọn
                setFormData({
                    ...formData,
                    [name]: value,
                    slot_id: '',
                    table_id: '',
                    availableTables: []
                });
                return;
            }

            if (name === 'table_id' && value) {
                // Khi chọn bàn, lấy thông tin sức chứa của bàn
                const selectedTable = formData.availableTables.find(table => table._id === value);
                if (selectedTable) {
                    setFormData({
                        ...formData,
                        [name]: value,
                        guest_count: Math.min(formData.guest_count || 1, selectedTable.capacity)
                    });
                } else {
                    setFormData({
                        ...formData,
                        [name]: value
                    });
                }
                return;
            }
        }

        // Xử lý mặc định cho các trường khác
        setFormData({ ...formData, [name]: value });
    };

    // Handle pre-order menu item changes
    const handleMenuItemChange = (menuItemId, quantity) => {
        const currentItems = formData.pre_order_items || [];
        let updatedItems = currentItems.filter(item => item.menu_item_id !== menuItemId);

        if (quantity > 0) {
            updatedItems.push({
                menu_item_id: menuItemId,
                quantity: quantity
            });
        }

        setFormData({
            ...formData,
            pre_order_items: updatedItems
        });
    };

    // Handle order item changes
    const handleOrderItemChange = (menuItemId, quantity) => {
        const currentItems = formData.order_items || [];
        let updatedItems = currentItems.filter(item => item.menu_item_id !== menuItemId);

        if (quantity > 0) {
            const menuItem = menuItems.find(m => m && m._id === menuItemId);
            const price = menuItem ? menuItem.price : 0;

            updatedItems.push({
                menu_item_id: menuItemId,
                quantity: quantity,
                price: price
            });
        }

        setFormData({
            ...formData,
            order_items: updatedItems
        });
    };

    // Calculate pre-order total
    const calculatePreOrderTotal = () => {
        if (!formData.pre_order_items || !formData.pre_order_items.length || !menuItems.length) return 0;

        return formData.pre_order_items.reduce((total, item) => {
            if (!item || !item.menu_item_id) return total;
            const menuItem = menuItems.find(m => m && m._id === item.menu_item_id);
            if (menuItem) {
                return total + ((menuItem.price || 0) * item.quantity);
            }
            return total;
        }, 0);
    };

    // Calculate order total
    const calculateOrderTotal = (orderItems) => {
        if (!orderItems || !orderItems.length) return 0;

        return orderItems.reduce((total, item) => {
            if (!item) return total;
            if (item.price) {
                return total + (item.price * item.quantity);
            }
            const menuItem = menuItems.find(m => m && m._id === item.menu_item_id);
            if (menuItem) {
                return total + ((menuItem.price || 0) * item.quantity);
            }
            return total;
        }, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;

            switch (modalType) {
                case 'add':
                    const reservationData = {
                        table_id: formData.table_id,
                        contact_name: formData.contact_name,
                        contact_phone: formData.contact_phone,
                        contact_email: formData.contact_email,
                        date: formData.date,
                        slot_id: formData.slot_id, // Sử dụng slot_id thay vì time
                        guest_count: parseInt(formData.guest_count),
                        notes: formData.notes,
                        payment_status: 'pending'
                    };

                    if (formData.pre_order_items && formData.pre_order_items.length > 0) {
                        reservationData.pre_order_items = formData.pre_order_items.filter(item => item.quantity > 0);
                    }

                    response = await axios.post('/reservations', reservationData);
                    if (response?.data?.success) {
                        alert('Đặt bàn thành công');
                    } else {
                        setError(response?.data?.message || 'Lỗi khi tạo đặt bàn');
                        return;
                    }
                    break;

                case 'edit':
                    const updateData = {
                        table_id: formData.table_id,
                        contact_name: formData.contact_name,
                        contact_phone: formData.contact_phone,
                        contact_email: formData.contact_email,
                        date: formData.date,
                        slot_id: formData.slot_id, // Sử dụng slot_id thay vì time
                        guest_count: parseInt(formData.guest_count),
                        status: formData.status,
                        payment_status: formData.payment_status,
                        notes: formData.notes
                    };

                    if (formData.pre_order_items && formData.pre_order_items.length > 0) {
                        updateData.pre_order_items = formData.pre_order_items.filter(item => item.quantity > 0);
                    }

                    response = await axios.put(`/reservations/${formData._id}`, updateData);
                    if (response?.data?.success) {
                        alert('Cập nhật đặt bàn thành công');
                    } else {
                        setError(response?.data?.message || 'Lỗi khi cập nhật đặt bàn');
                        return;
                    }
                    break;

                case 'move':
                    // Chuyển bàn và đơn hàng liên quan
                    response = await axios.patch(`/reservations/${formData._id}/move`, {
                        new_table_id: formData.new_table_id,
                        transfer_orders: true, // Thêm flag để chuyển cả đơn hàng
                        update_table_status: true // Thêm flag để cập nhật trạng thái bàn
                    });

                    if (response?.data?.success) {
                        // Update old table status to available
                        await axios.put(`/tables/${formData.table_id}/status`, { status: 'available' });

                        // Update new table status to occupied
                        await axios.put(`/tables/${formData.new_table_id}/status`, { status: 'occupied' });

                        alert('Chuyển bàn thành công');
                    } else {
                        setError(response?.data?.message || 'Lỗi khi chuyển bàn');
                        return;
                    }
                    break;

                case 'delete':
                    response = await axios.patch(`/reservations/${formData._id}/cancel`);
                    if (response?.data?.success) {
                        alert('Hủy đặt bàn thành công');
                    } else {
                        setError(response?.data?.message || 'Lỗi khi hủy đặt bàn');
                        return;
                    }
                    break;

                case 'updatePayment':
                    response = await axios.patch(`/reservations/${formData._id}/payment-status`, {
                        payment_status: formData.payment_status,
                        payment_method: formData.payment_method,
                        payment_note: formData.payment_note
                    });
                    if (response?.data?.success) {
                        // Nếu thanh toán đầy đủ, tự động cập nhật trạng thái đặt bàn thành hoàn thành
                        if (formData.payment_status === 'paid') {
                            try {
                                // Cập nhật trạng thái đặt bàn thành hoàn thành
                                await axios.patch(`/reservations/${formData._id}/complete`);

                                // Tìm đơn hàng liên quan đến đặt bàn và cập nhật trạng thái thành completed
                                const relatedOrders = orders.filter(order =>
                                    order.reservation_id === formData._id ||
                                    safeGet(order, 'reservation_id._id') === formData._id
                                );

                                if (relatedOrders.length > 0) {
                                    // Cập nhật trạng thái đơn hàng thành completed
                                    await Promise.all(relatedOrders.map(order =>
                                        axios.put(`/orders/${order._id}/payment`, {
                                            payment_method: formData.payment_method,
                                            status: 'completed'
                                        })
                                    ));
                                }

                                alert('Cập nhật trạng thái thanh toán và hoàn thành đặt bàn thành công');
                            } catch (completeError) {
                                console.error('Error completing reservation:', completeError);
                                alert('Cập nhật trạng thái thanh toán thành công nhưng không thể hoàn thành đặt bàn');
                            }
                        } else {
                            alert('Cập nhật trạng thái thanh toán thành công');
                        }
                    } else {
                        setError(response?.data?.message || 'Lỗi khi cập nhật trạng thái thanh toán');
                        return;
                    }
                    break;

                case 'addMenuItems':
                    const orderItems = formData.order_items.filter(item => item.quantity > 0);

                    if (orderItems.length === 0) {
                        setError('Vui lòng chọn ít nhất một món');
                        return;
                    }

                    if (formData.order_id) {
                        const orderData = {
                            order_items: orderItems,
                            status: formData.status,
                            note: formData.note
                        };
                        response = await axios.put(`/orders/${formData.order_id}`, orderData);
                    } else {
                        const orderData = {
                            table_id: formData.table_id,
                            order_items: orderItems,
                            note: formData.note
                        };

                        if (formData.reservation_id) {
                            orderData.reservation_id = formData.reservation_id;
                        }

                        if (formData.customer_id) {
                            orderData.customer_id = formData.customer_id;
                        } else {
                            const potentialCustomerId = user?.userId || user?.user?._id || user?._id;
                            const userRole = safeGet(user, 'user.role') || safeGet(user, 'role');

                            if (potentialCustomerId && userRole === 'customer') {
                                orderData.customer_id = potentialCustomerId;
                            }
                        }

                        console.log('Order data being sent:', orderData);
                        response = await axios.post('/orders', orderData);
                    }

                    if (response?.data?.success) {
                        alert('Thêm món thành công');
                    } else {
                        setError(response?.data?.message || 'Lỗi khi thêm món');
                        return;
                    }
                    break;

                case 'payment':
                    const paymentData = {
                        payment_method: formData.payment_method,
                        status: 'completed'
                    };

                    response = await axios.put(`/orders/${formData.order_id}/payment`, paymentData);

                    if (response?.data?.success) {
                        // Tự động hoàn thành đặt bàn khi thanh toán
                        if (formData.reservation_id) {
                            try {
                                await axios.patch(`/reservations/${formData.reservation_id}/complete`);
                            } catch (completeError) {
                                console.error('Error completing reservation:', completeError);
                            }
                        }

                        closeModal();

                        await Promise.all([
                            loadReservations(),
                            loadAllTables(),
                            loadOrders()
                        ]);

                        alert('Thanh toán thành công');

                        const tableReservations = getTableReservations(formData.table_id);
                        const currentReservation = tableReservations.length > 0 ? tableReservations[0] : null;

                        if (currentReservation) {
                            await openInvoice(currentReservation);
                        }
                    } else {
                        setError(response?.data?.message || 'Lỗi khi thanh toán');
                        return;
                    }
                    break;

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
                    } else {
                        setError(response?.data?.message || 'Lỗi khi tạo bàn mới');
                        return;
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
                    } else {
                        setError(response?.data?.message || 'Lỗi khi cập nhật bàn');
                        return;
                    }
                    break;

                case 'deleteTable':
                    response = await axios.delete(`/tables/${formData._id}`);
                    if (response?.data?.success) {
                        alert('Xóa bàn thành công');
                        setSelectedTable(null);
                    } else {
                        setError(response?.data?.message || 'Lỗi khi xóa bàn');
                        return;
                    }
                    break;

                default:
                    break;
            }

            if (modalType !== 'payment') {
                await Promise.all([
                    loadReservations(),
                    loadAllTables(),
                    loadOrders()
                ]);
                closeModal();
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setError(error.response?.data?.message || 'Có lỗi xảy ra khi xử lý yêu cầu');
        } finally {
            setLoading(false);
        }
    };

    // Open menu modal
    const openMenuModal = (table) => {
        // Find current reservation for this table
        const tableReservations = getTableReservations(table._id);
        const currentReservation = tableReservations.length > 0 ? tableReservations[0] : null;

        // Find current order
        let currentOrders = [];
        if (currentReservation) {
            currentOrders = orders.filter(order =>
                order.reservation_id === currentReservation._id ||
                safeGet(order, 'reservation_id._id') === currentReservation._id
            );
        } else {
            // If no reservation, get orders for this table without reservation_id
            currentOrders = orders.filter(order =>
                order.table_id === table._id &&
                !order.reservation_id
            );
        }

        const currentOrder = currentOrders.length > 0 ? currentOrders[0] : null;

        let orderItems = [];
        if (currentOrder && currentOrder.order_items) {
            orderItems = currentOrder.order_items.map(orderItem => ({
                menu_item_id: safeGet(orderItem, 'menu_item_id._id') || orderItem.menu_item_id,
                quantity: orderItem.quantity,
                price: orderItem.price
            }));
        }

        setFormData({
            table_id: table._id,
            table_name: table.name,
            order_id: currentOrder ? currentOrder._id : null,
            reservation_id: currentReservation ? currentReservation._id : null,
            customer_id: currentReservation?.customer_id || null,
            order_items: orderItems,
            status: currentOrder ? currentOrder.status : 'pending',
            paid: currentOrder ? currentOrder.paid : false,
            note: currentOrder ? currentOrder.note : ''
        });

        setSelectedCategory("All");
        setShowMenuModal(true);
    };

    // Close menu modal
    const closeMenuModal = () => {
        setShowMenuModal(false);
    };

    // Get filtered menu items based on selected category
    const getFilteredMenuItems = () => {
        return menuItems.filter(
            (item) =>
                selectedCategory === "All" ||
                item.category_id === selectedCategory ||
                (item.category_id?._id && item.category_id._id === selectedCategory)
        );
    };

    // Get selected items count
    const getSelectedItemsCount = () => {
        return formData.order_items ? formData.order_items.reduce((total, item) => total + item.quantity, 0) : 0;
    };

    // Handle menu item submission
    const handleSubmitMenuItems = async () => {
        try {
            setLoading(true);
            const orderItems = formData.order_items.filter(item => item.quantity > 0);

            if (orderItems.length === 0) {
                setError('Vui lòng chọn ít nhất một món');
                setLoading(false);
                return;
            }

            let response;
            if (formData.order_id) {
                const orderData = {
                    order_items: orderItems,
                    status: formData.status,
                    note: formData.note
                };
                response = await axios.put(`/orders/${formData.order_id}`, orderData);
            } else {
                const orderData = {
                    table_id: formData.table_id,
                    order_items: orderItems,
                    note: formData.note
                };

                if (formData.reservation_id) {
                    orderData.reservation_id = formData.reservation_id;
                }

                if (formData.customer_id) {
                    orderData.customer_id = formData.customer_id;
                } else {
                    const potentialCustomerId = user?.userId || user?.user?._id || user?._id;
                    const userRole = safeGet(user, 'user.role') || safeGet(user, 'role');

                    if (potentialCustomerId && userRole === 'customer') {
                        orderData.customer_id = potentialCustomerId;
                    }
                }

                console.log('Order data being sent:', orderData);
                response = await axios.post('/orders', orderData);
            }

            if (response?.data?.success) {
                await Promise.all([
                    loadReservations(),
                    loadAllTables(),
                    loadOrders()
                ]);

                setShowMenuModal(false);
                alert('Thêm món thành công');
            } else {
                setError(response?.data?.message || 'Lỗi khi thêm món');
            }
        } catch (error) {
            console.error('Error submitting menu items:', error);
            setError(error.response?.data?.message || 'Có lỗi xảy ra khi xử lý yêu cầu');
        } finally {
            setLoading(false);
        }
    };

    // Close pre-order modal
    const closePreOrderModal = () => {
        setShowPreOrderModal(false);
        setIsModalOpen(true); // Show the regular edit modal
    };

    // Get filtered menu items for pre-order
    const getFilteredPreOrderItems = () => {
        return menuItems.filter(
            (item) =>
                selectedCategory === "All" ||
                item.category_id === selectedCategory ||
                (item.category_id?._id && item.category_id._id === selectedCategory)
        );
    };

    // Get pre-order items count
    const getPreOrderItemsCount = () => {
        return formData.pre_order_items ? formData.pre_order_items.reduce((total, item) => total + item.quantity, 0) : 0;
    };

    if (loading && areas.length === 0) {
        return (
            <div className="table-management">
                <Sidebar />
                <div className="table-management-content">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Thêm hàm hiển thị slot thời gian dễ đọc
    const getDisplayTimeSlot = (timeSlot) => {
        if (!timeSlot) return '';

        // Nếu timeSlot đã có định dạng "XX:XX-YY:YY", trả về nguyên dạng
        if (timeSlot.includes('-')) {
            return timeSlot;
        }

        // Nếu chỉ là thời gian bắt đầu, tính thời gian kết thúc (2 giờ sau)
        const [hours, minutes] = timeSlot.split(':').map(Number);
        let endHours = hours + 2;

        // Format lại giờ kết thúc
        const formattedEndHours = endHours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');

        return `${timeSlot}-${formattedEndHours}:${formattedMinutes}`;
    };

    // Thêm hàm hiển thị slot thời gian
    const getSlotDisplayText = (slot_id) => {
        if (!slot_id || !bookingSlots.length) return '';

        const slot = bookingSlots.find(s => s._id === slot_id);
        if (!slot) return '';

        return slot.name ?
            `${slot.name} (${slot.start_time}-${slot.end_time})` :
            `${slot.start_time}-${slot.end_time}`;
    };

    // Thêm hàm tính tổng số món của đặt bàn (bao gồm cả pre-order và order)
    const getTotalOrderedItems = (reservation) => {
        if (!reservation) return 0;

        // Tính số lượng món đặt trước
        const preOrderCount = (reservation.pre_order_items || []).reduce((total, item) => {
            if (!item || !item.quantity) return total;
            return total + item.quantity;
        }, 0);

        // Tìm đơn hàng liên quan đến đặt bàn này
        const relatedOrders = orders.filter(order =>
            order.reservation_id === reservation._id ||
            (safeGet(order, 'reservation_id._id') === reservation._id)
        );

        // Tính số lượng món đã gọi thêm
        const orderCount = relatedOrders.reduce((total, order) => {
            return total + (order.order_items || []).reduce((itemTotal, item) => {
                return itemTotal + (item.quantity || 0);
            }, 0);
        }, 0);

        return preOrderCount + orderCount;
    };

    // Thêm hàm kiểm tra đơn hàng liên quan đến đặt bàn
    const hasRelatedOrders = (reservation) => {
        if (!reservation || !reservation._id) return false;
        return orders.some(order =>
            order.reservation_id === reservation._id ||
            safeGet(order, 'reservation_id._id') === reservation._id
        );
    };

    // Helper function to sort reservations by status priority
    const getSortedReservations = () => {
        // Define status priority (pending first, then confirmed, seated, completed)
        const statusPriority = {
            'pending': 1,
            'confirmed': 2,
            'seated': 3,
            'completed': 4,
            'cancelled': 5,
            'no_show': 6
        };

        return [...reservations].sort((a, b) => {
            // First sort by status priority
            const statusDiff = (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
            if (statusDiff !== 0) return statusDiff;

            // If same status, sort by date (newest first)
            return new Date(b.date) - new Date(a.date);
        });
    };

    // Format date function
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    // Get paginated reservations
    const getPaginatedReservations = () => {
        const sortedReservations = getSortedReservations();
        const startIndex = (reservationPage - 1) * reservationsPerPage;
        const endIndex = startIndex + reservationsPerPage;
        return sortedReservations.slice(startIndex, endIndex);
    };

    // Calculate total pages for reservations
    const getReservationTotalPages = () => {
        return Math.ceil(getSortedReservations().length / reservationsPerPage);
    };

    // Handle reservation page change
    const handleReservationPageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= getReservationTotalPages()) {
            setReservationPage(pageNumber);
        }
    };

    return (
        <div className="table-management">
            <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
            <div className="table-management-content" style={{
                marginLeft: sidebarCollapsed ? '80px' : '250px',
                transition: 'margin-left 0.2s'
            }}>
                <div className="table-management-header">
                    <h1>Quản lý bàn ăn</h1>
                    <div className="tab-navigation">

                        <button
                            className={`tab-button ${activeTab === 'tables' ? 'active' : ''}`}
                            onClick={() => handleTabChange('tables')}
                        >
                            Sơ đồ bàn
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'reservations' ? 'active' : ''}`}
                            onClick={() => handleTabChange('reservations')}
                        >
                            Danh sách đặt bàn
                        </button>
                    </div>

                    {/* NEW: Notification Bell */}
                    <div className="notification-section">
                        <div className="notification-bell" onClick={() => setShowNotificationPanel(!showNotificationPanel)}>
                            <div className="bell-icon">
                                🔔
                                {unreadCount > 0 && (
                                    <span className="notification-badge">{unreadCount}</span>
                                )}
                            </div>
                            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                                {isConnected ? '🟢' : '🔴'}
                            </div>
                        </div>

                        {/* Notification Panel */}
                        {showNotificationPanel && notifications.length > 0 && (
                            <div className="notification-panel">
                                <div className="notification-header">
                                    <h3>Thông báo ({unreadCount} mới)</h3>
                                    <div className="notification-actions">
                                        <button
                                            className="mark-all-read-btn"
                                            onClick={markAllAsRead}
                                        >
                                            Đánh dấu đã đọc
                                        </button>
                                        <button
                                            className="clear-all-btn"
                                            onClick={clearAllNotifications}
                                        >
                                            Xóa tất cả
                                        </button>
                                    </div>
                                </div>

                                <div className="notification-list">
                                    {notifications.map(notification => (
                                        <div
                                            key={notification.id}
                                            className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                                            onClick={() => markNotificationAsRead(notification.id)}
                                        >
                                            <div className="notification-content">
                                                <div className="notification-title">
                                                    {notification.title}
                                                </div>
                                                <div className="notification-message">
                                                    {notification.message}
                                                </div>
                                                {notification.data && (
                                                    <div className="notification-details">
                                                        <p><strong>Bàn:</strong> {notification.data.tables}</p>
                                                        <p><strong>Số khách:</strong> {notification.data.guest_count}</p>
                                                        <p><strong>Thời gian:</strong> {notification.data.slot_time}</p>
                                                        <p><strong>Ngày:</strong> {formatDateTime(notification.data.date)}</p>
                                                        {notification.data.pre_order_items && notification.data.pre_order_items.length > 0 && (
                                                            <p><strong>Đặt trước:</strong> {notification.data.pre_order_items.length} món</p>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="notification-time">
                                                    {formatDateTime(notification.timestamp)}
                                                </div>
                                            </div>

                                            <button
                                                className="remove-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeNotification(notification.id);
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError('')} className="close-error">×</button>
                    </div>
                )}

                {activeTab === 'tables' && (
                    <div className="tables-view">
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

                        <div className="tables-container">
                            <div className="tables-grid">
                                {tables.map(table => (
                                    <div
                                        key={table._id}
                                        className={`table-card ${table.status} ${selectedTable?._id === table._id ? 'selected' : ''}`}
                                        onClick={() => handleTableClick(table)}
                                    >
                                        <div className="table-number">
                                            {table.name.match(/\d+/)?.[0] || table.name}
                                        </div>
                                        <div className="table-status-text">
                                            {getTableStatusLabel(table.status)}
                                        </div>
                                        <div className="table-capacity">
                                            Sức chứa: {table.capacity} người
                                        </div>
                                        <div className="table-actions">
                                            <button
                                                className="btn-action btn-edit"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openModal('editTable', table);
                                                }}
                                                disabled={loading || hasActiveReservations(table._id) || table.status === 'occupied'}
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                className="btn-action btn-delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openModal('deleteTable', table);
                                                }}
                                                disabled={loading || hasActiveReservations(table._id) || table.status === 'occupied'}
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                        {(table.status === 'available' || table.status === 'cleaning') && (
                                            <button
                                                className="btn-reserve"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openModal('add', table);
                                                }}
                                                disabled={loading}
                                            >
                                                Đặt bàn
                                            </button>
                                        )}
                                        {(table.status === 'occupied') && (
                                            <button
                                                className="btn-add-menu"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openMenuModal(table);
                                                }}
                                                disabled={loading}
                                            >
                                                Thêm món
                                            </button>
                                        )}
                                        {table.status === 'occupied' && hasActiveOrder(table._id) && (
                                            <button
                                                className="btn-payment"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openModal('payment', table);
                                                }}
                                                disabled={loading}
                                            >
                                                Thanh toán
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

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

                                {(selectedTable.status === 'occupied') && (
                                    <div className="table-reservations">
                                        <h4>Thông tin đặt bàn (Ngày {new Date(selectedDate).toLocaleDateString()})</h4>
                                        {getTableReservations(selectedTable._id).map(res => (
                                            <div key={res._id} className="reservation-item">
                                                <p><strong>Khách hàng:</strong> {res.contact_name}</p>
                                                <p><strong>SĐT:</strong> {res.contact_phone}</p>
                                                <p><strong>Thời gian:</strong> {new Date(res.date).toLocaleDateString()}
                                                    <span className="time-slot-display">
                                                        {res.slot_id && safeGet(res, 'slot_id.name')
                                                            ? `${safeGet(res, 'slot_id.name')} (${safeGet(res, 'slot_id.start_time')}-${safeGet(res, 'slot_id.end_time')})`
                                                            : (res.slot_start_time && res.slot_end_time)
                                                                ? `${res.slot_start_time}-${res.slot_end_time}`
                                                                : getSlotDisplayText(safeGet(res, 'slot_id._id') || res.slot_id)
                                                        }
                                                    </span>
                                                </p>
                                                <p><strong>Số khách:</strong> {res.guest_count}</p>
                                                <p><strong>Trạng thái:</strong>
                                                    <span className={`status-badge ${res.status}`}>
                                                        {getReservationStatusLabel(res.status)}
                                                    </span>
                                                </p>
                                                <p><strong>Thanh toán:</strong>
                                                    <span className={`payment-badge ${res.payment_status || 'pending'}`}>
                                                        {getPaymentStatusLabel(res.payment_status)}
                                                    </span>
                                                </p>
                                                <p><strong>Nguồn:</strong> {getStaffName(res)}</p>
                                                {res.notes && <p><strong>Ghi chú:</strong> {res.notes}</p>}

                                                {res.pre_order_items && res.pre_order_items.length > 0 && (
                                                    <div className="reservation-pre-order">
                                                        <p><strong>Món đã đặt trước:</strong></p>
                                                        <div className="pre-order-items-list">
                                                            {res.pre_order_items.map((item, index) => {
                                                                if (!item || !item.menu_item_id) return null;

                                                                const menuItem = item.menu_item_id;
                                                                const menuName = typeof menuItem === 'object' ? menuItem.name : 'Món không xác định';
                                                                const menuPrice = typeof menuItem === 'object' ? menuItem.price : 0;

                                                                return (
                                                                    <div key={index} className="pre-order-item">
                                                                        <span>
                                                                            {menuName} x {item.quantity}
                                                                        </span>
                                                                        <span>
                                                                            {(menuPrice * item.quantity).toLocaleString()}đ
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                            <div className="pre-order-item" style={{ fontWeight: 'bold' }}>
                                                                <span>Tổng tiền:</span>
                                                                <span>
                                                                    {res.pre_order_items.reduce((total, item) => {
                                                                        if (!item || !item.menu_item_id) return total;
                                                                        const menuItem = item.menu_item_id;
                                                                        const price = typeof menuItem === 'object' ? menuItem.price : 0;
                                                                        return total + (price * item.quantity);
                                                                    }, 0).toLocaleString()}đ
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="reservation-actions">
                                                    <button
                                                        className="action-button edit"
                                                        onClick={() => openModal('edit', res)}
                                                        disabled={loading || res.status === 'cancelled'}
                                                    >
                                                        Sửa
                                                    </button>

                                                    {res.status === 'pending' && (
                                                        <button
                                                            className="action-button confirm"
                                                            onClick={() => handleConfirmReservation(res._id)}
                                                            disabled={loading}
                                                        >
                                                            Xác nhận
                                                        </button>
                                                    )}

                                                    {res.status === 'confirmed' && (
                                                        <button
                                                            className="action-button seat"
                                                            onClick={() => handleSeatCustomer(res._id)}
                                                            disabled={loading}
                                                        >
                                                            Vào bàn
                                                        </button>
                                                    )}

                                                    {['pending', 'confirmed', 'seated'].includes(res.status) && (
                                                        <button
                                                            className="action-button move"
                                                            onClick={() => openModal('move', res)}
                                                            disabled={loading}
                                                        >
                                                            Chuyển bàn
                                                        </button>
                                                    )}

                                                    {['pending', 'confirmed'].includes(res.status) && (
                                                        <button
                                                            className="action-button delete"
                                                            onClick={() => openModal('delete', res)}
                                                            disabled={loading}
                                                        >
                                                            Hủy
                                                        </button>
                                                    )}

                                                    {['seated', 'completed'].includes(res.status) && (
                                                        <button
                                                            className="action-button invoice"
                                                            onClick={() => openInvoice(res)}
                                                            disabled={loading}
                                                        >
                                                            In hóa đơn
                                                        </button>
                                                    )}

                                                    {['pending', 'confirmed', 'seated'].includes(res.status) &&
                                                        (
                                                            (res.pre_order_items && res.pre_order_items.length > 0) ||
                                                            hasRelatedOrders(res)
                                                        ) &&
                                                        ['pending', 'partial'].includes(res.payment_status) && (
                                                            <button
                                                                className="action-button payment-status"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openModal('updatePayment', res);
                                                                }}
                                                                disabled={loading}
                                                                title="Cập nhật thanh toán"
                                                            >
                                                                💰 Thanh toán
                                                            </button>
                                                        )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {selectedTable.status === 'occupied' && (
                                    <div className="table-orders">
                                        <h4>Đơn hàng hiện tại</h4>
                                        {getTableOrders(selectedTable._id).slice(0, 1).map(order => {
                                            const tableReservations = getTableReservations(selectedTable._id);
                                            const currentReservation = tableReservations.length > 0 ? tableReservations[0] : null;

                                            const preOrderTotal = currentReservation?.pre_order_items ?
                                                currentReservation.pre_order_items.reduce((total, item) => {
                                                    if (!item || !item.menu_item_id) return total;
                                                    const menuItem = typeof item.menu_item_id === 'object' ? item.menu_item_id :
                                                        menuItems.find(m => m && m._id === item.menu_item_id);
                                                    const price = menuItem ? menuItem.price : 0;
                                                    return total + (price * item.quantity);
                                                }, 0) : 0;

                                            const orderItemsTotal = calculateOrderTotal(order.order_items);
                                            const grandTotal = preOrderTotal + orderItemsTotal;

                                            return (
                                                <div key={order._id} className="order-item">
                                                    <p><strong>Mã đơn:</strong> #{order._id.slice(-6)}</p>

                                                    {order.customer_id ? (
                                                        <p><strong>Khách hàng:</strong> {safeGet(order, 'customer_id.full_name') || safeGet(order, 'customer_id.username') || 'N/A'}</p>
                                                    ) : (
                                                        <p><strong>Khách hàng:</strong> <span className="walk-in-customer">Khách walk-in</span></p>
                                                    )}

                                                    <p><strong>Nhân viên phục vụ:</strong> {safeGet(order, 'staff_id.full_name') || safeGet(order, 'staff_id.username') || 'N/A'}</p>

                                                    <p><strong>Trạng thái:</strong>
                                                        <span className={`status-badge ${order.status}`}>
                                                            {order.status === 'pending' && 'Chờ xử lý'}
                                                            {order.status === 'preparing' && 'Đang chuẩn bị'}
                                                            {order.status === 'served' && 'Đã phục vụ'}
                                                            {order.status === 'completed' && 'Hoàn thành'}
                                                        </span>
                                                    </p>

                                                    <p><strong>Thanh toán:</strong> {order.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
                                                    {order.note && <p><strong>Ghi chú:</strong> {order.note}</p>}

                                                    {currentReservation?.pre_order_items && currentReservation.pre_order_items.length > 0 && (
                                                        <div className="pre-order-section">
                                                            <p><strong>🍽️ Món đã đặt trước (Đã thanh toán):</strong></p>
                                                            <div className="pre-order-items-display">
                                                                {currentReservation.pre_order_items.map((item, index) => {
                                                                    if (!item || !item.menu_item_id) return null;

                                                                    const menuItem = typeof item.menu_item_id === 'object' ? item.menu_item_id :
                                                                        menuItems.find(m => m && m._id === item.menu_item_id);
                                                                    const menuName = menuItem ? menuItem.name : 'Món không xác định';
                                                                    const menuPrice = menuItem ? menuItem.price : 0;

                                                                    return (
                                                                        <div key={index} className="order-item-detail pre-order-item-detail">
                                                                            <span>{menuName} x {item.quantity}</span>
                                                                            <span className="paid-amount">{(menuPrice * item.quantity).toLocaleString()}đ</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                                <div className="pre-order-subtotal">
                                                                    <strong>Tổng đã thanh toán: {preOrderTotal.toLocaleString()}đ</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {order.order_items && order.order_items.length > 0 && (
                                                        <div className="current-order-section">
                                                            <p><strong>🍽️ Món đã gọi thêm (Chưa thanh toán):</strong></p>
                                                            <div className="order-items-display">
                                                                {order.order_items.map((item, index) => {
                                                                    const menuItem = menuItems.find(m => m && m._id === (safeGet(item, 'menu_item_id._id') || item.menu_item_id));
                                                                    return (
                                                                        <div key={index} className="order-item-detail">
                                                                            <span>{menuItem ? menuItem.name : 'Món không xác định'} x {item.quantity}</span>
                                                                            <span className="unpaid-amount">{((item.price || 0) * item.quantity).toLocaleString()}đ</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                                <div className="order-subtotal">
                                                                    <strong>Còn lại phải thanh toán: {orderItemsTotal.toLocaleString()}đ</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="order-grand-total">
                                                        <div className="total-breakdown">
                                                            <div className="total-row">
                                                                <span>Đã thanh toán trước:</span>
                                                                <span className="paid-total">{preOrderTotal.toLocaleString()}đ</span>
                                                            </div>
                                                            <div className="total-row">
                                                                <span>Còn lại phải thanh toán:</span>
                                                                <span className="unpaid-total">{orderItemsTotal.toLocaleString()}đ</span>
                                                            </div>
                                                            <div className="total-row grand-total-row">
                                                                <span><strong>Tổng cộng:</strong></span>
                                                                <span className="grand-total-amount"><strong>{grandTotal.toLocaleString()}đ</strong></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reservations' && (
                    <div className="reservations-view">
                        <div className="reservations-header">
                            <h3>Danh sách đặt bàn</h3>
                            <div className="reservations-actions">
                                {/* Use the existing date selector with a toggle checkbox */}
                                <div className="date-filter">
                                    <div className="filter-by-date-toggle">
                                        <input
                                            type="checkbox"
                                            id="filter-by-date"
                                            checked={filterByDate}
                                            onChange={(e) => setFilterByDate(e.target.checked)}
                                        />
                                        <label htmlFor="filter-by-date">Lọc theo ngày:</label>
                                    </div>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="date-input"
                                        disabled={!filterByDate}
                                    />
                                </div>

                                {/* Status filter dropdown */}
                                <div className="status-filter">
                                    <label>Trạng thái:</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="status-filter-select"
                                    >
                                        <option value="all">Tất cả trạng thái</option>
                                        <option value="pending">Chờ xác nhận</option>
                                        <option value="confirmed">Đã xác nhận</option>
                                        <option value="seated">Đã vào bàn</option>
                                        <option value="completed">Đã hoàn thành</option>
                                        <option value="cancelled">Đã hủy</option>
                                        <option value="no_show">Không đến</option>
                                    </select>
                                </div>
                                <button
                                    className="action-button add-reservation"
                                    onClick={() => openModal('add')}
                                    disabled={loading}
                                >
                                    Đặt bàn mới
                                </button>
                            </div>
                        </div>

                        <div className="reservations-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Mã đặt bàn</th>
                                        <th>Bàn</th>
                                        <th>Khách hàng</th>
                                        <th>Liên hệ</th>
                                        <th>Ngày đặt</th>
                                        <th>Giờ</th>
                                        <th>Số khách</th>
                                        <th>Trạng thái</th>
                                        <th>Thanh toán</th>
                                        <th>Nguồn</th>
                                        <th>Đặt món</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="12" className="loading-cell">
                                                <div className="mini-spinner"></div> Đang tải dữ liệu...
                                            </td>
                                        </tr>
                                    ) : getSortedReservations().length === 0 ? (
                                        <tr>
                                            <td colSpan="12" className="empty-cell">
                                                Không có đặt bàn nào {statusFilter !== 'all' ? `với trạng thái "${getReservationStatusLabel(statusFilter)}"` : ''}
                                                {filterByDate ? ` vào ngày ${new Date(selectedDate).toLocaleDateString()}` : ''}
                                            </td>
                                        </tr>
                                    ) : (
                                        getPaginatedReservations().map(res => (
                                            <tr
                                                key={res._id}
                                                className={`${selectedReservation?._id === res._id ? 'selected' : ''} status-${res.status}`}
                                                onClick={() => handleReservationClick(res)}
                                            >
                                                <td>#{res._id.slice(-6)}</td>
                                                <td>{safeGet(res, 'table_id.name') || (res.table_ids && res.table_ids.length > 0 ?
                                                    res.table_ids.map(t => safeGet(t, 'name') || '').join(', ') : 'N/A')}</td>
                                                <td>{res.contact_name}</td>
                                                <td>{res.contact_phone}</td>
                                                <td>{formatDate(res.date)}</td>
                                                <td>
                                                    {res.slot_id ? (
                                                        <span className="time-slot-display">
                                                            {safeGet(res, 'slot_id.name')
                                                                ? `${safeGet(res, 'slot_id.name')} (${safeGet(res, 'slot_id.start_time')}-${safeGet(res, 'slot_id.end_time')})`
                                                                : (res.slot_start_time && res.slot_end_time)
                                                                    ? `${res.slot_start_time}-${res.slot_end_time}`
                                                                    : getSlotDisplayText(safeGet(res, 'slot_id._id') || res.slot_id)
                                                            }
                                                        </span>
                                                    ) : (
                                                        res.slot_start_time && res.slot_end_time
                                                            ? `${res.slot_start_time}-${res.slot_end_time}`
                                                            : 'N/A'
                                                    )}
                                                </td>
                                                <td>{res.guest_count}</td>
                                                <td>
                                                    <span className={`status-badge ${res.status}`}>
                                                        {getReservationStatusLabel(res.status)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`payment-badge ${res.payment_status || 'pending'}`}>
                                                        {getPaymentStatusLabel(res.payment_status)}
                                                    </span>
                                                </td>
                                                <td>{getStaffName(res)}</td>
                                                <td>
                                                    {res.pre_order_items && res.pre_order_items.length > 0 ||
                                                        orders.some(order => order.reservation_id === res._id || safeGet(order, 'reservation_id._id') === res._id) ? (
                                                        <span className="has-pre-order" title="Có đặt món">
                                                            {getTotalOrderedItems(res)} món
                                                        </span>
                                                    ) : (
                                                        <span className="no-pre-order">Không</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        {['pending', 'confirmed', 'seated'].includes(res.status) && (
                                                            <button
                                                                className="action-button edit"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openModal('edit', res);
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                Sửa
                                                            </button>
                                                        )}

                                                        {res.status === 'pending' && (
                                                            <button
                                                                className="action-button confirm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleConfirmReservation(res._id);
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                Xác nhận
                                                            </button>
                                                        )}

                                                        {res.status === 'confirmed' && (
                                                            <button
                                                                className="action-button seat"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSeatCustomer(res._id);
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                Vào bàn
                                                            </button>
                                                        )}

                                                        {['pending', 'confirmed', 'seated'].includes(res.status) &&
                                                            (
                                                                (res.pre_order_items && res.pre_order_items.length > 0) ||
                                                                hasRelatedOrders(res)
                                                            ) &&
                                                            ['pending', 'partial'].includes(res.payment_status) && (
                                                                <button
                                                                    className="action-button payment-status"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openModal('updatePayment', res);
                                                                    }}
                                                                    disabled={loading}
                                                                    title="Cập nhật thanh toán"
                                                                >
                                                                    💰 Thanh toán
                                                                </button>
                                                            )}

                                                        {['seated', 'completed'].includes(res.status) && (
                                                            <button
                                                                className="action-button invoice"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openInvoice(res);
                                                                }}
                                                                disabled={loading}
                                                                title="In hóa đơn"
                                                            >
                                                                🖨️ In
                                                            </button>
                                                        )}

                                                        {['confirmed', 'seated'].includes(res.status) && (
                                                            <button
                                                                className="action-button move"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openModal('move', res);
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                Chuyển
                                                            </button>
                                                        )}

                                                        {['pending', 'confirmed'].includes(res.status) && (
                                                            <button
                                                                className="action-button delete"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openModal('delete', res);
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                Hủy
                                                            </button>
                                                        )}

                                                        {res.status === 'seated' && (
                                                            <button
                                                                className="action-button add-menu"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Get the table ID from the reservation
                                                                    const tableId = safeGet(res, 'table_id._id') || res.table_id;
                                                                    // Find the table object
                                                                    const table = allTables.find(t => t._id === tableId);
                                                                    if (table) {
                                                                        openMenuModal(table);
                                                                    }
                                                                }}
                                                                disabled={loading}
                                                                title="Thêm món"
                                                            >
                                                                🍽️ Thêm món
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination for reservations */}
                            {!loading && getSortedReservations().length > 0 && (
                                <div className="pagination">
                                    <button
                                        onClick={() => handleReservationPageChange(reservationPage - 1)}
                                        disabled={reservationPage === 1}
                                        className="pagination-button"
                                    >
                                        &lt; Trước
                                    </button>

                                    {Array.from({ length: getReservationTotalPages() }, (_, index) => {
                                        // Show 5 pages around current page
                                        if (
                                            index === 0 || // First page
                                            index === getReservationTotalPages() - 1 || // Last page
                                            Math.abs(index + 1 - reservationPage) <= 2 // Pages around current
                                        ) {
                                            return (
                                                <button
                                                    key={index + 1}
                                                    onClick={() => handleReservationPageChange(index + 1)}
                                                    className={`pagination-button ${reservationPage === index + 1 ? 'active' : ''}`}
                                                >
                                                    {index + 1}
                                                </button>
                                            );
                                        } else if (
                                            index === 1 && reservationPage > 4 ||
                                            index === getReservationTotalPages() - 2 && reservationPage < getReservationTotalPages() - 3
                                        ) {
                                            // Show ellipsis
                                            return <span key={index + 1} className="pagination-ellipsis">...</span>;
                                        }
                                        return null;
                                    })}

                                    <button
                                        onClick={() => handleReservationPageChange(reservationPage + 1)}
                                        disabled={reservationPage === getReservationTotalPages()}
                                        className="pagination-button"
                                    >
                                        Sau &gt;
                                    </button>

                                    <span className="pagination-info">
                                        Trang {reservationPage}/{getReservationTotalPages()} · Tổng {getSortedReservations().length} đơn
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Menu Selection Modal */}
                {showMenuModal && (
                    <div className="menu-modal-overlay">
                        <div className="menu-modal">
                            <div className="menu-modal-header">
                                <h3>Thêm món cho bàn {formData.table_name}</h3>
                                <button className="close-modal-btn" onClick={closeMenuModal}>×</button>
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

                                    {loading ? (
                                        <div className="loading">Đang tải menu...</div>
                                    ) : (
                                        <div className="menu-items-grid">
                                            {getFilteredMenuItems().map((item) => {
                                                const orderItem = (formData.order_items || [])
                                                    .find(i => i.menu_item_id === item._id);
                                                const quantity = orderItem ? orderItem.quantity : 0;

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
                                                                    onClick={() => handleOrderItemChange(item._id, Math.max(0, quantity - 1))}
                                                                >-</button>
                                                                <span className="quantity-display">{quantity}</span>
                                                                <button
                                                                    type="button"
                                                                    className="quantity-btn"
                                                                    onClick={() => handleOrderItemChange(item._id, quantity + 1)}
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
                                    <span>Tổng tiền: <strong>{calculateOrderTotal(formData.order_items).toLocaleString()}đ</strong></span>
                                    <span>Số món: <strong>{getSelectedItemsCount()}</strong></span>
                                </div>
                                <button
                                    className="confirm-menu-btn"
                                    onClick={handleSubmitMenuItems}
                                    disabled={loading}
                                >
                                    {loading ? "Đang xử lý..." : `Xác nhận (${getSelectedItemsCount()} món)`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Forms */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-container">
                            <div className="modal-header">
                                <h3>
                                    {modalType === 'add' && 'Đặt bàn mới'}
                                    {modalType === 'edit' && 'Chỉnh sửa đặt bàn'}
                                    {modalType === 'move' && 'Chuyển bàn'}
                                    {modalType === 'delete' && 'Xác nhận hủy đặt bàn'}
                                    {modalType === 'updatePayment' && 'Cập nhật thanh toán'}
                                    {modalType === 'addMenuItems' && 'Thêm món'}
                                    {modalType === 'payment' && 'Thanh toán'}
                                    {modalType === 'createTable' && 'Tạo bàn mới'}
                                    {modalType === 'editTable' && 'Sửa bàn'}
                                    {modalType === 'deleteTable' && 'Xác nhận xóa bàn'}
                                </h3>
                                <button className="close-button" onClick={closeModal}>×</button>
                            </div>

                            {error && (
                                <div className="error-message">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                {modalType === 'add' || modalType === 'edit' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Ngày đặt bàn</label>
                                            <input
                                                type="date"
                                                name="date"
                                                value={formData.date || ''}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>

                                        {/* Thay đổi phần chọn giờ thành chọn slot */}
                                        <div className="form-group">
                                            <label>Chọn khung giờ</label>
                                            <select
                                                name="slot_id"
                                                value={formData.slot_id || ''}
                                                onChange={handleInputChange}
                                                required
                                                disabled={!formData.date}
                                            >
                                                <option value="">Chọn khung giờ</option>
                                                {bookingSlots.map(slot => (
                                                    <option key={slot._id} value={slot._id}>
                                                        {slot.name ? `${slot.name} (${slot.start_time}-${slot.end_time})` : `${slot.start_time}-${slot.end_time}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Hiển thị thông báo nếu không có bàn trống */}
                                        {formData.slot_id && formData.availableTables && formData.availableTables.length === 0 && (
                                            <div className="warning-message">
                                                <p>Đã hết bàn trống trong khung giờ này, vui lòng chọn khung giờ khác.</p>
                                            </div>
                                        )}

                                        <div className="form-group">
                                            <label>Bàn</label>
                                            <select
                                                name="table_id"
                                                value={formData.table_id || ''}
                                                onChange={handleInputChange}
                                                required
                                                disabled={!formData.slot_id || (formData.availableTables && formData.availableTables.length === 0)}
                                            >
                                                <option value="">Chọn bàn</option>
                                                {(formData.availableTables || []).map(table => (
                                                    <option key={table._id} value={table._id}>
                                                        {table.name} (Sức chứa: {table.capacity} người) - {getAreaName(safeGet(table, 'area_id._id') || table.area_id)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Tên khách hàng</label>
                                            <input
                                                type="text"
                                                name="contact_name"
                                                value={formData.contact_name || ''}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Số điện thoại</label>
                                            <input
                                                type="text"
                                                name="contact_phone"
                                                value={formData.contact_phone || ''}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Email</label>
                                            <input
                                                type="email"
                                                name="contact_email"
                                                value={formData.contact_email || ''}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Số khách</label>
                                            <input
                                                type="number"
                                                name="guest_count"
                                                value={formData.guest_count || 1}
                                                onChange={handleInputChange}
                                                min="1"
                                                max={formData.table_id ? (formData.availableTables.find(t => t._id === formData.table_id)?.capacity || 1) : 1}
                                                required
                                                disabled={!formData.table_id}
                                            />
                                            {formData.table_id && (
                                                <small className="capacity-hint">
                                                    Sức chứa tối đa: {formData.availableTables.find(t => t._id === formData.table_id)?.capacity || 1} người
                                                </small>
                                            )}
                                        </div>

                                        {modalType === 'edit' && (
                                            <>
                                                <div className="form-group">
                                                    <label>Trạng thái</label>
                                                    <select
                                                        name="status"
                                                        value={formData.status || 'pending'}
                                                        onChange={handleInputChange}
                                                    >
                                                        <option value="pending">Chờ xác nhận</option>
                                                        <option value="confirmed">Đã xác nhận</option>
                                                        <option value="seated">Đã vào bàn</option>
                                                        <option value="cancelled">Đã hủy</option>
                                                        <option value="no_show">Không đến</option>
                                                        <option value="completed">Hoàn thành</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Trạng thái thanh toán</label>
                                                    <select
                                                        name="payment_status"
                                                        value={formData.payment_status || 'pending'}
                                                        onChange={handleInputChange}
                                                    >
                                                        <option value="pending">Chưa thanh toán</option>
                                                        <option value="partial">Đã cọc</option>
                                                        <option value="paid">Đã thanh toán</option>
                                                        <option value="refunded">Đã hoàn tiền</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        <div className="form-group">
                                            <label>Ghi chú</label>
                                            <textarea
                                                name="notes"
                                                value={formData.notes || ''}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Ghi chú đặc biệt..."
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Đặt món trước</label>
                                            <div className="pre-order-section">
                                                {formData.pre_order_items && formData.pre_order_items.length > 0 ? (
                                                    <div className="pre-order-summary">
                                                        <div className="pre-order-items-list">
                                                            {formData.pre_order_items.map((item, index) => {
                                                                if (!item || !item.menu_item_id) return null;

                                                                const menuItem = typeof item.menu_item_id === 'object' ? item.menu_item_id :
                                                                    menuItems.find(m => m && m._id === item.menu_item_id);

                                                                if (!menuItem) return null;

                                                                return (
                                                                    <div key={index} className="pre-order-item">
                                                                        <span className="pre-order-item-name">
                                                                            {menuItem.name} x {item.quantity}
                                                                        </span>
                                                                        <span className="pre-order-item-price">
                                                                            {((menuItem.price || 0) * item.quantity).toLocaleString()}đ
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                            <div className="pre-order-total-row">
                                                                <span>Tổng tiền:</span>
                                                                <span>{calculatePreOrderTotal().toLocaleString()}đ</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="edit-pre-order-btn"
                                                            onClick={() => {
                                                                setIsModalOpen(false);
                                                                setShowPreOrderModal(true);
                                                            }}
                                                        >
                                                            Chỉnh sửa món ({getPreOrderItemsCount()} món)
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="no-pre-order">
                                                        <p>Chưa có món đặt trước</p>
                                                        <button
                                                            type="button"
                                                            className="add-pre-order-btn"
                                                            onClick={() => {
                                                                setIsModalOpen(false);
                                                                setShowPreOrderModal(true);
                                                            }}
                                                        >
                                                            🍽️ Chọn món đặt trước
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : modalType === 'updatePayment' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Khách hàng: <strong>{formData.contact_name}</strong></label>
                                        </div>

                                        <div className="form-group">
                                            <label>Trạng thái thanh toán hiện tại</label>
                                            <div className="current-status">
                                                <span className={`payment-badge ${formData.current_payment_status}`}>
                                                    {getPaymentStatusLabel(formData.current_payment_status)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Cập nhật trạng thái thanh toán</label>
                                            <select
                                                name="payment_status"
                                                value={formData.payment_status || 'pending'}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="pending">Chưa thanh toán</option>
                                                <option value="partial">Đã cọc</option>
                                                <option value="paid">Đã thanh toán đầy đủ</option>
                                                <option value="refunded">Đã hoàn tiền</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Phương thức thanh toán</label>
                                            <select
                                                name="payment_method"
                                                value={formData.payment_method || 'bank_transfer'}
                                                onChange={handleInputChange}
                                            >
                                                <option value="cash">Tiền mặt</option>
                                                <option value="bank_transfer">Chuyển khoản</option>
                                                <option value="card">Thẻ tín dụng</option>
                                                <option value="e_wallet">Ví điện tử</option>
                                                <option value="qr_code">Quét mã QR</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Ghi chú thanh toán</label>
                                            <textarea
                                                name="payment_note"
                                                value={formData.payment_note || ''}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Ghi chú về thanh toán (mã giao dịch, thời gian...)"
                                            />
                                        </div>

                                        <div className="payment-warning">
                                            <p><strong>Lưu ý:</strong></p>
                                            <ul>
                                                <li>Đã cọc: Khách đã thanh toán một phần (tiền cọc)</li>
                                                <li>Đã thanh toán đầy đủ: Khách đã thanh toán 100% hóa đơn</li>
                                                <li>Vui lòng xác nhận kỹ trước khi cập nhật</li>
                                            </ul>
                                        </div>
                                    </div>
                                ) : modalType === 'move' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Bàn hiện tại</label>
                                            <input
                                                type="text"
                                                value={getTableById(formData.table_id).name || 'N/A'}
                                                disabled
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Trạng thái hiện tại</label>
                                            <span className={`status-badge ${formData.current_status}`}>
                                                {getReservationStatusLabel(formData.current_status)}
                                            </span>
                                        </div>

                                        <div className="form-group">
                                            <label>Chọn bàn mới</label>
                                            <select
                                                name="new_table_id"
                                                value={formData.new_table_id || ''}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Chọn bàn</option>
                                                {(formData.availableTables || []).map(table => (
                                                    <option key={table._id} value={table._id}>
                                                        {table.name} ({table.capacity} người) - {getAreaName(safeGet(table, 'area_id._id') || table.area_id)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {formData.current_status === 'seated' && (
                                            <div className="move-warning">
                                                <p><strong>⚠️ Chú ý:</strong> Khách đã vào bàn. Vui lòng thông báo với khách trước khi chuyển bàn.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : modalType === 'addMenuItems' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Bàn: <strong>{formData.table_name}</strong></label>
                                            {formData.customer_id && (
                                                <p className="customer-info">
                                                    <small>Khách hàng đã đặt bàn trước</small>
                                                </p>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label>Chọn món</label>
                                            <div className="menu-items-container order-items-section">
                                                {menuItems && menuItems.length > 0 ? (
                                                    menuItems.map(item => {
                                                        if (!item || !item._id) return null;

                                                        const orderItem = (formData.order_items || [])
                                                            .find(i => i.menu_item_id === item._id);
                                                        const quantity = orderItem ? orderItem.quantity : 0;

                                                        return (
                                                            <div key={item._id} className="menu-item-row">
                                                                <div className="menu-item-info">
                                                                    <span className="menu-item-name">{item.name}</span>
                                                                    <span className="menu-item-price">{item.price ? item.price.toLocaleString() : 0}đ</span>
                                                                </div>
                                                                <div className="menu-item-quantity">
                                                                    <button
                                                                        type="button"
                                                                        className="quantity-btn"
                                                                        onClick={() => handleOrderItemChange(item._id, Math.max(0, quantity - 1))}
                                                                    >-</button>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={quantity}
                                                                        onChange={(e) => handleOrderItemChange(item._id, parseInt(e.target.value) || 0)}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="quantity-btn"
                                                                        onClick={() => handleOrderItemChange(item._id, quantity + 1)}
                                                                    >+</button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <p>Không có món ăn nào trong menu</p>
                                                )}
                                            </div>
                                        </div>

                                        {formData.order_items && formData.order_items.length > 0 && (
                                            <div className="form-group">
                                                <label>Tổng tiền</label>
                                                <div className="order-total">
                                                    <strong>{calculateOrderTotal(formData.order_items).toLocaleString()}đ</strong>
                                                </div>
                                            </div>
                                        )}

                                        <div className="form-group">
                                            <label>Trạng thái</label>
                                            <select
                                                name="status"
                                                value={formData.status || 'pending'}
                                                onChange={handleInputChange}
                                            >
                                                <option value="pending">Chờ xử lý</option>
                                                <option value="preparing">Đang chuẩn bị</option>
                                                <option value="served">Đã phục vụ</option>
                                                <option value="completed">Hoàn thành</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Ghi chú</label>
                                            <textarea
                                                name="note"
                                                value={formData.note || ''}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Ghi chú đặc biệt..."
                                            />
                                        </div>
                                    </div>
                                ) : modalType === 'payment' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Bàn: <strong>{formData.table_name}</strong></label>
                                        </div>

                                        <div className="payment-breakdown">
                                            {formData.pre_order_total > 0 && (
                                                <div className="form-group">
                                                    <label>Đã thanh toán trước (Pre-order)</label>
                                                    <div className="payment-amount paid">
                                                        <strong>{formData.pre_order_total?.toLocaleString()}đ</strong>
                                                    </div>
                                                </div>
                                            )}

                                            {formData.order_items_total > 0 && (
                                                <div className="form-group">
                                                    <label>Số tiền còn lại phải thanh toán</label>
                                                    <div className="payment-amount unpaid">
                                                        <strong>{formData.order_items_total?.toLocaleString()}đ</strong>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="form-group">
                                                <label>Tổng hóa đơn</label>
                                                <div className="payment-total">
                                                    <strong>{formData.total_amount ? formData.total_amount.toLocaleString() : 0}đ</strong>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Phương thức thanh toán</label>
                                            <select
                                                name="payment_method"
                                                value={formData.payment_method || 'cash'}
                                                onChange={handleInputChange}
                                            >
                                                <option value="cash">Tiền mặt</option>
                                                <option value="card">Thẻ</option>
                                                <option value="transfer">Chuyển khoản</option>
                                            </select>
                                        </div>
                                    </div>
                                ) : modalType === 'createTable' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Khu vực</label>
                                            <select
                                                name="area_id"
                                                value={formData.area_id || ''}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Chọn khu vực</option>
                                                {areas.map(area => (
                                                    <option key={area._id} value={area._id}>
                                                        {area.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Tên bàn</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name || ''}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Ví dụ: Bàn 01"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Loại bàn</label>
                                            <input
                                                type="text"
                                                name="type"
                                                value={formData.type || ''}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Ví dụ: gia đình, cặp đôi, nhóm"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Sức chứa</label>
                                            <input
                                                type="number"
                                                name="capacity"
                                                value={formData.capacity || 4}
                                                onChange={handleInputChange}
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Mô tả</label>
                                            <textarea
                                                name="description"
                                                value={formData.description || ''}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Mô tả vị trí hoặc đặc điểm của bàn"
                                            />
                                        </div>
                                    </div>
                                ) : modalType === 'editTable' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Tên bàn</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name || ''}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Loại bàn</label>
                                            <input
                                                type="text"
                                                name="type"
                                                value={formData.type || ''}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Sức chứa</label>
                                            <input
                                                type="number"
                                                name="capacity"
                                                value={formData.capacity || 4}
                                                onChange={handleInputChange}
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Mô tả</label>
                                            <textarea
                                                name="description"
                                                value={formData.description || ''}
                                                onChange={handleInputChange}
                                                rows="3"
                                            />
                                        </div>
                                    </div>
                                ) : modalType === 'delete' ? (
                                    <div className="modal-body">
                                        <p>Bạn có chắc chắn muốn hủy đặt bàn này?</p>
                                        <p><strong>Khách hàng:</strong> {formData.contact_name}</p>
                                        <p><strong>Bàn:</strong> {getTableById(formData.table_id).name}</p>
                                        <p><strong>Thời gian:</strong> {formData.date && new Date(formData.date).toLocaleDateString()} {formData.time}</p>
                                    </div>
                                ) : modalType === 'deleteTable' ? (
                                    <div className="modal-body">
                                        <p>Bạn có chắc chắn muốn xóa bàn <strong>{formData.name}</strong>?</p>
                                        <p className="warning-text">Lưu ý: Hành động này không thể hoàn tác.</p>
                                    </div>
                                ) : null}

                                <div className="modal-footer">
                                    <button type="button" className="cancel-button" onClick={closeModal}>
                                        Hủy
                                    </button>
                                    <button type="submit" className="confirm-button" disabled={loading}>
                                        {loading ? 'Đang xử lý...' : (
                                            <>
                                                {modalType === 'add' && 'Đặt bàn'}
                                                {modalType === 'edit' && 'Cập nhật'}
                                                {modalType === 'move' && 'Chuyển bàn'}
                                                {modalType === 'delete' && 'Xác nhận hủy'}
                                                {modalType === 'updatePayment' && 'Cập nhật thanh toán'}
                                                {modalType === 'addMenuItems' && 'Thêm món'}
                                                {modalType === 'payment' && 'Thanh toán'}
                                                {modalType === 'createTable' && 'Tạo bàn'}
                                                {modalType === 'editTable' && 'Cập nhật bàn'}
                                                {modalType === 'deleteTable' && 'Xác nhận xóa'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Invoice Print Component */}
                {showInvoice && invoiceData && (
                    <InvoicePrint
                        invoiceData={invoiceData}
                        onClose={() => {
                            setShowInvoice(false);
                            setInvoiceData(null);
                        }}
                    />
                )}

                {showPreOrderModal && (
                    <div className="menu-modal-overlay">
                        <div className="menu-modal">
                            <div className="menu-modal-header">
                                <h3>Món đặt trước - {formData.contact_name}</h3>
                                <button className="close-modal-btn" onClick={closePreOrderModal}>×</button>
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
                                                ? "Thực đơn đặt trước"
                                                : categories.find((c) => c._id === selectedCategory)?.name || ""}
                                        </h2>
                                    </div>

                                    {loading ? (
                                        <div className="loading">Đang tải menu...</div>
                                    ) : (
                                        <div className="menu-items-grid">
                                            {getFilteredPreOrderItems().map((item) => {
                                                const preOrderItem = (formData.pre_order_items || [])
                                                    .find(i => i.menu_item_id === item._id);
                                                const quantity = preOrderItem ? preOrderItem.quantity : 0;

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
                                                                    onClick={() => handleMenuItemChange(item._id, Math.max(0, quantity - 1))}
                                                                >-</button>
                                                                <span className="quantity-display">{quantity}</span>
                                                                <button
                                                                    type="button"
                                                                    className="quantity-btn"
                                                                    onClick={() => handleMenuItemChange(item._id, quantity + 1)}
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
                                    <span>Số món: <strong>{getPreOrderItemsCount()}</strong></span>
                                </div>
                                <button
                                    className="confirm-menu-btn"
                                    onClick={closePreOrderModal}
                                >
                                    Xác nhận ({getPreOrderItemsCount()} món)
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TableManagement;
