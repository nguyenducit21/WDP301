import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../../utils/axios.customize';

const ReservationManagement = () => {
    // State
    const [loading, setLoading] = useState(false);
    const [reservations, setReservations] = useState([]);
    const [orders, setOrders] = useState([]);
    const [filterByDate, setFilterByDate] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().slice(0, 10);
    });
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [reservationPage, setReservationPage] = useState(1);
    const reservationsPerPage = 10;

    // Fetch reservations
    const loadReservations = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                limit: '1000',
                sort: '-created_at'
            });
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }
            if (filterByDate) {
                params.append('date', selectedDate);
            }
            const response = await axios.get(`/reservations?${params}`);
            if (response?.data?.success && Array.isArray(response.data.data)) {
                setReservations(response.data.data.filter(res => res && res._id));
                setReservationPage(1);
            }
        } catch (error) {
            // handle error
        } finally {
            setLoading(false);
        }
    }, [statusFilter, selectedDate, filterByDate]);

    // Fetch orders
    const loadOrders = useCallback(async () => {
        try {
            const response = await axios.get('/orders?limit=1000&sort=-created_at');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                setOrders(response.data.data.filter(order => order && order._id));
            }
        } catch (error) {
            // handle error
        }
    }, []);

    useEffect(() => {
        loadReservations();
    }, [loadReservations]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    // Helpers
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
        return reservation?.created_by?.name || reservation?.created_by?.username || 'N/A';
    };
    const getTotalOrderedItems = (reservation) => {
        let total = 0;
        if (reservation.pre_order_items && reservation.pre_order_items.length > 0) {
            total += reservation.pre_order_items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }
        orders.forEach(order => {
            if (order.reservation_id === reservation._id || order.reservation_id?._id === reservation._id) {
                if (order.order_items && Array.isArray(order.order_items)) {
                    total += order.order_items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                }
            }
        });
        return total;
    };
    const hasRelatedOrders = (reservation) => {
        return orders.some(order => order.reservation_id === reservation._id || order.reservation_id?._id === reservation._id);
    };
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };
    const getSlotDisplayText = (slot_id) => {
        // Tùy vào dữ liệu slot, có thể fetch thêm nếu cần
        return slot_id || '';
    };
    // Sort and paginate
    const getSortedReservations = () => {
        return [...reservations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    };
    const getPaginatedReservations = () => {
        const sorted = getSortedReservations();
        const start = (reservationPage - 1) * reservationsPerPage;
        return sorted.slice(start, start + reservationsPerPage);
    };
    const getReservationTotalPages = () => {
        return Math.ceil(getSortedReservations().length / reservationsPerPage);
    };
    const handleReservationClick = (res) => {
        setSelectedReservation(res);
    };
    // Actions (dummy, cần làm thêm nếu muốn sửa/xác nhận...)
    const openModal = () => { };
    const handleConfirmReservation = () => { };
    const handleSeatCustomer = () => { };

    return (
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
                                    <td>{res.table_id?.name || (res.table_ids && res.table_ids.length > 0 ?
                                        res.table_ids.map(t => t?.name || '').join(', ') : 'N/A')}</td>
                                    <td>{res.contact_name}</td>
                                    <td>{res.contact_phone}</td>
                                    <td>{formatDate(res.date)}</td>
                                    <td>
                                        {res.slot_id ? (
                                            <span className="time-slot-display">
                                                {res.slot_id?.name
                                                    ? `${res.slot_id.name} (${res.slot_id.start_time}-${res.slot_id.end_time})`
                                                    : (res.slot_start_time && res.slot_end_time)
                                                        ? `${res.slot_start_time}-${res.slot_end_time}`
                                                        : getSlotDisplayText(res.slot_id?._id || res.slot_id)
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
                                            orders.some(order => order.reservation_id === res._id || order.reservation_id?._id === res._id) ? (
                                            <span className="has-pre-order" title="Có đặt món">
                                                {getTotalOrderedItems(res)} món
                                            </span>
                                        ) : (
                                            <span className="no-pre-order">Không</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {/* Các nút thao tác có thể bổ sung sau */}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {/* Pagination */}
                {!loading && getSortedReservations().length > 0 && (
                    <div className="pagination">
                        <button
                            onClick={() => setReservationPage(reservationPage - 1)}
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
                                        onClick={() => setReservationPage(index + 1)}
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
                            onClick={() => setReservationPage(reservationPage + 1)}
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
    );
};

export default ReservationManagement;