import React, { useState, useEffect } from 'react';
import customFetch from '../../../utils/axios.customize';
import './Reservation.css';

const STATUS_COLORS = {
  pending: '#ffc107',
  confirmed: '#17a2b8',
  seated: '#28a745',
  completed: '#6c757d',
  cancelled: '#dc3545'
};

const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  seated: 'Đã vào bàn',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

export default function MyReservations({ userId = null, title = "Danh sách đặt bàn của tôi" }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, pending, confirmed, seated, completed, cancelled

  useEffect(() => {
    fetchReservations();
  }, [userId]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError('');

      let response;
      let targetUserId = userId;

      // Nếu không có userId được truyền vào, lấy từ localStorage
      if (!targetUserId) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            // Xử lý cả trường hợp user trực tiếp hoặc user.user
            if (user.user && user.user.id) {
              targetUserId = user.user.id;
            } else if (user.id) {
              targetUserId = user.id;
            } else if (user._id) {
              targetUserId = user._id;
            }
          } catch (e) {
            console.error('Error parsing user data from localStorage:', e);
          }
        }
      }

      if (targetUserId) {
        // Lấy đặt bàn theo userId cụ thể
        response = await customFetch.get(`/reservations/my-reservations/${targetUserId}`);
      } else {
        setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        return;
      }

      if (response?.data?.success) {
        // Sắp xếp theo thời gian mới nhất trước
        const sortedReservations = (response.data.data || []).sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at);
        });
        setReservations(sortedReservations);
      } else {
        setError('Không thể tải danh sách đặt bàn');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Lỗi khi tải danh sách đặt bàn');
    } finally {
      setLoading(false);
    }
  };

  // Lọc reservations theo tab hiện tại
  const getFilteredReservations = () => {
    if (activeTab === 'all') {
      return reservations;
    }
    return reservations.filter(reservation => reservation.status === activeTab);
  };

  // Đếm số lượng theo từng trạng thái
  const getStatusCount = (status) => {
    if (status === 'all') {
      return reservations.length;
    }
    return reservations.filter(reservation => reservation.status === status).length;
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đặt bàn này?')) {
      return;
    }

    try {
      await customFetch.patch(`/reservations/${reservationId}/cancel`);
      setReservations(prev =>
        prev.map(res =>
          res._id === reservationId
            ? { ...res, status: 'cancelled' }
            : res
        )
      );
    } catch (err) {
      setError(err?.response?.data?.message || 'Lỗi khi hủy đặt bàn');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  if (loading) {
    return (
      <div className="my-reservations-container">
        <div className="loading">Đang tải danh sách đặt bàn...</div>
      </div>
    );
  }

  return (
    <div className="my-reservations-container">
      <h2>{title}</h2>

      {error && <div className="error-message">{error}</div>}

      {reservations.length === 0 ? (
        <div className="no-reservations">
          <p>Chưa có đặt bàn nào.</p>
          {!userId && (
            <a href="/reservation" className="book-now-btn">Đặt bàn ngay</a>
          )}
        </div>
      ) : (
        <>
          {/* Status Tabs */}
          <div className="status-tabs">
            <button
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả ({getStatusCount('all')})
            </button>
            <button
              className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Chờ xác nhận ({getStatusCount('pending')})
            </button>
            <button
              className={`tab-btn ${activeTab === 'confirmed' ? 'active' : ''}`}
              onClick={() => setActiveTab('confirmed')}
            >
              Đã xác nhận ({getStatusCount('confirmed')})
            </button>
            <button
              className={`tab-btn ${activeTab === 'seated' ? 'active' : ''}`}
              onClick={() => setActiveTab('seated')}
            >
              Đã vào bàn ({getStatusCount('seated')})
            </button>
            <button
              className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Hoàn thành ({getStatusCount('completed')})
            </button>
            <button
              className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
              onClick={() => setActiveTab('cancelled')}
            >
              Đã hủy ({getStatusCount('cancelled')})
            </button>
          </div>

          {/* Reservations List */}
          <div className="reservations-list">
            {getFilteredReservations().length === 0 ? (
              <div className="no-reservations-in-tab">
                <p>Không có đặt bàn nào ở trạng thái này.</p>
              </div>
            ) : (
              getFilteredReservations().map(reservation => (
                <div key={reservation._id} className="reservation-card">
                  <div className="reservation-header">
                    <div className="reservation-info">
                      <h3>Đặt bàn #{reservation._id.slice(-6)}</h3>
                      <div className="reservation-meta">
                        <span className="date">
                          📅 {formatDate(reservation.date)}
                        </span>
                        <span className="time">
                          ⏰ {formatTime(reservation.slot_start_time)} - {formatTime(reservation.slot_end_time)}
                        </span>
                        <span className="guests">
                          👥 {reservation.guest_count} người
                        </span>
                      </div>
                    </div>
                    <div className="reservation-status">
                      <span
                        className="status-badge"
                        style={{ backgroundColor: STATUS_COLORS[reservation.status] }}
                      >
                        {STATUS_LABELS[reservation.status]}
                      </span>
                    </div>
                  </div>

                  <div className="reservation-details">
                    <div className="detail-row">
                      <span className="label">Bàn:</span>
                      <span className="value">
                        {reservation.table_ids && reservation.table_ids.length > 1 ? (
                          <div className="multiple-tables">
                            {reservation.table_ids.map((table, index) => (
                              <span key={table._id || table} className="table-name">
                                {typeof table === 'object' && table.name ? table.name : (table._id || table)}
                                {index < reservation.table_ids.length - 1 && ' + '}
                              </span>
                            ))}
                          </div>
                        ) : (
                          (reservation.table_id && typeof reservation.table_id === 'object' && reservation.table_id.name) ||
                          (reservation.table_ids && reservation.table_ids[0] && typeof reservation.table_ids[0] === 'object' && reservation.table_ids[0].name) ||
                          (reservation.table_id || reservation.table_ids?.[0] || 'N/A')
                        )}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Khu vực:</span>
                      <span className="value">
                        {reservation.table_ids && reservation.table_ids.length > 1 ? (
                          <div className="multiple-areas">
                            {[...new Set(reservation.table_ids.map(table =>
                              typeof table === 'object' && table.area_id && typeof table.area_id === 'object' ?
                                table.area_id.name : 'N/A'
                            ))].join(', ')}
                          </div>
                        ) : (
                          (reservation.table_id && typeof reservation.table_id === 'object' && reservation.table_id.area_id && typeof reservation.table_id.area_id === 'object' && reservation.table_id.area_id.name) ||
                          (reservation.table_ids && reservation.table_ids[0] && typeof reservation.table_ids[0] === 'object' && reservation.table_ids[0].area_id && typeof reservation.table_ids[0].area_id === 'object' && reservation.table_ids[0].area_id.name) ||
                          'N/A'
                        )}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Liên hệ:</span>
                      <span className="value">{reservation.contact_name} - {reservation.contact_phone}</span>
                    </div>
                    {reservation.notes && (
                      <div className="detail-row">
                        <span className="label">Ghi chú:</span>
                        <span className="value">{reservation.notes}</span>
                      </div>
                    )}
                    {reservation.pre_order_items && reservation.pre_order_items.length > 0 && (
                      <div className="pre-order-items">
                        <span className="label">Món đặt trước:</span>
                        <div className="items-list">
                          {reservation.pre_order_items.map((item, index) => (
                            <div key={index} className="item">
                              {item.menu_item_id?.name} - {item.quantity} phần
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="reservation-actions">
                    {reservation.status === 'pending' && !userId && (
                      <button
                        className="cancel-btn"
                        onClick={() => handleCancelReservation(reservation._id)}
                      >
                        Hủy đặt bàn
                      </button>
                    )}
                    {reservation.status === 'confirmed' && (
                      <div className="confirmed-info">
                        ✅ Đặt bàn đã được xác nhận. Vui lòng đến đúng giờ!
                      </div>
                    )}
                    {reservation.status === 'seated' && (
                      <div className="seated-info">
                        🍽️ Bạn đang được phục vụ. Chúc ngon miệng!
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .my-reservations-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
        }
        
        .my-reservations-container h2 {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 24px;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }
        
        .no-reservations {
          text-align: center;
          padding: 40px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .book-now-btn {
          display: inline-block;
          background: #7a6c2f;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          margin-top: 16px;
          transition: background 0.2s;
        }
        
        .book-now-btn:hover {
          background: #f7b731;
        }
        
        .reservations-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .reservation-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e9ecef;
        }
        
        .reservation-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .reservation-info h3 {
          margin: 0 0 8px 0;
          color: #2c3e50;
          font-size: 1.2rem;
        }
        
        .reservation-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .reservation-meta span {
          color: #666;
          font-size: 0.9rem;
        }
        
        .status-badge {
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .reservation-details {
          margin-bottom: 16px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f3f5;
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .label {
          font-weight: 500;
          color: #666;
        }
        
        .value {
          color: #2c3e50;
        }
        
        .pre-order-items {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f1f3f5;
        }
        
        .items-list {
          margin-top: 8px;
        }
        
        .item {
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          margin: 2px 0;
          font-size: 0.9rem;
        }
        
        .reservation-actions {
          display: flex;
          justify-content: center;
          margin-top: 16px;
        }
        
        .cancel-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        
        .cancel-btn:hover {
          background: #c82333;
        }
        
        .confirmed-info,
        .seated-info {
          background: #d4edda;
          color: #155724;
          padding: 12px;
          border-radius: 6px;
          text-align: center;
          font-weight: 500;
        }
        
        @media (max-width: 600px) {
          .my-reservations-container {
            padding: 16px;
          }
          
          .reservation-header {
            flex-direction: column;
            gap: 12px;
          }
          
          .reservation-meta {
            flex-direction: column;
            gap: 8px;
          }
          
          .detail-row {
            flex-direction: column;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
} 