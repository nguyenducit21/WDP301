import React, { useEffect, useState } from "react";
import axios from "../../utils/axios.customize";

export default function Step1Info({ form, setForm, next }) {
    const [areas, setAreas] = useState([]);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAreas = async () => {
            try {
                setLoading(true);
                const response = await axios.get("/api/areas");
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
        <div className="reservation-step1-wrapper">
            <div className="reservation-card">
                <h2 className="reservation-title">Điền thông tin khách hàng</h2>
                <div className="reservation-form-group">
                    <label>Họ tên <span className="required">*</span></label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Nhập họ tên của bạn"
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
                        <label>Ngày <span className="required">*</span></label>
                        <input
                            name="date"
                            type="date"
                            value={form.date}
                            onChange={handleChange}
                            className="reservation-input"
                        />
                    </div>
                    <div className="reservation-form-group">
                        <label>Giờ <span className="required">*</span></label>
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
            <style>{`
                .reservation-step1-wrapper {
                    min-height: 70vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: #f7f8fa;
                }
                .reservation-card {
                    background: #fff;
                    border-radius: 18px;
                    box-shadow: 0 4px 24px 0 rgba(0,0,0,0.08);
                    padding: 36px 32px 28px 32px;
                    max-width: 420px;
                    width: 100%;
                    margin: 32px 0;
                }
                .reservation-title {
                    text-align: center;
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 24px;
                    color: #1a1a1a;
                }
                .reservation-form-group {
                    margin-bottom: 18px;
                    display: flex;
                    flex-direction: column;
                }
                .reservation-form-group label {
                    font-weight: 500;
                    margin-bottom: 6px;
                    color: #222;
                }
                .required {
                    color: #e44d26;
                    font-size: 1.1em;
                }
                .reservation-input {
                    padding: 12px 14px;
                    border: 1.5px solid #e0e0e0;
                    border-radius: 8px;
                    font-size: 1rem;
                    outline: none;
                    transition: border 0.2s;
                    background: #fafbfc;
                }
                .reservation-input:focus {
                    border: 1.5px solid #e44d26;
                    background: #fff;
                }
                .reservation-row {
                    display: flex;
                    gap: 16px;
                }
                .reservation-error {
                    color: #fff;
                    background: #e44d26;
                    padding: 10px 0;
                    border-radius: 6px;
                    text-align: center;
                    margin-bottom: 10px;
                    font-weight: 500;
                }
                .reservation-loading {
                    color: #e44d26;
                    text-align: center;
                    margin-bottom: 10px;
                }
                .reservation-btn {
                    width: 100%;
                    background: linear-gradient(90deg, #ff9800 0%, #e44d26 100%);
                    color: #fff;
                    font-size: 1.1rem;
                    font-weight: 600;
                    border: none;
                    border-radius: 8px;
                    padding: 14px 0;
                    margin-top: 8px;
                    cursor: pointer;
                    box-shadow: 0 2px 8px 0 rgba(228,77,38,0.08);
                    transition: background 0.2s, box-shadow 0.2s;
                }
                .reservation-btn:hover {
                    background: linear-gradient(90deg, #e44d26 0%, #ff9800 100%);
                    box-shadow: 0 4px 16px 0 rgba(228,77,38,0.13);
                }
                @media (max-width: 600px) {
                    .reservation-card {
                        padding: 18px 6vw 18px 6vw;
                        max-width: 98vw;
                    }
                    .reservation-row {
                        flex-direction: column;
                        gap: 0;
                    }
                }
            `}</style>
        </div>
    );
}
