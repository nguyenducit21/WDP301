import React, { useEffect, useState } from "react";
import axios from "../../utils/axios.customize";
import './Reservation.css';


export default function Step1Info({ form, setForm, next }) {
    const [areas, setAreas] = useState([]);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAreas = async () => {
            try {
                setLoading(true);
                const response = await axios.get("/areas");
                if (response?.data?.success && Array.isArray(response.data.data)) {
                    setAreas(response.data.data);
                    setErr("");
                } else {
                    console.error("Invalid response format:", response);
                    setErr("Không thể tải danh sách khu vực");
                    setAreas([]);
                }
            } catch (error) {
                console.error("Error fetching areas:", error.response || error);
                setErr(error.response?.data?.message || "Có lỗi xảy ra khi tải danh sách khu vực");
                setAreas([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAreas();
    }, []);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleNext = () => {
        if (
            !form.name ||
            !form.phone ||
            !form.date ||
            !form.time ||
            !form.guest_count ||
            !form.area_id
        ) {
            setErr("Vui lòng nhập đầy đủ thông tin!");
            return;
        }
        setErr("");
        next();
    };

    return (
        <div className="reservation-step1-wrapper step1-page">
            <div className="reservation-card">
                <h2 className="reservation-title">Điền thông tin cá nhân</h2>
                <div className="reservation-form-group">
                    <label>Họ và tên <span className="required">*</span></label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Nhập họ và tên của bạn"
                        className="reservation-input"
                        autoComplete="off"
                    />
                </div>
                <div className="reservation-form-group">
                    <label>Email</label>
                    <input
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="Email (không bắt buộc)"
                        className="reservation-input"
                        autoComplete="off"
                        type="email"
                    />
                </div>
                <div className="reservation-form-group">
                    <label>Số điện thoại <span className="required">*</span></label>
                    <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="Nhập số điện thoại"
                        className="reservation-input"
                        autoComplete="off"
                        type="tel"
                    />
                </div>
                <div className="reservation-row">
                    <div className="reservation-form-group">
                        <label>Ngày đặt bàn <span className="required">*</span></label>
                        <input
                            name="date"
                            type="date"
                            value={form.date}
                            onChange={handleChange}
                            className="reservation-input"
                        />
                    </div>
                    <div className="reservation-form-group">
                        <label>Giờ đặt bàn <span className="required">*</span></label>
                        <input
                            name="time"
                            type="time"
                            value={form.time}
                            onChange={handleChange}
                            className="reservation-input"
                        />
                    </div>
                </div>
                <div className="reservation-row">
                    <div className="reservation-form-group">
                        <label>Số người <span className="required">*</span></label>
                        <input
                            name="guest_count"
                            type="number"
                            min={1}
                            value={form.guest_count}
                            onChange={handleChange}
                            placeholder="Số người"
                            className="reservation-input"
                        />
                    </div>
                    <div className="reservation-form-group">
                        <label>Khu vực <span className="required">*</span></label>
                        <select
                            name="area_id"
                            value={form.area_id}
                            onChange={handleChange}
                            className="reservation-input"
                            disabled={loading}
                        >
                            <option value="">Chọn khu vực</option>
                            {loading ? (
                                <option disabled>Đang tải...</option>
                            ) : areas.length === 0 ? (
                                <option disabled>Không có khu vực nào</option>
                            ) : (
                                areas.map((a) => (
                                    <option key={a._id} value={a._id}>{a.name}</option>
                                ))
                            )}
                        </select>
                    </div>
                </div>
                <div className="reservation-form-group">
                    <label>Ghi chú</label>
                    <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder="Ghi chú thêm (nếu có)"
                        className="reservation-input"
                        rows={2}
                    />
                </div>
                {err && <div className="reservation-error">{err}</div>}
                {loading && <div className="reservation-loading">Đang tải danh sách khu vực...</div>}
                <button className="reservation-btn" onClick={handleNext}>
                    Tiếp theo
                </button>
            </div>

        </div>
    );
}
