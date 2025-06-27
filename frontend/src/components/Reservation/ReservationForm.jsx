import React, { useState, useEffect, useCallback, useMemo } from "react";
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

// Validation thời gian đặt bàn (Vietnam timezone)
function validateBookingTime(date, time, todayVietnam) {
  // Skip validation if date or time is empty
  if (!date || !time) {
    console.log('Skipping validation - missing date or time');
    return null;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const [inputHour, inputMinute] = time.split(':').map(Number);

  console.log('=== VALIDATION DEBUG ===');
  console.log('Input date:', date);
  console.log('Input time:', time);
  console.log('Today Vietnam (passed):', todayVietnam);
  console.log('Local now:', now.toString());
  console.log('Current time:', currentHour + ':' + currentMinute);
  console.log('Input time:', inputHour + ':' + inputMinute);
  console.log('Date comparison (string):', date, 'vs', todayVietnam);
  console.log('Is past date (string)?', date < todayVietnam);
  console.log('Is same date (string)?', date === todayVietnam);

  // Compare dates using Date objects for more reliable comparison
  const inputDate = new Date(date + 'T00:00:00');
  const todayDate = new Date(todayVietnam + 'T00:00:00');

  console.log('Input Date object:', inputDate);
  console.log('Today Date object:', todayDate);
  console.log('Input Date time:', inputDate.getTime());
  console.log('Today Date time:', todayDate.getTime());
  console.log('Is input date < today?', inputDate < todayDate);

  if (inputDate < todayDate) {
    console.log('REJECTED: Past date');
    console.log('========================');
    return "Không thể đặt bàn cho thời gian trong quá khứ";
  }

  // If booking for today, check time
  if (inputDate.getTime() === todayDate.getTime()) {
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const inputTotalMinutes = inputHour * 60 + inputMinute;
    const minBookingMinutes = currentTotalMinutes + 60; // 1 hour from now

    console.log('Same day - checking time');
    console.log('Current total minutes:', currentTotalMinutes);
    console.log('Input total minutes:', inputTotalMinutes);
    console.log('Min booking minutes (now + 60):', minBookingMinutes);
    console.log('Is input time < min booking time?', inputTotalMinutes < minBookingMinutes);

    if (inputTotalMinutes < minBookingMinutes) {
      console.log('REJECTED: Too early');
      console.log('========================');
      return "Vui lòng đặt bàn trước ít nhất 1 giờ so với thời gian bắt đầu";
    }
  }

  console.log('VALIDATED: OK');
  console.log('========================');
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
  // Get today's date in Vietnam timezone (GMT+7)
  const getTodayVietnam = () => {
    // Since user is already in Vietnam timezone, use local date directly
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayVietnam = `${year}-${month}-${day}`;

    console.log('=== getTodayVietnam() called ===');
    console.log('Local Time:', now.toString());
    console.log('Local Time ISO:', now.toISOString());
    console.log('Vietnam Date (Local):', todayVietnam);
    console.log('Current Hour:', now.getHours());
    console.log('Current Minute:', now.getMinutes());
    console.log('================================');

    return todayVietnam;
  };

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    guest_count: 1,
    date: getTodayVietnam(), // Auto set today's date in Vietnam timezone
    slot_id: ""
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reservationId, setReservationId] = useState(null);
  const [preOrderItems, setPreOrderItems] = useState([]);
  const [reservationNote, setReservationNote] = useState("");
  const timeSlots = getTimeSlots();
  const navigate = useNavigate();

  // Sử dụng hook booking slots
  const { slots, getSlotIdFromTime, getTimeFromSlotId } = useBookingSlots();

  // Memoize the getSlotIdFromTime function to prevent infinite re-renders
  const memoizedGetSlotIdFromTime = useCallback((time) => {
    return getSlotIdFromTime(time);
  }, [getSlotIdFromTime]);

  // Ngày hôm nay (yyyy-mm-dd) - Vietnam timezone  
  const todayStr = useMemo(() => {
    const result = getTodayVietnam();
    console.log('todayStr memoized:', result);
    return result;
  }, []); // Empty deps means it only calculates once

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

  // Handle table selection (single select only)
  const handleTableSelect = (table) => {
    setSelectedTables(prev => {
      const isSelected = prev.find(t => t._id === table._id);
      if (isSelected) {
        // Remove table if already selected (deselect)
        return [];
      } else {
        // Replace with new table selection (single select)
        return [table];
      }
    });
  };

  // Handle combination selection (replace current selection)
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
          const validationError = validateBookingTime(form.date, selectedSlot.start_time, todayStr);
          setValidationError(validationError);
        }
      }
    } else {
      setEndTime("");
      setValidationError("");
    }
  }, [form.slot_id, form.date, slots, todayStr]);

  // Auto-select optimal table combination
  const autoSelectTables = (tables, combinations, guestCount) => {
    console.log('Auto selecting tables for', guestCount, 'guests');
    console.log('Available tables:', tables);
    console.log('Combinations from API:', combinations);

    if (!tables || tables.length === 0) return [];

    // For small groups (1-4 people), prioritize single table
    if (guestCount <= 4) {
      const singleTable = tables.find(table => table.capacity >= guestCount);
      if (singleTable) {
        console.log('Found single table for small group:', singleTable);
        return [singleTable];
      }
    }

    // For larger groups (5+ people), check if there's a reasonably sized single table
    // Don't use a table that's too big (more than 1.5x the guest count)
    const reasonableSingleTable = tables.find(table =>
      table.capacity >= guestCount && table.capacity <= guestCount * 1.5
    );
    if (reasonableSingleTable) {
      console.log('Found reasonable single table for larger group:', reasonableSingleTable);
      return [reasonableSingleTable];
    }

    console.log('No single table found, trying combinations...');

    // If no single table, try API combinations
    // Check single table combinations from API
    if (combinations.single && Array.isArray(combinations.single) && combinations.single.length > 0) {
      const firstSingle = combinations.single[0];
      if (Array.isArray(firstSingle)) {
        console.log('Using API single combination:', firstSingle);
        return firstSingle;
      } else if (firstSingle && firstSingle._id) {
        console.log('Using API single table:', firstSingle);
        return [firstSingle];
      }
    }

    // Check double table combinations from API
    if (combinations.double && Array.isArray(combinations.double) && combinations.double.length > 0) {
      const firstDouble = combinations.double[0];
      if (Array.isArray(firstDouble)) {
        console.log('Using API double combination:', firstDouble);
        return firstDouble;
      }
    }

    // Check triple table combinations from API
    if (combinations.triple && Array.isArray(combinations.triple) && combinations.triple.length > 0) {
      const firstTriple = combinations.triple[0];
      if (Array.isArray(firstTriple)) {
        console.log('Using API triple combination:', firstTriple);
        return firstTriple;
      }
    }

    console.log('No API combinations found, using fallback logic...');

    // Fallback to local calculation
    // Try 2-table combinations
    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        const totalCapacity = tables[i].capacity + tables[j].capacity;
        if (totalCapacity >= guestCount) {
          console.log('Found local double combination:', [tables[i], tables[j]]);
          return [tables[i], tables[j]];
        }
      }
    }

    // Try 3-table combinations
    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        for (let k = j + 1; k < tables.length; k++) {
          const totalCapacity = tables[i].capacity + tables[j].capacity + tables[k].capacity;
          if (totalCapacity >= guestCount) {
            console.log('Found local triple combination:', [tables[i], tables[j], tables[k]]);
            return [tables[i], tables[j], tables[k]];
          }
        }
      }
    }

    console.log('No valid combinations found');
    // If no combination works, return empty array
    return [];
  };

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
        console.log('API Response:', res.data);
        const tables = res.data.data || [];
        const combinations = res.data.combinations || {};

        setAvailableTables(tables);
        setTableCombinations(combinations);

        // Auto-select optimal tables
        const autoSelected = autoSelectTables(tables, combinations, form.guest_count);
        console.log('Auto selected tables:', autoSelected);
        setSelectedTables(autoSelected);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || "Không lấy được danh sách bàn trống");
        setAvailableTables([]);
        setTableCombinations({});
        setSelectedTables([]);
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

  // Handle pre-order menu item changes for success modal
  const handleMenuItemChange = (menuItemId, quantity) => {
    let updatedItems = preOrderItems.filter(item => item.menu_item_id !== menuItemId);

    if (quantity > 0) {
      updatedItems.push({
        menu_item_id: menuItemId,
        quantity: quantity
      });
    }

    setPreOrderItems(updatedItems);
  };

  // Calculate pre-order total with 15% discount
  const calculatePreOrderTotal = () => {
    if (!preOrderItems.length || !menuItems.length) return 0;

    const subtotal = preOrderItems.reduce((total, item) => {
      if (!item || !item.menu_item_id) return total;
      const menuItem = menuItems.find(m => m && m._id === item.menu_item_id);
      if (menuItem) {
        return total + ((menuItem.price || 0) * item.quantity);
      }
      return total;
    }, 0);

    // Apply 15% discount for pre-order
    return Math.ceil(subtotal * 0.85);
  };

  // Calculate original total (before discount)
  const calculateOriginalTotal = () => {
    if (!preOrderItems.length || !menuItems.length) return 0;

    return preOrderItems.reduce((total, item) => {
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
        payment_status: 'pending'
      };

      const response = await customFetch.post("/reservations", reservationData);

      // Show success modal instead of immediate success message
      if (response?.data?.data?._id) {
        setReservationId(response.data.data._id);
        setShowSuccessModal(true);
        setSuccess(false); // Don't show the old success message

        // Reset form
        setForm({
          name: "",
          phone: "",
          email: "",
          guest_count: 1,
          date: getTodayVietnam(),
          slot_id: ""
        });
        setSelectedTables([]);
        setEndTime("");
        setValidationError("");
      }
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

  const getSelectedItemsCount = () => {
    return preOrderItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Handle skip pre-order
  const handleSkipPreOrder = async () => {
    try {
      // Update reservation with note only
      if (reservationNote.trim()) {
        await customFetch.put(`/reservations/${reservationId}`, {
          notes: reservationNote
        });
      }

      setShowSuccessModal(false);
      setReservationId(null);
      setPreOrderItems([]);
      setReservationNote("");
      setSuccess(true);
    } catch (error) {
      console.error('Error updating reservation note:', error);
      setShowSuccessModal(false);
      setSuccess(true); // Still show success even if note update fails
    }
  };

  // Handle confirm pre-order
  const handleConfirmPreOrder = async () => {
    try {
      // Update reservation with pre-order items and note
      const updateData = {
        pre_order_items: preOrderItems.filter(item => item.quantity > 0),
        notes: reservationNote,
        total_amount: calculatePreOrderTotal(),
        original_amount: calculateOriginalTotal(),
        discount_amount: calculateOriginalTotal() - calculatePreOrderTotal(),
        payment_status: 'pending_preorder'
      };

      await customFetch.put(`/reservations/${reservationId}`, updateData);

      setShowSuccessModal(false);
      setReservationId(null);
      setPreOrderItems([]);
      setReservationNote("");
      setSuccess(true);
    } catch (error) {
      console.error('Error updating reservation with pre-order:', error);
      setError('Có lỗi xảy ra khi cập nhật đơn đặt món');
    }
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
                      <h5>✅ Bàn đã chọn ({selectedTables.length} bàn):</h5>

                      <div className="selected-tables-list">
                        {selectedTables.map(table => (
                          <div key={table._id} className="selected-table-item">
                            <span>{table.name} ({table.capacity} người)</span>
                            <button
                              className="remove-table-btn"
                              onClick={() => handleTableSelect(table)}
                              title="Bỏ chọn bàn này"
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
                        {getTotalCapacity() >= form.guest_count && (
                          <span className="capacity-ok">
                            ✅ Đủ chỗ cho {form.guest_count} người
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
          {/* <label>Email</label>
          <input
            value={form.email}
            name="email"
            onChange={handleInput}
            placeholder="Email (không bắt buộc)"
            type="email"
          /> */}
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

      {/* Success Modal with Pre-order Option */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-modal-header">
              <h3>🎉 Đặt bàn thành công!</h3>
              <p>Bàn của bạn đã được đặt thành công. Bạn có muốn đặt món trước để nhận ưu đãi 15% không?</p>
            </div>

            <div className="success-modal-content">
              {/* Note section */}
              <div className="note-section">
                <label>Ghi chú cho đơn đặt bàn:</label>
                <textarea
                  value={reservationNote}
                  onChange={(e) => setReservationNote(e.target.value)}
                  placeholder="Ghi chú thêm (nếu có)"
                  rows={3}
                />
              </div>

              {/* Pre-order section */}
              <div className="pre-order-section">
                <h4>🍽️ Đặt món trước (Giảm 15%)</h4>
                <p className="discount-info">
                  💥 <strong>Ưu đãi đặc biệt:</strong> Đặt món trước ngay bây giờ để nhận giảm giá 15% cho toàn bộ đơn hàng!
                </p>

                {preOrderItems.length > 0 && (
                  <div className="pre-order-summary">
                    <div className="price-breakdown">
                      <div className="original-price">
                        Tổng gốc: <span className="strikethrough">{calculateOriginalTotal().toLocaleString()}đ</span>
                      </div>
                      <div className="discount-amount">
                        Giảm 15%: <span className="discount">-{(calculateOriginalTotal() - calculatePreOrderTotal()).toLocaleString()}đ</span>
                      </div>
                      <div className="final-price">
                        Thành tiền: <strong>{calculatePreOrderTotal().toLocaleString()}đ</strong>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="choose-menu-btn"
                  onClick={() => setShowMenuModal(true)}
                >
                  {preOrderItems.length > 0 ?
                    `✏️ Chỉnh sửa món (${getSelectedItemsCount()} món)` :
                    "🍽️ Chọn món đặt trước"
                  }
                </button>
              </div>
            </div>

            <div className="success-modal-footer">
              <button
                className="skip-btn"
                onClick={() => handleSkipPreOrder()}
              >
                Bỏ qua, đặt bàn thôi
              </button>
              <button
                className="confirm-preorder-btn"
                onClick={() => handleConfirmPreOrder()}
                disabled={preOrderItems.length === 0}
              >
                {preOrderItems.length > 0 ?
                  `Xác nhận đặt món (${calculatePreOrderTotal().toLocaleString()}đ)` :
                  "Chọn món để tiếp tục"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Selection Modal */}
      {showMenuModal && (
        <div className="menu-modal-overlay">
          <div className="menu-modal">
            <div className="menu-modal-header">
              <h3>Chọn món đặt trước (Giảm 15%)</h3>
              <button className="close-modal-btn" onClick={() => setShowMenuModal(false)}>×</button>
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
                      const preOrderItem = preOrderItems.find(i => i.menu_item_id === item._id);
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
              <button className="confirm-menu-btn" onClick={() => setShowMenuModal(false)}>
                Xác nhận ({getSelectedItemsCount()} món)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
