import React, { useState, useEffect } from "react";
import customFetch from "../../utils/axios.customize";
import "./Reservation.css";

const OPEN_HOUR = 7;
const CLOSE_HOUR = 24; // 12h đêm
const SLOT_DURATION = 1; // 1 tiếng/slot
const RESERVE_DURATION = 2; // 2 tiếng cho mỗi bàn đặt

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

export default function ReservationForm() {
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    guest_count: 1,
    date: "",
    time: "",
    note: "",
  });
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const timeSlots = getTimeSlots();

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

  // Khi chọn time, tự động tính end_time
  useEffect(() => {
    if (form.time) {
      setEndTime(addHoursToTime(form.time, RESERVE_DURATION));
    } else {
      setEndTime("");
    }
  }, [form.time]);

  // Fetch tables when area/date/time/guest_count changes
  useEffect(() => {
    if (!selectedArea || !form.date || !form.time || !form.guest_count || !endTime) {
      setTables([]);
      setSelectedTable(null);
      return;
    }
    setLoadingTables(true);
    setError("");
    customFetch
      .get("/reservation/available-tables", {
        params: {
          area_id: selectedArea._id,
          date: form.date,
          time: form.time,
          end_time: endTime,
          guest_count: form.guest_count,
        },
      })
      .then((res) => {
        setTables(res.data.data || []);
        setSelectedTable(null);
      })
      .catch(() => setError("Không lấy được danh sách bàn trống"))
      .finally(() => setLoadingTables(false));
  }, [selectedArea, form.date, form.time, form.guest_count, endTime]);

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAreaSelect = (area) => {
    setSelectedArea(area);
    setSelectedTable(null);
  };

  const handleTimeChange = (e) => {
    setForm({ ...form, time: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (
      !form.name ||
      !form.phone ||
      !form.date ||
      !form.time ||
      !endTime ||
      !selectedTable
    ) {
      setError("Vui lòng nhập đầy đủ thông tin và chọn bàn!");
      return;
    }
    setSubmitting(true);
    try {
      await customFetch.post("/reservation", {
        table_id: selectedTable._id,
        date: form.date,
        time: form.time,
        end_time: endTime,
        guest_count: form.guest_count,
        contact_name: form.name,
        contact_phone: form.phone,
        contact_email: form.email,
        notes: form.note,
      });
      setSuccess(true);
      setForm({
        name: "",
        phone: "",
        email: "",
        guest_count: 1,
        date: "",
        time: "",
        note: "",
      });
      setSelectedTable(null);
      setEndTime("");
    } catch (err) {
      setError(err?.response?.data?.message || "Đặt bàn thất bại");
    } finally {
      setSubmitting(false);
    }
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
            {/* Nếu có ảnh thì show, không thì bỏ qua */}
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
          ) : (
            <div className="tables">
              {tables.length === 0 ? (
                <span>Không có bàn trống phù hợp</span>
              ) : (
                tables.map((table) => (
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
          <input value={form.name} name="name" onChange={handleInput} />
          <label>Số điện thoại*</label>
          <input value={form.phone} name="phone" onChange={handleInput} />
          <label>Email*</label>
          <input value={form.email} name="email" onChange={handleInput} />
          <label>Số lượng khách*</label>
          <input
            type="number"
            value={form.guest_count}
            name="guest_count"
            onChange={handleInput}
            min={1}
          />
          <label>Ngày*</label>
          <input
            type="date"
            value={form.date}
            name="date"
            onChange={handleInput}
            min={todayStr}
          />
          <label>Giờ bắt đầu*</label>
          <select name="time" value={form.time} onChange={handleTimeChange}>
            <option value="">Chọn giờ</option>
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
          {endTime && (
            <div style={{ margin: "8px 0", color: "#7a6c2f" }}>
              Thời gian giữ bàn: {form.time} - {endTime} (2 tiếng)
            </div>
          )}
          <label>Note</label>
          <textarea value={form.note} name="note" onChange={handleInput} />
          {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
          {success && (
            <div style={{ color: "green", marginTop: 8 }}>
              Đặt bàn thành công!
            </div>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? "Đang gửi..." : "Đặt bàn"}
          </button>
        </form>
      </div>
    </div>
  );
}
