import React, { useState, useEffect, useCallback } from "react";
import customFetch from "../../utils/axios.customize";
import { useBookingSlots } from "./BookingSlotManager";
import { useNavigate } from "react-router-dom";
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
  const [selectedTables, setSelectedTables] = useState([]);
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
  const [tableCombinations, setTableCombinations] = useState({});
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const timeSlots = getTimeSlots();
  const navigate = useNavigate();

  // Sử dụng hook booking slots
  const { slots, getSlotIdFromTime, getTimeFromSlotId } = useBookingSlots();

  // Memoize the getSlotIdFromTime function to prevent infinite re-renders
  const memoizedGetSlotIdFromTime = useCallback((time) => {
    return getSlotIdFromTime(time);
  }, [getSlotIdFromTime]);

  // Ngày hôm nay (yyyy-mm-dd)
  const todayStr = new Date().toISOString().split("T")[0];

  // Calculate total capacity of selected tables
  const getTotalCapacity = () => {
    return selectedTables.reduce((total, table) => total + table.capacity, 0);
  };

  // Check if selected tables can accommodate the guest count
  const isTableSelectionValid = () => {
    if (selectedTables.length === 0) return false;
    const totalCapacity = getTotalCapacity();
    return totalCapacity >= form.guest_count;
  };

  // Check if guest count exceeds all available tables capacity
  const isGuestCountExceeded = () => {
    const MAX_CAPACITY = 23; // Fixed maximum capacity
    return form.guest_count >= MAX_CAPACITY;
  };

  // Get maximum possible capacity from all available tables
  const getMaxPossibleCapacity = () => {
    const MAX_CAPACITY = 23; // Fixed maximum capacity
    return MAX_CAPACITY;
  };

  // Get suggested table combinations
  const getSuggestedCombinations = () => {
    const combinations = [];
    const guestCount = form.guest_count;

    // Use API combinations if available
    if (tableCombinations.single && tableCombinations.single.length > 0) {
      combinations.push({
        type: 'single',
        tables: tableCombinations.single,
        description: 'Bàn đơn'
      });
    }

    if (tableCombinations.double && tableCombinations.double.length > 0) {
      combinations.push({
        type: 'double',
        tables: tableCombinations.double,
        description: 'Ghép 2 bàn'
      });
    }

    if (tableCombinations.triple && tableCombinations.triple.length > 0) {
      combinations.push({
        type: 'triple',
        tables: tableCombinations.triple,
        description: 'Ghép 3 bàn'
      });
    }

    // Fallback to local calculation if no API combinations
    if (combinations.length === 0) {
      // Single table options
      const singleTables = availableTables.filter(table => table.capacity >= guestCount);
      if (singleTables.length > 0) {
        combinations.push({
          type: 'single',
          tables: singleTables.slice(0, 3), // Show top 3 options
          description: 'Bàn đơn'
        });
      }

      // Multiple table combinations - only for 6+ guests
      if (guestCount >= 6) {
        const combinations2 = [];
        const combinations3 = [];

        // Find combinations of 2 tables
        for (let i = 0; i < availableTables.length; i++) {
          for (let j = i + 1; j < availableTables.length; j++) {
            const totalCapacity = availableTables[i].capacity + availableTables[j].capacity;
            if (totalCapacity >= guestCount) {
              combinations2.push([availableTables[i], availableTables[j]]);
            }
          }
        }

        // Find combinations of 3 tables
        for (let i = 0; i < availableTables.length; i++) {
          for (let j = i + 1; j < availableTables.length; j++) {
            for (let k = j + 1; k < availableTables.length; k++) {
              const totalCapacity = availableTables[i].capacity + availableTables[j].capacity + availableTables[k].capacity;
              if (totalCapacity >= guestCount) {
                combinations3.push([availableTables[i], availableTables[j], availableTables[k]]);
              }
            }
          }
        }

        if (combinations2.length > 0) {
          combinations.push({
            type: 'double',
            tables: combinations2.slice(0, 2), // Show top 2 combinations
            description: 'Ghép 2 bàn'
          });
        }

        if (combinations3.length > 0) {
          combinations.push({
            type: 'triple',
            tables: combinations3.slice(0, 1), // Show top 1 combination
            description: 'Ghép 3 bàn'
          });
        }
      }
    }

    return combinations;
  };

  // Handle table selection
  const handleTableSelect = (table) => {
    setSelectedTables(prev => {
      const isSelected = prev.find(t => t._id === table._id);
      if (isSelected) {
        // Remove table if already selected
        return prev.filter(t => t._id !== table._id);
      } else {
        // Add table to selection
        return [...prev, table];
      }
    });
  };

  // Handle combination selection
  const handleCombinationSelect = (tables) => {
    setSelectedTables(tables);
  };

  // Check if a table is selected
  const isTableSelected = (table) => {
    return selectedTables.find(t => t._id === table._id) !== undefined;
  };

  // Check if a combination is selected
  const isCombinationSelected = (tables) => {
    if (selectedTables.length !== tables.length) return false;
    return tables.every(table => selectedTables.find(t => t._id === table._id));
  };

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

  // Check authentication status
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setIsAuthenticated(!!(user.user?.id || user.id || user._id));
      } catch (e) {
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
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
      setSelectedTables([]);
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
        setTableCombinations(res.data.combinations || {});
        setSelectedTables([]);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || "Không lấy được danh sách bàn trống");
        setAvailableTables([]);
        setTableCombinations({});
      })
      .finally(() => setLoadingTables(false));
  }, [selectedArea, form.date, form.slot_id, form.guest_count, validationError]);

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAreaSelect = (area) => {
    setSelectedArea(area);
    setSelectedTables([]);
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

  // Calculate deposit amount (50% of pre-order total)
  const calculateDepositAmount = () => {
    const total = calculatePreOrderTotal();
    return Math.ceil(total * 0.5); // 50% deposit, rounded up
  };

  // Handle payment for deposit
  const handlePayment = async () => {
    if (!isAuthenticated) {
      setError('Vui lòng đăng nhập để đặt bàn!');
      setTimeout(() => {
        navigate('/login', { state: { from: '/reservation' } });
      }, 2000);
      return;
    }

    if (!form.name || !form.phone || !form.date || !form.slot_id || !isTableSelectionValid()) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    if (isGuestCountExceeded()) {
      setError("Số lượng khách vượt quá giới hạn đặt bàn trực tuyến (tối đa 23 người). Vui lòng liên hệ trực tiếp để đặt bàn số lượng lớn.");
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      const depositAmount = calculateDepositAmount();

      if (depositAmount > 0) {
        // Create payment URL for deposit
        const paymentResponse = await customFetch.post('/payment/create_payment_url', {
          amount: depositAmount,
          orderDescription: `Đặt cọc đặt bàn ngày ${new Date(form.date).toLocaleDateString('vi-VN')} - ${form.slot_id ? getSlotDisplayText(form.slot_id) : ''}`,
          orderType: 'reservation_deposit',
          language: 'vn'
        });

        if (paymentResponse?.data?.paymentUrl && paymentResponse?.data?.orderId) {
          // Create reservation with payment info
          const reservationData = {
            table_ids: selectedTables.map(table => table._id),
            date: form.date,
            slot_id: form.slot_id,
            guest_count: form.guest_count,
            contact_name: form.name,
            contact_phone: form.phone,
            contact_email: form.email,
            pre_order_items: form.pre_order_items.filter(item => item.quantity > 0),
            notes: form.note,
            payment_order_id: paymentResponse.data.orderId,
            deposit_amount: depositAmount,
            total_amount: calculatePreOrderTotal(),
            payment_status: 'pending_deposit',
            status: 'pending'
          };

          const reservationResponse = await customFetch.post('/reservations', reservationData);

          if (reservationResponse?.data?.success) {
            // Open payment URL in new window
            window.open(paymentResponse.data.paymentUrl, '_blank');
            // Show success message
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
            setSelectedTables([]);
            setEndTime("");
            setValidationError("");
          } else {
            throw new Error('Không thể tạo đơn đặt bàn');
          }
        } else {
          throw new Error('Không thể tạo URL thanh toán');
        }
      }
    } catch (error) {
      console.error('Lỗi xử lý thanh toán:', error);
      setError(error.response?.data?.message || error.message || 'Có lỗi xảy ra khi xử lý thanh toán');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Check if user has pre-order items and needs to pay deposit
    const hasPreOrderItems = form.pre_order_items && form.pre_order_items.length > 0 &&
      form.pre_order_items.some(item => item.quantity > 0);

    if (hasPreOrderItems) {
      // If has pre-order items, require payment
      await handlePayment();
      return;
    }

    // Regular reservation without pre-order items
    // Validation
    if (
      !form.name ||
      !form.phone ||
      !form.date ||
      !form.slot_id ||
      !isTableSelectionValid()
    ) {
      setError("Vui lòng nhập đầy đủ thông tin và chọn bàn!");
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if guest count exceeds available capacity
    if (isGuestCountExceeded()) {
      setError("Số lượng khách vượt quá giới hạn đặt bàn trực tuyến (tối đa 23 người). Vui lòng liên hệ trực tiếp để đặt bàn số lượng lớn.");
      return;
    }

    setSubmitting(true);
    try {
      const reservationData = {
        table_ids: selectedTables.map(table => table._id),
        date: form.date,
        slot_id: form.slot_id,
        guest_count: form.guest_count,
        contact_name: form.name,
        contact_phone: form.phone,
        contact_email: form.email,
        notes: form.note,
        payment_status: 'pending'
      };

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
      setSelectedTables([]);
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
              {/* <h3>{selectedArea.name}</h3> */}
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
            <div className="tables-section">
              {availableTables.length === 0 ? (
                <span>Hãy điền thông tin đặt bàn để xem bàn hiện có</span>
              ) : isGuestCountExceeded() ? (
                <div className="large-group-booking">
                  <div className="large-group-info">
                    <h5>📞 Đặt bàn số lượng lớn</h5>
                    <p>
                      Với {form.guest_count} người, vượt quá giới hạn đặt bàn trực tuyến (tối đa 23 người).
                    </p>
                    <p>
                      Vui lòng liên hệ trực tiếp để được tư vấn và sắp xếp phù hợp:
                    </p>
                    <div className="contact-info">
                      <div className="contact-item">
                        <span className="contact-label">📞 Hotline:</span>
                        <span className="contact-value">0123 456 789</span>
                      </div>
                      <div className="contact-item">
                        <span className="contact-label">📧 Email:</span>
                        <span className="contact-value">booking@nhahang.com</span>
                      </div>
                      <div className="contact-item">
                        <span className="contact-label">⏰ Giờ làm việc:</span>
                        <span className="contact-value">6:00 - 22:00 (Hàng ngày)</span>
                      </div>
                    </div>
                    <div className="contact-actions">
                      <button
                        type="button"
                        className="call-btn"
                        onClick={() => window.open('tel:0123456789')}
                      >
                        📞 Gọi ngay
                      </button>
                      <button
                        type="button"
                        className="whatsapp-btn"
                        onClick={() => window.open('https://wa.me/84123456789?text=Tôi muốn đặt bàn cho ' + form.guest_count + ' người')}
                      >
                        💬 WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Selected tables summary */}
                  {selectedTables.length > 0 && (
                    <div className="selected-tables-summary">
                      <h5>Bàn đã chọn ({selectedTables.length} bàn):</h5>
                      <div className="selected-tables-list">
                        {selectedTables.map(table => (
                          <div key={table._id} className="selected-table-item">
                            <span>{table.name} ({table.capacity} người)</span>
                            <button
                              className="remove-table-btn"
                              onClick={() => handleTableSelect(table)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="capacity-info">
                        Tổng sức chứa: <strong>{getTotalCapacity()}</strong> người
                        {getTotalCapacity() < form.guest_count && (
                          <span className="capacity-warning">
                            ⚠️ Cần thêm bàn để đủ {form.guest_count} người
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suggested combinations */}
                  {getSuggestedCombinations().length > 0 && (
                    <div className="table-combinations">
                      <h5>Gợi ý chọn bàn:</h5>
                      {getSuggestedCombinations().map((combination, index) => (
                        <div key={index} className="combination-group">
                          <h6>{combination.description}</h6>
                          <div className="combination-options">
                            {combination.tables.map((tableOption, tableIndex) => {
                              if (Array.isArray(tableOption)) {
                                // Multiple table combination
                                const totalCapacity = tableOption.reduce((sum, t) => sum + t.capacity, 0);
                                const isSelected = isCombinationSelected(tableOption);
                                return (
                                  <div
                                    key={tableIndex}
                                    className={`combination-card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleCombinationSelect(tableOption)}
                                  >
                                    <div className="combination-tables">
                                      {tableOption.map(table => (
                                        <span key={table._id} className="table-name">
                                          {table.name}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="combination-capacity">
                                      Tổng: {totalCapacity} người
                                    </div>
                                  </div>
                                );
                              } else {
                                // Single table
                                return (
                                  <div
                                    key={tableOption._id}
                                    className={`table-card ${isTableSelected(tableOption) ? "selected" : ""}`}
                                    onClick={() => handleTableSelect(tableOption)}
                                  >
                                    <div>{tableOption.name}</div>
                                    <div>({tableOption.capacity} người)</div>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual table selection */}
                  {/* <div className="manual-selection">
                    <h5>{getSuggestedCombinations().length > 0 ? "Chọn bàn thủ công:" : "Chọn bàn:"}</h5>
                    <div className="tables">
                      {availableTables.map((table) => (
                        <div
                          key={table._id}
                          className={`table-card ${isTableSelected(table) ? "selected" : ""}`}
                          onClick={() => handleTableSelect(table)}
                        >
                          <div>{table.name}</div>
                          <div>({table.capacity} người)</div>
                        </div>
                      ))}
                    </div>
                  </div> */}
                </>
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
            max={getMaxPossibleCapacity()}
            required
          />
          {form.guest_count >= 6 && (
            <div className="combination-note">
              💡 Từ 6 người trở lên, hệ thống sẽ gợi ý ghép bàn
            </div>
          )}
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
                <div className="pre-order-details">
                  <span>Tổng tiền: <strong>{calculatePreOrderTotal().toLocaleString()}đ</strong></span>
                  <span>Đặt cọc (50%): <strong className="deposit-amount">{calculateDepositAmount().toLocaleString()}đ</strong></span>
                </div>
                <div className="deposit-notice">
                  💳 <strong>Lưu ý:</strong> Khi chọn món đặt trước, bạn cần đặt cọc 50% để xác nhận đơn hàng
                </div>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              Đặt bàn thành công! Chúng tôi sẽ liên hệ xác nhận sớm nhất.
            </div>
          )}
          <button type="submit" disabled={submitting || !!validationError || isGuestCountExceeded()}>
            {submitting ? "Đang gửi..." : isGuestCountExceeded() ? "Vượt quá sức chứa" : "Đặt bàn"}
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
