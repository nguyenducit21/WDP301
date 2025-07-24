import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import Sidebar from '../../components/SidebarManager/SidebarManager';
import { AuthContext } from '../../context/AuthContext';
import InvoicePrint from '../../components/InvoicePrint/InvoicePrint';
import TableCombinations from '../../components/ReservationManagement/TableCombinations';
import SelectedTablesSummary from '../../components/ReservationManagement/SelectedTablesSummary';
import './ReservationManagement.css';
import axios from '../../utils/axios.customize';

const ReservationManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useContext(AuthContext);

    // States chính
    const [allTables, setAllTables] = useState([]);
    const [areas, setAreas] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('');
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // States menu & đơn hàng
    const [menuItems, setMenuItems] = useState([]);
    const [orders, setOrders] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [showPreOrderModal, setShowPreOrderModal] = useState(false);

    // States booking
    const [bookingSlots, setBookingSlots] = useState([]);
    const [selectedDate, setSelectedDate] = useState(() => {
        return new Date().toISOString().slice(0, 10);
    });

    // States cho tính năng ghép bàn
    const [tableCombinations, setTableCombinations] = useState({});
    const [selectedTables, setSelectedTables] = useState([]);
    const [showTableCombinations, setShowTableCombinations] = useState(false);

    // States lọc & phân trang
    const [statusFilter, setStatusFilter] = useState('all');
    const [filterByDate, setFilterByDate] = useState(false);
    const [reservationPage, setReservationPage] = useState(1);
    const [reservationsPerPage] = useState(10);

    // States hóa đơn
    const [showInvoice, setShowInvoice] = useState(false);
    const [invoiceData, setInvoiceData] = useState(null);

    // States thông báo
    const [notifications, setNotifications] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);

    // ==================== HÀM TIỆN ÍCH ====================
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

    const getPaymentStatusLabel = (paymentStatus) => {
        const statusMap = {
            'pending': 'Chưa thanh toán',
            'partial': 'Đã cọc',
            'paid': 'Đã thanh toán',
            'refunded': 'Đã hoàn tiền'
        };
        return statusMap[paymentStatus] || paymentStatus;
    };

    const getStaffName = (reservation) => {
        if (!reservation) return 'N/A';
        const createdByStaff = reservation.created_by_staff;
        if (!createdByStaff) return 'Khách tự đặt';
        const staffName = safeGet(createdByStaff, 'full_name') || safeGet(createdByStaff, 'username') || 'Nhân viên';
        return `Nhân viên: ${staffName}`;
    };

    const getSlotDisplayText = (slot_id) => {
        if (!slot_id || !bookingSlots.length) return '';
        const slot = bookingSlots.find(s => s._id === slot_id);
        if (!slot) return '';
        return slot.name ? `${slot.name} (${slot.start_time}-${slot.end_time})` : `${slot.start_time}-${slot.end_time}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('vi-VN');
    };

    const getAreaName = (areaId) => {
        if (!areaId || !Array.isArray(areas)) return 'N/A';
        const area = areas.find(a => a && a._id === areaId);
        return area?.name || 'N/A';
    };

    // ==================== HÀM GHÉP BÀN ====================
    const isTableSelected = (table) => {
        return selectedTables.some(t => t._id === table._id);
    };

    const isCombinationSelected = (combination) => {
        if (selectedTables.length !== combination.length) return false;
        return combination.every(table =>
            selectedTables.some(selected => selected._id === table._id)
        );
    };

    const handleTableSelect = (table) => {
        if (isTableSelected(table)) {
            // Bỏ chọn bàn
            setSelectedTables(prev => prev.filter(t => t._id !== table._id));
        } else {
            // Chọn bàn (thay thế selection hiện tại)
            setSelectedTables([table]);
        }
    };

    const handleCombinationSelect = (combination) => {
        setSelectedTables(combination);
    };

    const getTotalCapacity = () => {
        return selectedTables.reduce((sum, table) => sum + table.capacity, 0);
    };

    const isTableSelectionValid = (guestCount) => {
        return getTotalCapacity() >= parseInt(guestCount || 0);
    };

    const getSuggestedCombinations = (guestCount) => {
        console.log('getSuggestedCombinations called with:', { tableCombinations, guestCount }); // Debug log
        if (!tableCombinations || !guestCount) return [];

        const combinations = [];

        // Single tables
        if (tableCombinations.single && tableCombinations.single.length > 0) {
            combinations.push({
                description: `Bàn đơn (phù hợp cho ${guestCount} người)`,
                tables: tableCombinations.single
            });
        }

        // Double combinations
        if (tableCombinations.double && tableCombinations.double.length > 0) {
            combinations.push({
                description: `Ghép 2 bàn (cho ${guestCount} người)`,
                tables: tableCombinations.double
            });
        }

        // Triple combinations
        if (tableCombinations.triple && tableCombinations.triple.length > 0) {
            combinations.push({
                description: `Ghép 3 bàn (cho ${guestCount} người)`,
                tables: tableCombinations.triple
            });
        }

        console.log('getSuggestedCombinations result:', combinations); // Debug log
        return combinations;
    };

    // ==================== HÀM HỖ TRỢ DỮ LIỆU ====================
    const getTotalOrderedItems = (reservation) => {
        if (!reservation) return 0;
        const preOrderCount = (reservation.pre_order_items || []).reduce((total, item) => total + (item.quantity || 0), 0);
        const relatedOrders = orders.filter(order =>
            order.reservation_id === reservation._id || safeGet(order, 'reservation_id._id') === reservation._id
        );
        const orderCount = relatedOrders.reduce((total, order) =>
            total + (order.order_items || []).reduce((itemTotal, item) => itemTotal + (item.quantity || 0), 0), 0
        );
        return preOrderCount + orderCount;
    };

    // Kiểm tra xem đặt bàn có đơn hàng liên quan không
    const hasRelatedOrders = (reservation) => {
        if (!reservation || !orders || orders.length === 0) return false;

        const reservationId = reservation._id;

        return orders.some(order => {
            const orderReservationId = safeGet(order, 'reservation_id._id') || order.reservation_id;
            return orderReservationId === reservationId &&
                order.order_items &&
                order.order_items.length > 0;
        });
    };

    // Enhanced function to check if reservation needs payment button
    const shouldShowPaymentButton = useCallback((reservation) => {
        if (!reservation) return false;

        // Don't show payment button if reservation is completed or cancelled
        if (!['pending', 'confirmed', 'seated'].includes(reservation.status)) {
            return false;
        }

        // Don't show if payment is already fully paid AND no additional orders exist
        if (reservation.payment_status === 'paid') {
            // Check if there are additional orders beyond pre-order
            const hasAdditionalOrders = hasRelatedOrders(reservation);
            if (!hasAdditionalOrders) {
                return false;
            }
        }

        // Show payment button if:
        // 1. Has pre-order items, OR
        // 2. Has related orders (additional menu items), AND
        // 3. Payment status is not fully paid (pending or partial)
        const hasItems = (reservation.pre_order_items && reservation.pre_order_items.length > 0) ||
            hasRelatedOrders(reservation);

        const needsPayment = ['pending', 'partial'].includes(reservation.payment_status);

        return hasItems && needsPayment;
    }, [reservations, orders, hasRelatedOrders]);

    // Enhanced total calculation including both pre-order and additional orders
    const getReservationTotal = useCallback((reservation) => {
        let total = 0;

        // Calculate pre-order total (with discount if applicable)
        if (reservation.pre_order_items && reservation.pre_order_items.length > 0) {
            const preOrderTotal = reservation.pre_order_items.reduce((sum, item) => {
                const menuItem = menuItems.find(m => m._id === (item.menu_item_id._id || item.menu_item_id));
                const price = menuItem ? menuItem.price : (item.price || 0);
                return sum + (item.quantity * price);
            }, 0);

            // Apply 15% discount for pre-order items
            total += preOrderTotal * 0.85;
        }

        // Calculate additional orders total (no discount)
        const relatedOrders = orders.filter(order => {
            const orderReservationId = safeGet(order, 'reservation_id._id') || order.reservation_id;
            return orderReservationId === reservation._id;
        });

        relatedOrders.forEach(order => {
            if (order.order_items && order.order_items.length > 0) {
                total += order.order_items.reduce((sum, item) => {
                    const menuItem = menuItems.find(m => m._id === (item.menu_item_id._id || item.menu_item_id));
                    const price = menuItem ? menuItem.price : (item.price || 0);
                    return sum + (item.quantity * price);
                }, 0);
            }
        });

        return Math.round(total);
    }, [orders, menuItems]);

    // Get payment status display with enhanced logic
    const getPaymentStatusDisplay = useCallback((reservation) => {
        if (!reservation) return { status: 'pending', label: 'Chưa thanh toán' };

        const hasPreOrder = reservation.pre_order_items && reservation.pre_order_items.length > 0;
        const hasAdditionalOrders = hasRelatedOrders(reservation);

        if (reservation.payment_status === 'paid' && hasAdditionalOrders) {
            // If was paid but has additional orders, show as partial
            return { status: 'partial', label: 'Cần thanh toán thêm' };
        }

        switch (reservation.payment_status) {
            case 'paid':
                return { status: 'paid', label: 'Đã thanh toán' };
            case 'partial':
                return { status: 'partial', label: 'Đã cọc' };
            default:
                return { status: 'pending', label: 'Chưa thanh toán' };
        }
    }, [hasRelatedOrders]);

    // ==================== PHÂN TRANG & SẮP XẾP ====================
    const getSortedReservations = () => {
        const statusPriority = { 'pending': 1, 'confirmed': 2, 'seated': 3, 'completed': 4, 'cancelled': 5, 'no_show': 6 };
        return [...reservations].sort((a, b) => {
            const statusDiff = (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
            if (statusDiff !== 0) return statusDiff;
            return new Date(b.date) - new Date(a.date);
        });
    };

    const getPaginatedReservations = () => {
        const sortedReservations = getSortedReservations();
        const startIndex = (reservationPage - 1) * reservationsPerPage;
        return sortedReservations.slice(startIndex, startIndex + reservationsPerPage);
    };

    const getReservationTotalPages = () => Math.ceil(getSortedReservations().length / reservationsPerPage);

    const handleReservationPageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= getReservationTotalPages()) {
            setReservationPage(pageNumber);
        }
    };

    // ==================== HÀM HỖ TRỢ MENU ====================
    const getFilteredMenuItems = () => {
        return menuItems.filter(item =>
            selectedCategory === "All" ||
            item.category_id === selectedCategory ||
            (item.category_id?._id && item.category_id._id === selectedCategory)
        );
    };

    const handleOrderItemChange = (menuItemId, quantity) => {
        const currentItems = formData.order_items || [];
        let updatedItems = currentItems.filter(item => item.menu_item_id !== menuItemId);

        if (quantity > 0) {
            const menuItem = menuItems.find(m => m && m._id === menuItemId);
            updatedItems.push({
                menu_item_id: menuItemId,
                quantity: quantity,
                price: menuItem ? menuItem.price : 0
            });
        }

        setFormData({ ...formData, order_items: updatedItems });
    };

    const calculateOrderTotal = (orderItems) => {
        if (!orderItems || !orderItems.length) return 0;
        return orderItems.reduce((total, item) => {
            if (!item) return total;
            if (item.price) return total + (item.price * item.quantity);
            const menuItem = menuItems.find(m => m && m._id === item.menu_item_id);
            return total + ((menuItem?.price || 0) * item.quantity);
        }, 0);
    };

    // Pre-order functions
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

    const getPreOrderItemsCount = () => {
        if (!formData.pre_order_items || !formData.pre_order_items.length) return 0;
        return formData.pre_order_items.reduce((total, item) => total + (item.quantity || 0), 0);
    };

    const handlePreOrderItemChange = (menuItemId, quantity) => {
        const currentItems = formData.pre_order_items || [];
        let updatedItems = [...currentItems.filter(item => item.menu_item_id !== menuItemId)];

        if (quantity > 0) {
            const menuItem = menuItems.find(m => m && m._id === menuItemId);
            updatedItems.push({
                menu_item_id: menuItemId,
                quantity: parseInt(quantity),
                price: menuItem ? menuItem.price : 0
            });
        }

        setFormData(prevFormData => ({
            ...prevFormData,
            pre_order_items: updatedItems
        }));
    };

    // ==================== HÀM THÔNG BÁO ====================
    const markNotificationAsRead = (notificationId) => {
        setNotifications(prev => prev.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
        ));
    };

    const removeNotification = (notificationId) => {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAllNotifications = () => setNotifications([]);

    const unreadCount = notifications.filter(n => !n.read).length;

    // ==================== KIỂM TRA QUYỀN ====================
    useEffect(() => {
        if (user !== null && user !== undefined) {
            const userRole = safeGet(user, 'user.role') || safeGet(user, 'role');
            const allowedRoles = ['admin', 'waiter', 'manager', 'staff'];
            if (!userRole || !allowedRoles.includes(userRole)) {
                navigate('/login');
            }
        }
    }, [user, navigate]);

    // ==================== HÀM API ====================
    const loadAllTables = useCallback(async () => {
        try {
            const response = await axios.get('/tables?limit=1000');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                setAllTables(response.data.data.filter(table => table && table._id));
            }
        } catch (error) {
            console.error('Lỗi khi tải bàn:', error);
        }
    }, []);

    const loadAreas = useCallback(async () => {
        try {
            const response = await axios.get('/areas');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                setAreas(response.data.data);
            }
        } catch (error) {
            console.error('Lỗi khi tải khu vực:', error);
        }
    }, []);

    const loadMenuItems = useCallback(async () => {
        try {
            const [menuResponse, categoriesResponse] = await Promise.all([
                axios.get('/menu-items'),
                axios.get('/categories')
            ]);

            if (menuResponse?.data?.success && Array.isArray(menuResponse.data.data)) {
                setMenuItems(menuResponse.data.data);
            }

            const categoriesData = categoriesResponse.data?.data || categoriesResponse.data;
            if (Array.isArray(categoriesData)) {
                setCategories(categoriesData);
            }
        } catch (error) {
            console.error('Lỗi khi tải menu:', error);
        }
    }, []);

    const loadOrders = useCallback(async () => {
        try {
            const response = await axios.get('/orders?limit=1000&sort=-created_at');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                setOrders(response.data.data.filter(order => order && order._id));
            }
        } catch (error) {
            console.error('Lỗi khi tải đơn hàng:', error);
        }
    }, []);

    const loadBookingSlots = useCallback(async () => {
        try {
            const response = await axios.get('/booking-slots');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                setBookingSlots(response.data.data);
            }
        } catch (error) {
            console.error('Lỗi khi tải khung giờ:', error);
        }
    }, []);

    const loadReservations = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ limit: '1000', sort: '-created_at' });

            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (filterByDate) params.append('date', selectedDate);

            const response = await axios.get(`/reservations?${params}`);
            if (response?.data?.success && Array.isArray(response.data.data)) {
                const validReservations = response.data.data.filter(res => res && res._id);
                setReservations(validReservations);
                setReservationPage(1);
            }
        } catch (error) {
            setError('Lỗi khi tải danh sách đặt bàn');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, selectedDate, filterByDate]);

    // ==================== TẢI DỮ LIỆU BAN ĐẦU ====================
    useEffect(() => {
        Promise.all([loadAllTables(), loadAreas(), loadMenuItems(), loadOrders(), loadBookingSlots()]);
    }, [loadAllTables, loadAreas, loadMenuItems, loadOrders, loadBookingSlots]);

    useEffect(() => {
        loadReservations();
    }, [loadReservations]);

    // ==================== THIẾT LẬP WEBSOCKET ====================
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

        newSocket.on('disconnect', () => setIsConnected(false));

        const handleNewReservation = (data) => {
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
        };

        newSocket.on('new_reservation', handleNewReservation);
        newSocket.on('reservation_completed', handleNewReservation);

        return () => newSocket.close();
    }, [loadReservations]);

    // ==================== XỬ LÝ SỰ KIỆN ====================
    const handleReservationClick = (reservation) => {
        if (reservation && reservation._id) {
            setSelectedReservation(reservation);
        }
    };

    const handleConfirmReservation = async (reservationId) => {
        try {
            setLoading(true);
            const response = await axios.patch(`/reservations/${reservationId}/confirm`);
            if (response?.data?.success) {
                alert('Xác nhận đặt bàn thành công');
                await loadReservations();
            } else {
                setError(response?.data?.message || 'Lỗi khi xác nhận đặt bàn');
            }
        } catch (error) {
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
                await loadReservations();
            } else {
                setError(response?.data?.message || 'Lỗi khi cập nhật trạng thái');
            }
        } catch (error) {
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
                await loadReservations();
            } else {
                setError(response?.data?.message || 'Lỗi khi hoàn thành đặt bàn');
            }
        } catch (error) {
            setError('Lỗi khi hoàn thành đặt bàn');
        } finally {
            setLoading(false);
        }
    };

    // ==================== XỬ LÝ MODAL ====================
    const openModal = async (type, item = null) => {
        setModalType(type);
        setError('');

        // Reset states ghép bàn
        setSelectedTables([]);
        setTableCombinations({});
        setShowTableCombinations(false);

        if (type === 'add') {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                slot_id: '',
                table_id: '',
                contact_name: '',
                contact_phone: '',
                contact_email: '',
                guest_count: 2,
                notes: '',
                pre_order_items: [],
                availableTables: []
            });
        } else if (type === 'edit' && item) {
            const currentTableId = safeGet(item, 'table_id._id') || item.table_id;
            const availableTablesForEdit = allTables.filter(table =>
                table && (table.status === 'available' || table._id === currentTableId)
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
        } else if (type === 'updatePayment' && item) {
            setFormData({
                _id: item._id,
                contact_name: item.contact_name || '',
                current_payment_status: item.payment_status || 'pending',
                payment_status: item.payment_status || 'pending',
                payment_method: 'bank_transfer',
                payment_note: ''
            });
        } else if (type === 'move' && item) {
            const availableTables = allTables.filter(table =>
                table && (table.status === 'available' || table.status === 'cleaning') &&
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
        }

        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalType('');
        setError('');
        setFormData({});
    };

    // Mở modal menu để thêm món
    const openMenuModal = (tableInfo, reservation = null) => {
        const existingOrder = orders.find(order => {
            const orderTableId = safeGet(order, 'table_id._id') || order.table_id;
            const orderReservationId = safeGet(order, 'reservation_id._id') || order.reservation_id;

            return orderTableId === tableInfo._id &&
                (!reservation || orderReservationId === reservation._id);
        });

        setFormData({
            table_id: tableInfo._id,
            table_name: tableInfo.name,
            reservation_id: reservation?._id || null,
            order_id: existingOrder?._id || null,
            order_items: existingOrder?.order_items || [],
            status: existingOrder?.status || 'pending',
            note: existingOrder?.note || ''
        });

        setShowMenuModal(true);
    };

    // Cập nhật hàm đóng modal menu
    const closeMenuModal = async () => {
        setShowMenuModal(false);
        setSelectedCategory("All");
        setError('');
        setFormData({});

        // Làm mới dữ liệu để đảm bảo cập nhật
        try {
            await Promise.all([
                loadReservations(),
                loadOrders()
            ]);
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    };

    const openPreOrderModal = () => {
        setShowPreOrderModal(true);
        setSelectedCategory("All");
    };

    const closePreOrderModal = () => {
        setShowPreOrderModal(false);
        setSelectedCategory("All");
    };

    const handleInputChange = async (e) => {
        const { name, value } = e.target;

        // Xử lý đặc biệt khi thay đổi ngày hoặc giờ trong form đặt bàn
        if (modalType === 'add' || modalType === 'edit') {
            if (name === 'slot_id' && value && formData.date) {
                // Khi chọn slot, lấy danh sách bàn trống và combinations
                try {
                    setLoading(true);
                    const guestCount = formData.guest_count || 2;
                    const response = await axios.get(`/reservations/available-tables?date=${formData.date}&slot_id=${value}&guest_count=${guestCount}`);
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

                        // Lưu table combinations và hiển thị gợi ý ghép bàn
                        console.log('Table combinations from API:', response.data.combinations); // Debug log
                        setTableCombinations(response.data.combinations || {});
                        setShowTableCombinations(true);
                        setSelectedTables([]); // Reset selected tables
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
                setSelectedTables([]);
                setTableCombinations({});
                setShowTableCombinations(false);
                return;
            }

            if (name === 'guest_count' && formData.slot_id && formData.date) {
                // Khi thay đổi số khách, cập nhật table combinations
                try {
                    const response = await axios.get(`/reservations/available-tables?date=${formData.date}&slot_id=${formData.slot_id}&guest_count=${value}`);
                    if (response?.data?.success) {
                        setTableCombinations(response.data.combinations || {});
                        setSelectedTables([]); // Reset selected tables
                    }
                } catch (error) {
                    console.error('Error updating table combinations:', error);
                }
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

        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;

            switch (modalType) {
                case 'add':
                    // Kiểm tra xem có sử dụng ghép bàn không
                    const tablesToReserve = selectedTables.length > 0
                        ? selectedTables.map(t => t._id)
                        : [formData.table_id];

                    // Validate table selection
                    if (tablesToReserve.length === 0 || (tablesToReserve.length === 1 && !tablesToReserve[0])) {
                        setError('Vui lòng chọn bàn');
                        return;
                    }

                    if (selectedTables.length > 0 && !isTableSelectionValid(formData.guest_count)) {
                        setError('Sức chứa các bàn đã chọn không đủ cho số lượng khách');
                        return;
                    }

                    const reservationData = {
                        contact_name: formData.contact_name,
                        contact_phone: formData.contact_phone,
                        contact_email: formData.contact_email,
                        date: formData.date,
                        slot_id: formData.slot_id,
                        guest_count: parseInt(formData.guest_count),
                        notes: formData.notes,
                        payment_status: 'pending'
                    };

                    // Thêm table_ids hoặc table_id tùy theo số lượng bàn
                    if (tablesToReserve.length > 1) {
                        reservationData.table_ids = tablesToReserve;
                    } else {
                        reservationData.table_id = tablesToReserve[0];
                    }

                    if (formData.pre_order_items && formData.pre_order_items.length > 0) {
                        reservationData.pre_order_items = formData.pre_order_items.filter(item => item.quantity > 0);
                    }

                    console.log('Sending reservation data:', reservationData); // Debug log
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
                        slot_id: formData.slot_id,
                        guest_count: parseInt(formData.guest_count),
                        status: formData.status,
                        payment_status: formData.payment_status,
                        notes: formData.notes
                    };

                    // Thêm pre_order_items (bao gồm cả mảng rỗng để xóa pre-order items)
                    if (formData.pre_order_items !== undefined) {
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

                case 'move':
                    response = await axios.patch(`/reservations/${formData._id}/move`, {
                        new_table_id: formData.new_table_id,
                        transfer_orders: true,
                        update_table_status: true
                    });

                    if (response?.data?.success) {
                        await axios.put(`/tables/${formData.table_id}/status`, { status: 'available' });
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

                case 'addMenuItems':
                    const orderItems = formData.order_items?.filter(item => item.quantity > 0) || [];

                    if (orderItems.length === 0) {
                        setError('Vui lòng chọn ít nhất một món');
                        return;
                    }

                    try {
                        let response;
                        if (formData.order_id) {
                            response = await axios.put(`/orders/${formData.order_id}`, {
                                order_items: orderItems,
                                status: formData.status,
                                note: formData.note
                            });
                        } else {
                            const orderData = {
                                table_id: formData.table_id,
                                order_items: orderItems,
                                note: formData.note
                            };

                            if (formData.reservation_id) {
                                orderData.reservation_id = formData.reservation_id;
                            }

                            response = await axios.post('/orders', orderData);
                        }

                        if (response?.data?.success) {
                            // Cập nhật trạng thái thanh toán cho reservation nếu cần
                            if (formData.reservation_id) {
                                try {
                                    const currentReservation = reservations.find(r => r._id === formData.reservation_id);
                                    // Cập nhật trạng thái thanh toán nếu đã thanh toán hoặc đã cọc
                                    if (currentReservation && ['paid', 'partial'].includes(currentReservation.payment_status)) {
                                        await axios.patch(`/reservations/${formData.reservation_id}/payment-status`, {
                                            payment_status: 'partial',
                                            payment_method: currentReservation.payment_method || 'bank_transfer',
                                            payment_note: 'Tự động cập nhật: Đã thêm món mới cần thanh toán thêm'
                                        });
                                    }
                                    // Nếu chưa cọc (pending), cập nhật thành partial để báo hiệu có món cần thanh toán
                                    else if (currentReservation && currentReservation.payment_status === 'pending') {
                                        await axios.patch(`/reservations/${formData.reservation_id}/payment-status`, {
                                            payment_status: 'partial',
                                            payment_method: 'cash',
                                            payment_note: 'Đã thêm món - cần thanh toán'
                                        });
                                    }
                                } catch (paymentUpdateError) {
                                    console.error('Error updating payment status:', paymentUpdateError);
                                    // Không throw error để không ảnh hưởng đến việc thêm món thành công
                                }
                            }

                            // Cập nhật dữ liệu ngay lập tức
                            await Promise.all([
                                loadReservations(),
                                loadAllTables(),
                                loadOrders()
                            ]);

                            // Đóng modal trước khi hiển thị thông báo
                            closeMenuModal();
                            alert('Thêm món thành công!');
                        } else {
                            setError(response?.data?.message || 'Lỗi khi thêm món');
                            return;
                        }
                    } catch (error) {
                        console.error('Error adding menu items:', error);
                        setError(error.response?.data?.message || 'Có lỗi xảy ra khi thêm món');
                        return;
                    }
                    break;

                default:
                    break;
            }

            await Promise.all([loadReservations(), loadAllTables(), loadOrders()]);
            closeModal();
        } catch (error) {
            console.error('Error submitting form:', error);
            setError(error.response?.data?.message || 'Có lỗi xảy ra khi xử lý yêu cầu');
        } finally {
            setLoading(false);
        }
    };

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
            setError('Lỗi khi tải thông tin hóa đơn');
        } finally {
            setLoading(false);
        }
    };

    // Set statusFilter nếu được truyền qua state
    useEffect(() => {
        if (location.state && location.state.statusFilter) {
            setStatusFilter(location.state.statusFilter);
        }
    }, [location.state]);

    // ==================== RENDER COMPONENT ====================
    return (
        <div className="table-management-content">
            {/* Header với thông báo */}
            <div className="table-management-header">
                <h1>Quản lý đặt bàn</h1>

                <div className="notification-section">

                    {showNotificationPanel && notifications.length > 0 && (
                        <div className="notification-panel">
                            <div className="notification-header">
                                <h3>Thông báo ({unreadCount} mới)</h3>
                                <div className="notification-actions">
                                    <button className="mark-all-read-btn" onClick={markAllAsRead}>
                                        Đánh dấu đã đọc
                                    </button>
                                    <button className="clear-all-btn" onClick={clearAllNotifications}>
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
                                            <div className="notification-title">{notification.title}</div>
                                            <div className="notification-message">{notification.message}</div>
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

            {/* Thông báo lỗi */}
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')} className="close-error">×</button>
                </div>
            )}

            {/* Nội dung chính */}
            <div className="reservations-view">
                <div className="reservations-header">
                    <h3>Danh sách đặt bàn</h3>
                    <div className="reservations-actions">
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

                {/* Bảng đặt bàn */}
                <div className="reservations-table" >
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
                                        <td>{safeGet(res, 'table_id.name') || 'N/A'}</td>
                                        <td>{res.contact_name}</td>
                                        <td>{res.contact_phone}</td>
                                        <td>{formatDate(res.date)}</td>
                                        <td>{getSlotDisplayText(safeGet(res, 'slot_id._id') || res.slot_id)}</td>
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
                                            {(() => {
                                                const totalItems = getTotalOrderedItems(res);
                                                const hasPreOrder = res.pre_order_items && res.pre_order_items.length > 0;
                                                const hasOrders = hasRelatedOrders(res);

                                                if (totalItems > 0) {
                                                    return (
                                                        <span className="has-pre-order" title={`${hasPreOrder ? 'Có đặt trước' : ''}${hasPreOrder && hasOrders ? ' + ' : ''}${hasOrders ? 'Có thêm món' : ''}`}>
                                                            {totalItems} món
                                                        </span>
                                                    );
                                                } else {
                                                    return <span className="no-pre-order">Không</span>;
                                                }
                                            })()}
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

                                                {res.status === 'seated' && (
                                                    <button
                                                        className="action-button complete"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCompleteReservation(res._id);
                                                        }}
                                                        disabled={loading}
                                                    >
                                                        Hoàn thành
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

                                                {/* Nút thanh toán - hiển thị khi có món và chưa thanh toán đầy đủ */}
                                                {(() => {
                                                    const hasItems = (res.pre_order_items && res.pre_order_items.length > 0) ||
                                                        hasRelatedOrders(res) ||
                                                        getTotalOrderedItems(res) > 0;
                                                    const needsPayment = ['pending', 'partial'].includes(res.payment_status);
                                                    const validStatus = ['pending', 'confirmed', 'seated'].includes(res.status);

                                                    return validStatus && hasItems && needsPayment;
                                                })() && (
                                                        <button
                                                            className="action-button payment-status"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openModal('updatePayment', res);
                                                            }}
                                                            disabled={loading}
                                                            title={`Cập nhật thanh toán - Tổng: ${getReservationTotal(res).toLocaleString()}đ`}
                                                        >
                                                            💰 Thanh toán ({getReservationTotal(res).toLocaleString()}đ)
                                                        </button>
                                                    )}

                                                {res.status === 'seated' && (
                                                    <button
                                                        className="action-button add-menu"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const tableInfo = allTables.find(t =>
                                                                t._id === (safeGet(res, 'table_id._id') || res.table_id)
                                                            );
                                                            if (tableInfo) {
                                                                openMenuModal(tableInfo, res);
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

                    {/* Phân trang */}
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
                                if (
                                    index === 0 ||
                                    index === getReservationTotalPages() - 1 ||
                                    Math.abs(index + 1 - reservationPage) <= 2
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

            {/* Panel chi tiết đặt bàn */}
            {selectedReservation && (
                <div className="reservation-details">
                    <h3>Chi tiết đặt bàn: #{selectedReservation._id.slice(-6)}</h3>
                    <div className="reservation-info-details">
                        <p><strong>Khách hàng:</strong> {selectedReservation.contact_name}</p>
                        <p><strong>Số điện thoại:</strong> {selectedReservation.contact_phone}</p>
                        <p><strong>Email:</strong> {selectedReservation.contact_email || 'N/A'}</p>
                        <p><strong>Bàn:</strong> {safeGet(selectedReservation, 'table_id.name') || 'N/A'}</p>
                        <p><strong>Ngày:</strong> {formatDate(selectedReservation.date)}</p>
                        <p><strong>Thời gian:</strong> {getSlotDisplayText(safeGet(selectedReservation, 'slot_id._id') || selectedReservation.slot_id)}</p>
                        <p><strong>Số khách:</strong> {selectedReservation.guest_count}</p>
                        <p><strong>Trạng thái:</strong>
                            <span className={`status-badge ${selectedReservation.status}`}>
                                {getReservationStatusLabel(selectedReservation.status)}
                            </span>
                        </p>
                        <p><strong>Thanh toán:</strong>
                            <span className={`payment-badge ${selectedReservation.payment_status || 'pending'}`}>
                                {getPaymentStatusLabel(selectedReservation.payment_status)}
                            </span>
                        </p>
                        <p><strong>Nguồn:</strong> {getStaffName(selectedReservation)}</p>
                        {selectedReservation.notes && (
                            <p><strong>Ghi chú:</strong> {selectedReservation.notes}</p>
                        )}
                    </div>

                    {/* Món đặt trước */}
                    {selectedReservation.pre_order_items && selectedReservation.pre_order_items.length > 0 && (
                        <div className="pre-order-section">
                            <h4>Món đã đặt trước</h4>
                            <div className="pre-order-items-list">
                                {selectedReservation.pre_order_items.map((item, index) => {
                                    if (!item || !item.menu_item_id) return null;

                                    const menuItem = typeof item.menu_item_id === 'object' ? item.menu_item_id :
                                        menuItems.find(m => m && m._id === item.menu_item_id);
                                    const menuName = menuItem ? menuItem.name : 'Món không xác định';
                                    const menuPrice = menuItem ? menuItem.price : 0;

                                    return (
                                        <div key={index} className="pre-order-item">
                                            <span>{menuName} x {item.quantity}</span>
                                            <span>{(menuPrice * item.quantity).toLocaleString()}đ</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Đơn hàng liên quan */}
                    {hasRelatedOrders(selectedReservation) && (
                        <div className="related-orders">
                            <h4>Đơn hàng liên quan</h4>
                            {orders.filter(order =>
                                order.reservation_id === selectedReservation._id ||
                                safeGet(order, 'reservation_id._id') === selectedReservation._id
                            ).map(order => (
                                <div key={order._id} className="order-item">
                                    <p><strong>Mã đơn:</strong> #{order._id.slice(-6)}</p>
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
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Forms */}
            {isModalOpen && (
                <div className="modal-overlay" >
                    <div className="modal-container" >
                        <div className="modal-header">
                            <h3>
                                {modalType === 'add' && 'Đặt bàn mới'}
                                {modalType === 'edit' && 'Chỉnh sửa đặt bàn'}
                                {modalType === 'move' && 'Chuyển bàn'}
                                {modalType === 'delete' && 'Xác nhận hủy đặt bàn'}
                                {modalType === 'updatePayment' && 'Cập nhật thanh toán'}
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
                                            min={new Date().toISOString().split('T')[0]}
                                            required
                                        />
                                    </div>

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

                                    <div className="form-group">
                                        <label>Số khách</label>
                                        <input
                                            type="number"
                                            name="guest_count"
                                            value={formData.guest_count || 1}
                                            onChange={handleInputChange}
                                            min="1"
                                            max="50"
                                            required
                                        />
                                    </div>

                                    {/* Hiển thị thông báo nếu không có bàn trống */}
                                    {formData.slot_id && formData.availableTables && formData.availableTables.length === 0 && (
                                        <div className="warning-message">
                                            <p>Đã hết bàn trống trong khung giờ này, vui lòng chọn khung giờ khác.</p>
                                        </div>
                                    )}

                                    {/* Hiển thị tính năng ghép bàn */}
                                    {showTableCombinations && formData.slot_id && formData.guest_count && (
                                        <div className="table-selection-section">
                                            <SelectedTablesSummary
                                                selectedTables={selectedTables}
                                                guestCount={parseInt(formData.guest_count)}
                                                getTotalCapacity={getTotalCapacity}
                                                onRemoveTable={handleTableSelect}
                                            />

                                            <TableCombinations
                                                combinations={getSuggestedCombinations(parseInt(formData.guest_count))}
                                                onTableSelect={handleTableSelect}
                                                onCombinationSelect={handleCombinationSelect}
                                                isTableSelected={isTableSelected}
                                                isCombinationSelected={isCombinationSelected}
                                            />
                                        </div>
                                    )}

                                    {/* Fallback: Chọn bàn đơn truyền thống (ẩn khi có table combinations) */}
                                    {!showTableCombinations && (
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
                                    )}

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
                                                            <span>Tổng tiền (trước giảm giá):</span>
                                                            <span>{calculatePreOrderTotal().toLocaleString()}đ</span>
                                                        </div>
                                                        <div className="pre-order-discount-row">
                                                            <span>Giảm giá 15%:</span>
                                                            <span>-{(calculatePreOrderTotal() * 0.15).toLocaleString()}đ</span>
                                                        </div>
                                                        <div className="pre-order-final-total-row">
                                                            <span><strong>Thành tiền:</strong></span>
                                                            <span><strong>{(calculatePreOrderTotal() * 0.85).toLocaleString()}đ</strong></span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="edit-pre-order-btn"
                                                        onClick={() => {
                                                            setIsModalOpen(false);
                                                            openPreOrderModal();
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
                                                            openPreOrderModal();
                                                        }}
                                                    >
                                                        Thêm món đặt trước
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Ghi chú</label>
                                        <textarea
                                            name="notes"
                                            value={formData.notes || ''}
                                            onChange={handleInputChange}
                                            rows="3"
                                        />
                                    </div>
                                </div>
                            ) : modalType === 'updatePayment' ? (
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Khách hàng: <strong>{formData.contact_name}</strong></label>
                                    </div>

                                    <div className="form-group">
                                        <label>Trạng thái thanh toán hiện tại</label>
                                        <span className={`payment-badge ${formData.current_payment_status}`}>
                                            {getPaymentStatusLabel(formData.current_payment_status)}
                                        </span>
                                    </div>

                                    <div className="form-group">
                                        <label>Trạng thái thanh toán mới</label>
                                        <select
                                            name="payment_status"
                                            value={formData.payment_status || 'pending'}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="pending">Chưa thanh toán</option>
                                            <option value="partial">Đã cọc</option>
                                            <option value="paid">Đã thanh toán đầy đủ</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Phương thức thanh toán</label>
                                        <select
                                            name="payment_method"
                                            value={formData.payment_method || 'bank_transfer'}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="cash">Tiền mặt</option>
                                            <option value="bank_transfer">Chuyển khoản</option>
                                            <option value="credit_card">Thẻ tín dụng</option>
                                            <option value="e_wallet">Ví điện tử</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Ghi chú thanh toán</label>
                                        <textarea
                                            name="payment_note"
                                            value={formData.payment_note || ''}
                                            onChange={handleInputChange}
                                            rows="3"
                                            placeholder="Ghi chú về thanh toán (tùy chọn)"
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
                                                    {table.name} ({table.capacity} người)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : modalType === 'delete' ? (
                                <div className="modal-body">
                                    <p>Bạn có chắc chắn muốn hủy đặt bàn này?</p>
                                    <p><strong>Khách hàng:</strong> {formData.contact_name}</p>
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
                                            {modalType === 'updatePayment' && 'Cập nhật thanh toán'}
                                            {modalType === 'move' && 'Chuyển bàn'}
                                            {modalType === 'delete' && 'Xác nhận hủy'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Menu để thêm món */}
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
                            </div>
                        </div>

                        <div className="menu-modal-footer">
                            <div className="order-summary">
                                <span>Tổng tiền: <strong>{calculateOrderTotal(formData.order_items).toLocaleString()}đ</strong></span>
                                <span>Số món: <strong>{(formData.order_items || []).reduce((total, item) => total + item.quantity, 0)}</strong></span>
                            </div>
                            <button
                                className="confirm-menu-btn"
                                onClick={async (e) => {
                                    e.preventDefault();
                                    setLoading(true);
                                    setError('');

                                    const orderItems = formData.order_items?.filter(item => item.quantity > 0) || [];
                                    if (orderItems.length === 0) {
                                        setError('Vui lòng chọn ít nhất một món');
                                        setLoading(false);
                                        return;
                                    }

                                    try {
                                        let response;
                                        if (formData.order_id) {
                                            response = await axios.put(`/orders/${formData.order_id}`, {
                                                order_items: orderItems,
                                                note: formData.note
                                            });
                                        } else {
                                            const orderData = {
                                                table_id: formData.table_id,
                                                order_items: orderItems,
                                                note: formData.note
                                            };

                                            if (formData.reservation_id) {
                                                orderData.reservation_id = formData.reservation_id;
                                            }

                                            response = await axios.post('/orders', orderData);
                                        }

                                        if (response?.data?.success) {
                                            // Cập nhật trạng thái thanh toán nếu cần
                                            if (formData.reservation_id) {
                                                try {
                                                    const currentReservation = reservations.find(r => r._id === formData.reservation_id);
                                                    // Cập nhật trạng thái thanh toán nếu đã thanh toán hoặc đã cọc
                                                    if (currentReservation && ['paid', 'partial'].includes(currentReservation.payment_status)) {
                                                        await axios.patch(`/reservations/${formData.reservation_id}/payment-status`, {
                                                            payment_status: 'partial',
                                                            payment_method: currentReservation.payment_method || 'bank_transfer',
                                                            payment_note: 'Tự động cập nhật: Đã thêm món mới cần thanh toán thêm'
                                                        });
                                                    }
                                                    // Nếu chưa cọc (pending), cập nhật thành partial để báo hiệu có món cần thanh toán
                                                    else if (currentReservation && currentReservation.payment_status === 'pending') {
                                                        await axios.patch(`/reservations/${formData.reservation_id}/payment-status`, {
                                                            payment_status: 'partial',
                                                            payment_method: 'cash',
                                                            payment_note: 'Đã thêm món - cần thanh toán'
                                                        });
                                                    }
                                                } catch (paymentUpdateError) {
                                                    console.error('Error updating payment status:', paymentUpdateError);
                                                    // Không throw error để không ảnh hưởng đến việc thêm món thành công
                                                }
                                            }

                                            // Cập nhật tất cả dữ liệu
                                            await Promise.all([
                                                loadReservations(),
                                                loadAllTables(),
                                                loadOrders()
                                            ]);

                                            // Đóng modal và reset
                                            closeMenuModal();
                                            alert('Thêm món thành công!');
                                        } else {
                                            setError(response?.data?.message || 'Lỗi khi thêm món');
                                        }
                                    } catch (error) {
                                        console.error('Error adding items:', error);
                                        setError('Có lỗi xảy ra khi thêm món');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading || (formData.order_items || []).filter(item => item.quantity > 0).length === 0}
                            >
                                {loading ? 'Đang xử lý...' : 'Xác nhận thêm món'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pre-order Modal */}
            {showPreOrderModal && (
                <div className="menu-modal-overlay">
                    <div className="menu-modal" key={`pre-order-modal-${formData.contact_name || 'new'}`}>
                        <div className="menu-modal-header">
                            <h3>Món đặt trước - {formData.contact_name || 'Khách hàng mới'}</h3>
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
                                            ? "Thực đơn"
                                            : categories.find((c) => c._id === selectedCategory)?.name || ""}
                                    </h2>
                                </div>

                                <div className="menu-items-grid">
                                    {getFilteredMenuItems().map((item) => {
                                        const preOrderItem = (formData.pre_order_items || [])
                                            .find(i => i.menu_item_id === item._id);
                                        const quantity = preOrderItem ? parseInt(preOrderItem.quantity) || 0 : 0;

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
                                                            onClick={() => handlePreOrderItemChange(item._id, Math.max(0, quantity - 1))}
                                                            disabled={quantity <= 0}
                                                        >-</button>
                                                        <span className="quantity-display">{quantity}</span>
                                                        <button
                                                            type="button"
                                                            className="quantity-btn"
                                                            onClick={() => handlePreOrderItemChange(item._id, quantity + 1)}
                                                        >+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="menu-modal-footer">
                            <div className="order-summary">
                                <div className="pre-order-pricing">
                                    <span>Tổng tiền (trước giảm giá): <strong>{calculatePreOrderTotal().toLocaleString()}đ</strong></span>
                                    <span>Giảm giá 15%: <strong>-{(calculatePreOrderTotal() * 0.15).toLocaleString()}đ</strong></span>
                                    <span>Thành tiền: <strong>{(calculatePreOrderTotal() * 0.85).toLocaleString()}đ</strong></span>
                                </div>
                                <span>Số món: <strong>{getPreOrderItemsCount()}</strong></span>
                            </div>
                            <button
                                className="confirm-menu-btn"
                                onClick={() => {
                                    closePreOrderModal();
                                    setIsModalOpen(true);
                                }}
                            >
                                Xác nhận món đặt trước
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* In hóa đơn */}
            {showInvoice && invoiceData && (
                <InvoicePrint
                    invoiceData={invoiceData}
                    onClose={() => setShowInvoice(false)}
                />
            )}
        </div>
    );
};

export default ReservationManagement;
