import React, { useState, useEffect } from 'react';
import axios from '../../../utils/axios.customize';
import './WaiterReservations.css';

const WaiterReservations = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchReservations();
    }, [selectedDate, filterStatus]);

    const fetchReservations = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/reservations/waiter?date=${selectedDate}&status=${filterStatus}`);
            if (response.data.success) {
                setReservations(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching reservations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (reservationId, newStatus) => {
        try {
            const response = await axios.patch(`/reservations/${reservationId}/status`, {
                status: newStatus
            });

            if (response.data.success) {
                fetchReservations(); // Refresh data
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleAddNotes = async (reservationId) => {
        try {
            const response = await axios.patch(`/reservations/${reservationId}`, {
                notes: notes
            });

            if (response.data.success) {
                fetchReservations();
                setShowNotesModal(false);
                setNotes('');
            }
        } catch (error) {
            console.error('Error updating notes:', error);
        }
    };

    const handleViewReservation = (reservation) => {
        setSelectedReservation(reservation);
    };

    const closeReservationModal = () => {
        setSelectedReservation(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#ff9800';
            case 'confirmed': return '#2196f3';
            case 'seated': return '#4caf50';
            case 'completed': return '#4caf50';
            case 'cancelled': return '#f44336';
            case 'no_show': return '#9e9e9e';
            default: return '#757575';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Chờ xác nhận';
            case 'confirmed': return 'Đã xác nhận';
            case 'seated': return 'Đã ngồi';
            case 'completed': return 'Hoàn thành';
            case 'cancelled': return 'Đã hủy';
            case 'no_show': return 'Không đến';
            default: return status;
        }
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        return timeString.substring(0, 5); // Format HH:MM
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    if (loading) {
        return (
            <div className="waiter-reservations">
                <div className="loading">Đang tải danh sách đặt bàn...</div>
            </div>
        );
    }

    return (
        <div className="waiter-reservations">
            <div className="reservations-header">
                <h1>📅 Quản lý đặt bàn</h1>
                <button onClick={fetchReservations} className="refresh-btn">
                    🔄 Làm mới
                </button>
            </div>

            <div className="filters">
                <div className="filter-group">
                    <label>Ngày:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="date-input"
                    />
                </div>

                <div className="filter-group">
                    <label>Trạng thái:</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="status-select"
                    >
                        <option value="all">Tất cả</option>
                        <option value="pending">Chờ xác nhận</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="seated">Đã ngồi</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                        <option value="no_show">Không đến</option>
                    </select>
                </div>
            </div>

            <div className="reservations-list">
                {reservations.length === 0 ? (
                    <div className="no-reservations">
                        <p>📭 Không có đặt bàn nào cho ngày này</p>
                    </div>
                ) : (
                    reservations.map(reservation => (
                        <div key={reservation._id} className="reservation-card">
                            <div className="reservation-header">
                                <div className="customer-info">
                                    <h3>👤 {reservation.contact_name}</h3>
                                    <p>📞 {reservation.contact_phone}</p>
                                    <p>👥 {reservation.guest_count} người</p>
                                </div>

                                <div className="reservation-status">
                                    <span
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(reservation.status) }}
                                    >
                                        {getStatusText(reservation.status)}
                                    </span>
                                </div>
                            </div>

                            <div className="reservation-details">
                                <div className="detail-item">
                                    <span className="label">🪑 Bàn:</span>
                                    <span>{reservation.tables?.map(t => t.name).join(', ') || 'N/A'}</span>
                                </div>

                                <div className="detail-item">
                                    <span className="label">📅 Ngày:</span>
                                    <span>{formatDate(reservation.date)}</span>
                                </div>

                                <div className="detail-item">
                                    <span className="label">⏰ Giờ:</span>
                                    <span>{formatTime(reservation.slot_start_time)} - {formatTime(reservation.slot_end_time)}</span>
                                </div>

                                {reservation.notes && (
                                    <div className="detail-item">
                                        <span className="label">📝 Ghi chú:</span>
                                        <span>{reservation.notes}</span>
                                    </div>
                                )}
                            </div>

                            <div className="reservation-actions">
                                <button
                                    onClick={() => handleViewReservation(reservation)}
                                    className="action-btn view-btn"
                                >
                                    👁️ Xem chi tiết
                                </button>

                                <button
                                    onClick={() => {
                                        setSelectedReservation(reservation);
                                        setNotes(reservation.notes || '');
                                        setShowNotesModal(true);
                                    }}
                                    className="action-btn notes-btn"
                                >
                                    📝 Ghi chú
                                </button>

                                {reservation.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleStatusUpdate(reservation._id, 'confirmed')}
                                            className="action-btn confirm-btn"
                                        >
                                            ✅ Xác nhận
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(reservation._id, 'cancelled')}
                                            className="action-btn cancel-btn"
                                        >
                                            ❌ Hủy
                                        </button>
                                    </>
                                )}

                                {reservation.status === 'confirmed' && (
                                    <button
                                        onClick={() => handleStatusUpdate(reservation._id, 'seated')}
                                        className="action-btn seat-btn"
                                    >
                                        🪑 Check-in
                                    </button>
                                )}

                                {reservation.status === 'seated' && (
                                    <button
                                        onClick={() => handleStatusUpdate(reservation._id, 'completed')}
                                        className="action-btn complete-btn"
                                    >
                                        ✅ Hoàn thành
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Reservation Detail Modal */}
            {selectedReservation && (
                <div className="modal-overlay" onClick={closeReservationModal}>
                    <div className="reservation-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Chi tiết đặt bàn - {selectedReservation.contact_name}</h2>
                            <button onClick={closeReservationModal} className="close-btn">×</button>
                        </div>

                        <div className="modal-content">
                            <div className="reservation-details-modal">
                                <div className="detail-row">
                                    <span className="label">Khách hàng:</span>
                                    <span>{selectedReservation.contact_name}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Số điện thoại:</span>
                                    <span>{selectedReservation.contact_phone}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Email:</span>
                                    <span>{selectedReservation.contact_email || 'Không có'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Số lượng khách:</span>
                                    <span>{selectedReservation.guest_count} người</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Bàn:</span>
                                    <span>{selectedReservation.tables?.map(t => t.name).join(', ') || 'N/A'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Ngày:</span>
                                    <span>{formatDate(selectedReservation.date)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Giờ:</span>
                                    <span>{formatTime(selectedReservation.slot_start_time)} - {formatTime(selectedReservation.slot_end_time)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Trạng thái:</span>
                                    <span className="status-text" style={{ color: getStatusColor(selectedReservation.status) }}>
                                        {getStatusText(selectedReservation.status)}
                                    </span>
                                </div>
                                {selectedReservation.notes && (
                                    <div className="detail-row">
                                        <span className="label">Ghi chú:</span>
                                        <span>{selectedReservation.notes}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notes Modal */}
            {showNotesModal && selectedReservation && (
                <div className="modal-overlay" onClick={() => setShowNotesModal(false)}>
                    <div className="notes-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Ghi chú - {selectedReservation.contact_name}</h2>
                            <button onClick={() => setShowNotesModal(false)} className="close-btn">×</button>
                        </div>

                        <div className="modal-content">
                            <div className="notes-form">
                                <label>Ghi chú:</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Nhập ghi chú cho khách hàng..."
                                    rows={4}
                                    className="notes-textarea"
                                />
                                <div className="notes-actions">
                                    <button
                                        onClick={() => setShowNotesModal(false)}
                                        className="cancel-btn"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={() => handleAddNotes(selectedReservation._id)}
                                        className="save-btn"
                                    >
                                        Lưu
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaiterReservations; 