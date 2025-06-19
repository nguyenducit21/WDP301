import React, { useState, useEffect, useCallback } from "react";
import customFetch from "../../utils/axios.customize";
import { useBookingSlots } from "./BookingSlotManager";
import "./Reservation.css";

const OPEN_HOUR = 6; // 6:00 AM
const CLOSE_HOUR = 22; // 10:00 PM
const SLOT_DURATION = 1; // 1 tiếng/slot
const RESERVE_DURATION = 1; // 1 tiếng cho mỗi bàn đặt

function getTimeSlots() {
  const slots = [];
  for (let h = OPEN_HOUR; h <= CLOSE_HOUR - RESERVE_DURATION; h += SLOT_DURATION) {
    const hourStr = h.toString().padStart(2, "0");
    slots.push(`${hourStr}:00`);
  }
  return slots;
}

function addHoursToTime(timeStr, hours) {
  const [h, m] = timeStr.split(":").map(Number);
  let endH = h + hours;
  if (endH >= 24) endH -= 24;
  return `${endH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// Validation thời gian đặt bàn
function validateBookingTime(date, time) {
  const now = new Date();
  const bookingDate = new Date(date);
  const [hours, minutes] = time.split(":").map(Number);
  const slotTime = new Date(bookingDate);
  slotTime.setHours(hours, minutes);

  // Không cho đặt bàn trong quá khứ
  if (bookingDate < now) {
    return "Không thể đặt bàn cho thời gian trong quá khứ";
  }

  // Nếu đặt trong ngày, kiểm tra giờ
  if (bookingDate.toDateString() === now.toDateString()) {
    const minBookingTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 giờ trước
    if (slotTime < minBookingTime) {
      return "Vui lòng đặt bàn trước ít nhất 1 giờ so với thời gian bắt đầu";
    }
  }

  return null;
}

export default function ReservationForm() {
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [error, setError] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    guest_count: 1,
    date: "",
    slot_id: "",
    note: "",
    pre_order_items: []
  });
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [availableTables, setAvailableTables] = useState([]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const timeSlots = getTimeSlots();

  // Sử dụng hook booking slots
  const { slots, getSlotIdFromTime, getTimeFromSlotId } = useBookingSlots();

  // Memoize the getSlotIdFromTime function to prevent infinite re-renders
  const memoizedGetSlotIdFromTime = useCallback((time) => {
    return getSlotIdFromTime(time);
  }, [getSlotIdFromTime]);

  // Ngày hôm nay (yyyy-mm-dd)
  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch areas on mount
  useEffect(() => {
    setLoadingAreas(true);
    customFetch
      .get("/areas")
      .then((res) => {
        setAreas(res.data.data || res.data);
        setSelectedArea(res.data.data?.[0] || res.data?.[0] || null);
      })
      .catch(() => setError("Không lấy được danh sách khu vực"))
      .finally(() => setLoadingAreas(false));
  }, []);

  // Fetch menu items and categories
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoadingMenu(true);

        // Fetch menu items
        const menuResponse = await customFetch.get('/menu-items');
        if (menuResponse?.data?.success && Array.isArray(menuResponse.data.data)) {
          setMenuItems(menuResponse.data.data);
        }

        // Fetch categories
        const categoriesResponse = await customFetch.get('/categories');
        if (Array.isArray(categoriesResponse.data)) {
          setCategories(categoriesResponse.data);
        } else if (Array.isArray(categoriesResponse.data?.data)) {
          setCategories(categoriesResponse.data.data);
        }
      } catch (error) {
        console.error('Error fetching menu data:', error);
      } finally {
        setLoadingMenu(false);
      }
    };

    fetchMenuData();
  }, []);

  // Khi chọn slot, tự động tính end_time và validate
  useEffect(() => {
    if (form.slot_id) {
      const selectedSlot = slots.find(s => s._id === form.slot_id);
      if (selectedSlot) {
        setEndTime(selectedSlot.end_time);

        // Validate thời gian
        if (form.date) {
          const validationError = validateBookingTime(form.date, selectedSlot.start_time);
          setValidationError(validationError);
        }
      }
    } else {
      setEndTime("");
      setValidationError("");
    }
  }, [form.slot_id, form.date, slots]);

  // Fetch available tables when area/date/slot/guest_count changes
  useEffect(() => {
    if (!selectedArea || !form.date || !form.slot_id || !form.guest_count || validationError) {
      setAvailableTables([]);
      setSelectedTable(null);
      return;
    }
    setLoadingTables(true);
    setError("");
    customFetch
      .get("/reservations/available-tables", {
        params: {
          area_id: selectedArea._id,
          date: form.date,
          slot_id: form.slot_id,
          guest_count: form.guest_count,
        },
      })
      .then((res) => {
        setAvailableTables(res.data.data || []);
        setSelectedTable(null);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || "Không lấy được danh sách bàn trống");
        setAvailableTables([]);
      })
      .finally(() => setLoadingTables(false));
  }, [selectedArea, form.date, form.slot_id, form.guest_count, validationError]);

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAreaSelect = (area) => {
    setSelectedArea(area);
    setSelectedTable(null);
  };

  const handleSlotChange = (e) => {
    setForm({ ...form, slot_id: e.target.value });
  };

  // Handle pre-order menu item changes
  const handleMenuItemChange = (menuItemId, quantity) => {
    const currentItems = form.pre_order_items || [];
    let updatedItems = currentItems.filter(item => item.menu_item_id !== menuItemId);

    if (quantity > 0) {
      updatedItems.push({
        menu_item_id: menuItemId,
        quantity: quantity
      });
    }

    setForm({
      ...form,
      pre_order_items: updatedItems
    });
  };

  // Calculate pre-order total
  const calculatePreOrderTotal = () => {
    if (!form.pre_order_items || !form.pre_order_items.length || !menuItems.length) return 0;

    return form.pre_order_items.reduce((total, item) => {
      if (!item || !item.menu_item_id) return total;
      const menuItem = menuItems.find(m => m && m._id === item.menu_item_id);
      if (menuItem) {
        return total + ((menuItem.price || 0) * item.quantity);
      }
      return total;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (
      !form.name ||
      !form.phone ||
      !form.date ||
      !form.slot_id ||
      !selectedTable
    ) {
      setError("Vui lòng nhập đầy đủ thông tin và chọn bàn!");
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const reservationData = {
        table_id: selectedTable._id,
        date: form.date,
        slot_id: form.slot_id,
        guest_count: form.guest_count,
        contact_name: form.name,
        contact_phone: form.phone,
        contact_email: form.email,
        notes: form.note,
        payment_status: 'pending'
      };

      if (form.pre_order_items && form.pre_order_items.length > 0) {
        reservationData.pre_order_items = form.pre_order_items.filter(item => item.quantity > 0);
      }

      await customFetch.post("/reservations", reservationData);

      setSuccess(true);
      setForm({
        name: "",
        phone: "",
        email: "",
        guest_count: 1,
        date: "",
        slot_id: "",
        note: "",
        pre_order_items: []
      });
      setSelectedTable(null);
      setEndTime("");
      setValidationError("");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Đặt bàn thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const getSlotDisplayText = (slotId) => {
    if (!slotId || !slots.length) return '';
    const slot = slots.find(s => s._id === slotId);
    if (!slot) return '';
    return slot.name ?
      `${slot.name} (${slot.start_time}-${slot.end_time})` :
      `${slot.start_time}-${slot.end_time}`;
  };

  const openMenuModal = () => {
    setShowMenuModal(true);
    setSelectedCategory("All");
  };

  const closeMenuModal = () => {
    setShowMenuModal(false);
  };

  const getSelectedItemsCount = () => {
    return form.pre_order_items.reduce((total, item) => total + item.quantity, 0);
  };

  const getFilteredMenuItems = () => {
    return menuItems.filter(
      (item) =>
        selectedCategory === "All" ||
        item.category_id === selectedCategory ||
        (item.category_id?._id && item.category_id._id === selectedCategory)
    );
  };

  return (
    <div className="reservation-container">
      {/* LEFT: Area & Table */}
      <div className="reservation-left">
        <div className="area-tabs">
          {loadingAreas ? (
            <span>Đang tải khu vực...</span>
          ) : (
            areas.map((area) => (
              <button
                key={area._id}
                className={selectedArea?._id === area._id ? "active" : ""}
                onClick={() => handleAreaSelect(area)}
              >
                {area.name}
              </button>
            ))
          )}
        </div>
        {selectedArea && (
          <div className="area-image">
            {selectedArea.image && (
              <img src={selectedArea.image} alt={selectedArea.name} />
            )}
            <div className="area-desc">
              <h3>{selectedArea.name}</h3>
              <p>{selectedArea.description}</p>
            </div>
          </div>
        )}
        <div className="table-list">
          <h4>Chọn bàn</h4>
          {loadingTables ? (
            <div>Đang tải bàn trống...</div>
          ) : validationError ? (
            <div className="validation-error">{validationError}</div>
          ) : (
            <div className="tables">
              {availableTables.length === 0 ? (
                <span>Không có bàn trống phù hợp</span>
              ) : (
                availableTables.map((table) => (
                  <div
                    key={table._id}
                    className={`table-card ${selectedTable?._id === table._id ? "selected" : ""
                      }`}
                    onClick={() => setSelectedTable(table)}
                  >
                    <div>{table.name}</div>
                    <div>({table.capacity} người)</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      {/* RIGHT: Form */}
      <div className="reservation-right">
        <h3>Thông tin đặt bàn</h3>
        <form onSubmit={handleSubmit}>
          <label>Họ và tên*</label>
          <input
            value={form.name}
            name="name"
            onChange={handleInput}
            placeholder="Nhập họ và tên"
            required
          />
          <label>Số điện thoại*</label>
          <input
            value={form.phone}
            name="phone"
            onChange={handleInput}
            placeholder="Nhập số điện thoại"
            type="tel"
            required
          />
          <label>Email</label>
          <input
            value={form.email}
            name="email"
            onChange={handleInput}
            placeholder="Email (không bắt buộc)"
            type="email"
          />
          <label>Số lượng khách*</label>
          <input
            type="number"
            value={form.guest_count}
            name="guest_count"
            onChange={handleInput}
            min={1}
            max={selectedTable?.capacity || 20}
            required
          />
          <label>Ngày*</label>
          <input
            type="date"
            value={form.date}
            name="date"
            onChange={handleInput}
            min={todayStr}
            required
          />
          <label>Khung giờ*</label>
          <select name="slot_id" value={form.slot_id} onChange={handleSlotChange} required>
            <option value="">Chọn khung giờ</option>
            {slots.map(slot => (
              <option key={slot._id} value={slot._id}>
                {slot.name ? `${slot.name} (${slot.start_time}-${slot.end_time})` : `${slot.start_time}-${slot.end_time}`}
              </option>
            ))}
          </select>
          {endTime && !validationError && (
            <div className="time-info">
              Thời gian giữ bàn: {form.slot_id ? getSlotDisplayText(form.slot_id) : ''} ({RESERVE_DURATION} tiếng)
            </div>
          )}
          <label>Ghi chú</label>
          <textarea
            value={form.note}
            name="note"
            onChange={handleInput}
            placeholder="Ghi chú thêm (nếu có)"
            rows={3}
          />

          {/* Pre-order button */}
          <div className="pre-order-button-section">
            <button
              type="button"
              className="pre-order-btn"
              onClick={openMenuModal}
            >
              🍽️ Chọn món đặt trước ({getSelectedItemsCount()} món)
            </button>
            {form.pre_order_items && form.pre_order_items.length > 0 && (
              <div className="pre-order-summary">
                <span>Tổng tiền: <strong>{calculatePreOrderTotal().toLocaleString()}đ</strong></span>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              Đặt bàn thành công! Chúng tôi sẽ liên hệ xác nhận sớm nhất.
            </div>
          )}
          <button type="submit" disabled={submitting || !!validationError}>
            {submitting ? "Đang gửi..." : "Đặt bàn"}
          </button>
        </form>
      </div>

      {/* Menu Selection Modal */}
      {showMenuModal && (
        <div className="menu-modal-overlay">
          <div className="menu-modal">
            <div className="menu-modal-header">
              <h3>Chọn món đặt trước</h3>
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

                {loadingMenu ? (
                  <div className="loading">Đang tải menu...</div>
                ) : (
                  <div className="menu-items-grid">
                    {getFilteredMenuItems().map((item) => {
                      const preOrderItem = (form.pre_order_items || [])
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
                <span>Số món: <strong>{getSelectedItemsCount()}</strong></span>
              </div>
              <button className="confirm-menu-btn" onClick={closeMenuModal}>
                Xác nhận ({getSelectedItemsCount()} món)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
