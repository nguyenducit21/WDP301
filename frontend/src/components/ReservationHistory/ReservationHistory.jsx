import React, { useEffect, useState } from "react";
import "./ReservationHistory.css";
import axios from "../../utils/axios.customize"; // Sử dụng axios customize

const STATUS_MAPPING = {
  "pending": "Chờ xác nhận",
  "confirmed": "Đã xác nhận",
  "cancelled": "Đã hủy",
  "completed": "Hoàn thành",
  "no_show": "Không đến"
};

const STATUS_COLOR = {
  "pending": "pending",
  "confirmed": "confirmed",
  "cancelled": "cancelled",
  "completed": "completed",
  "no_show": "no_show"
};

const ReservationHistory = ({ userId }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    name: "",
    email: "",
    phone: "",
    status: "",
  });

  // Utility function for safe object access (từ TableManagement)
  const safeGet = (obj, path, defaultValue = null) => {
    try {
      return path.split('.').reduce((o, p) => o && o[p], obj) || defaultValue;
    } catch {
      return defaultValue;
    }
  };

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true);
        setError('');

        // Sử dụng endpoint giống như trong TableManagement
        const response = await axios.get('/reservations/my-reservations');

        console.log('API Response:', response.data);

        if (response?.data?.success && Array.isArray(response.data.data)) {
          const validReservations = response.data.data.filter(res =>
            res && res._id
          );
          setReservations(validReservations);
        } else {
          setReservations([]);
        }
      } catch (error) {
        console.error('Lỗi khi lấy lịch sử đặt bàn:', error);
        setError('Lỗi khi tải dữ liệu đặt bàn');

        // Log chi tiết lỗi để debug
        if (error.response) {
          console.error('Error response:', error.response.data);
          console.error('Error status:', error.response.status);
        }
        setReservations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  const handleFilter = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // Format date để hiển thị (cải thiện từ TableManagement)
  const formatDate = (date) => {
    if (!date) return "Chưa có";
    try {
      return new Date(date).toLocaleDateString('vi-VN');
    } catch {
      return "Ngày không hợp lệ";
    }
  };

  // Format time để hiển thị
  const formatTime = (time) => {
    if (!time) return "";
    return time;
  };

  // Lọc dữ liệu với safe access
  const filtered = reservations.filter((rsv) => {
    if (!rsv) return false;

    const customerName = safeGet(rsv, 'customer_id.full_name') || rsv.contact_name || "";
    const customerEmail = safeGet(rsv, 'customer_id.email') || rsv.contact_email || "";
    const customerPhone = safeGet(rsv, 'customer_id.phone') || rsv.contact_phone || "";
    const status = STATUS_MAPPING[rsv.status] || rsv.status || "";

    return (
      customerName.toLowerCase().includes(filters.name.toLowerCase()) &&
      customerEmail.toLowerCase().includes(filters.email.toLowerCase()) &&
      customerPhone.toLowerCase().includes(filters.phone.toLowerCase()) &&
      status.toLowerCase().includes(filters.status.toLowerCase())
    );
  });

  return (
    <div className="reservation-history-container">
      <h1 className="page-title">Lịch sử đặt bàn</h1>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      <div className="reservation-filters">
        <input
          name="name"
          placeholder="Tìm theo tên"
          value={filters.name}
          onChange={handleFilter}
        />
        <input
          name="email"
          placeholder="Tìm theo email"
          value={filters.email}
          onChange={handleFilter}
        />
        <input
          name="phone"
          placeholder="Tìm theo số điện thoại"
          value={filters.phone}
          onChange={handleFilter}
        />
        <select
          name="status"
          value={filters.status}
          onChange={handleFilter}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="chờ xác nhận">Chờ xác nhận</option>
          <option value="đã xác nhận">Đã xác nhận</option>
          <option value="đã hủy">Đã hủy</option>
          <option value="hoàn thành">Hoàn thành</option>
          <option value="không đến">Không đến</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="no-data">
          {reservations.length === 0
            ? "Bạn chưa có lịch sử đặt bàn nào."
            : "Không tìm thấy kết quả phù hợp với bộ lọc."}
        </div>
      ) : (
        <div className="reservation-list">
          {filtered.map((rsv) => {
            if (!rsv || !rsv._id) return null;

            return (
              <div className="reservation-item" key={rsv._id}>
                <div className="rsv-header">
                  <span className="rsv-name">
                    {safeGet(rsv, 'customer_id.full_name') || rsv.contact_name || "Khách hàng"}
                  </span>
                  <span className={`rsv-status ${STATUS_COLOR[rsv.status] || ""}`}>
                    {STATUS_MAPPING[rsv.status] || rsv.status}
                  </span>
                </div>


                <div className="rsv-details-grid">
                  <span>
                    <b>Email:</b> {safeGet(rsv, 'customer_id.email') || rsv.contact_email || "Chưa có"}
                  </span>
                  <span>
                    <b>Số điện thoại:</b> {safeGet(rsv, 'customer_id.phone') || rsv.contact_phone || "Chưa có"}
                  </span>
                  <span>
                    <b>Ngày đặt:</b> {formatDate(rsv.date)} {formatTime(rsv.time)}
                  </span>
                  <span>
                    <b>Mã đặt bàn:</b> #{rsv._id?.slice(-6) || rsv._id}
                  </span>
                  <span>
                    <b>Số người:</b> {rsv.guest_count || 0}
                  </span>
                  <span>
                    <b>Số bàn:</b> {safeGet(rsv, 'table_id.name') || "Chưa có"}
                  </span>

                  {rsv.notes && (
                    <span>
                      <b>Ghi chú:</b> {rsv.notes}
                    </span>
                  )}
                </div>

                <div className="rsv-footer">
                  <span className="rsv-amount">
                    <b>Tiền cọc:</b> {Number(rsv.deposit_amount || 0).toLocaleString()} VND
                  </span>
                  <div>
                    <button
                      className="btn-detail"
                      onClick={() => {
                        console.log('Xem chi tiết:', rsv._id);
                        // Implement xem chi tiết
                      }}
                    >
                      XEM CHI TIẾT
                    </button>
                    {rsv.status === 'pending' && (
                      <button
                        className="btn-cancel"
                        onClick={() => {
                          console.log('Hủy đặt bàn:', rsv._id);
                          // Implement hủy đặt bàn
                        }}
                      >
                        HỦY ĐẶT BÀN
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReservationHistory;
