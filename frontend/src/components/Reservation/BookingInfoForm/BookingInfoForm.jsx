import React, { useState } from 'react';
import { useBookingSlots } from '../BookingSlot/BookingSlot';

const RESERVE_DURATION = 1; // 1 tiếng cho mỗi bàn đặt

const BookingInfoForm = ({
    form,
    onInputChange,
    onSlotChange,
    onSubmit,
    submitting,
    error,
    success,
    validationError,
    endTime,
    todayStr,
    getMaxPossibleCapacity,
    isGuestCountExceeded
}) => {
    const { slots } = useBookingSlots();

    // State để lưu lỗi từng trường
    const [fieldErrors, setFieldErrors] = useState({});

    // Regex cho validation
    const nameRegex = /^[a-zA-ZÀ-ỹ\s]+$/;
    const phoneRegex = /^0\d{9}$/;

    // Validate từng trường khi thay đổi
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let error = '';
        if (name === 'name') {
            if (!value.trim()) {
                error = 'Họ và tên không được để trống';
            } else if (!nameRegex.test(value.trim())) {
                error = 'Họ và tên chỉ được chứa chữ cái và khoảng trắng';
            }
        }
        if (name === 'phone') {
            if (!value.trim()) {
                error = 'Số điện thoại không được để trống';
            } else if (!phoneRegex.test(value.trim())) {
                error = 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0';
            }
        }
        if (name === 'guest_count') {
            const guestCount = Number(value);
            if (!guestCount || guestCount < 1) {
                error = 'Số lượng khách phải lớn hơn hoặc bằng 1';
            } else if (guestCount > getMaxPossibleCapacity()) {
                error = `Số lượng khách vượt quá sức chứa tối đa (${getMaxPossibleCapacity()})`;
            }
        }
        setFieldErrors(prev => ({ ...prev, [name]: error }));
        onInputChange(e);
    };

    // Validate toàn bộ form khi submit
    const validateForm = () => {
        const errors = {};
        if (!form.name.trim()) {
            errors.name = 'Họ và tên không được để trống';
        } else if (!nameRegex.test(form.name.trim())) {
            errors.name = 'Họ và tên chỉ được chứa chữ cái và khoảng trắng';
        }
        if (!form.phone.trim()) {
            errors.phone = 'Số điện thoại không được để trống';
        } else if (!phoneRegex.test(form.phone.trim())) {
            errors.phone = 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0';
        }
        const guestCount = Number(form.guest_count);
        if (!guestCount || guestCount < 1) {
            errors.guest_count = 'Số lượng khách phải lớn hơn hoặc bằng 1';
        } else if (guestCount > getMaxPossibleCapacity()) {
            errors.guest_count = `Số lượng khách vượt quá sức chứa tối đa (${getMaxPossibleCapacity()})`;
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Xử lý submit
    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(e);
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

    const user = JSON.parse(localStorage.getItem('user'));

    return (
        <div className="reservation-right">
            <h3>Thông tin đặt bàn</h3>
            <form onSubmit={handleSubmit}>
                <label>Họ và tên*</label>
                <input
                    value={form.name}
                    name="name"
                    onChange={handleInputChange}
                    placeholder="Nhập họ và tên"
                    required
                />
                {fieldErrors.name && <div className="error-message">{fieldErrors.name}</div>}

                <label>Số điện thoại*</label>
                <input
                    value={form.phone}
                    name="phone"
                    onChange={handleInputChange}
                    placeholder="Nhập số điện thoại"
                    type="tel"
                    required
                />
                {fieldErrors.phone && <div className="error-message">{fieldErrors.phone}</div>}

                <label>Số lượng khách*</label>
                <input
                    type="number"
                    value={form.guest_count}
                    name="guest_count"
                    onChange={handleInputChange}
                    min={1}
                    max={getMaxPossibleCapacity()}
                    required
                />
                {fieldErrors.guest_count && <div className="error-message">{fieldErrors.guest_count}</div>}
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
                    onChange={onInputChange}
                    min={todayStr}
                    required
                />

                <label>Khung giờ*</label>
                <select name="slot_id" value={form.slot_id} onChange={onSlotChange} required>
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

                <button
                    type="submit"
                    disabled={submitting || !!validationError || isGuestCountExceeded(form.guest_count)}
                >
                    {submitting ? "Đang gửi..." : isGuestCountExceeded(form.guest_count) ? "Vượt quá sức chứa" : "Đặt bàn"}
                </button>
            </form>
        </div>
    );
};

export default BookingInfoForm; 