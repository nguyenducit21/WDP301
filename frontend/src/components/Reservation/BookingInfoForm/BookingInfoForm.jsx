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

    // Thêm state cho lỗi từng trường
    const [fieldErrors, setFieldErrors] = useState({});

    // Validate từng trường
    const validateField = (name, value) => {
        switch (name) {
            case 'name':
                if (!value.trim()) return 'Họ tên không được để trống';
                if (/[^a-zA-ZÀ-ỹ\s']/u.test(value)) return 'Họ tên không hợp lệ';
                return '';
            case 'phone':
                if (!value.trim()) return 'Số điện thoại không được để trống';
                if (!/^0[0-9]{9}$/.test(value)) return 'Số điện thoại không hợp lệ';
                return '';
            case 'guest_count':
                if (!value || isNaN(value) || parseInt(value) <= 0) return 'Số lượng khách phải lớn hơn 0';
                if (parseInt(value) > getMaxPossibleCapacity()) return 'Vượt quá sức chứa';
                return '';
            case 'date':
                if (!value) return 'Vui lòng chọn ngày';
                if (value < todayStr) return 'Ngày không hợp lệ';
                return '';
            case 'slot_id':
                if (!value) return 'Vui lòng chọn khung giờ';
                return '';
            default:
                return '';
        }
    };

    // Xử lý khi thay đổi input
    const handleInputChange = (e) => {
        onInputChange(e);
        const { name, value } = e.target;
        setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    };
    const handleSlotChange = (e) => {
        onSlotChange(e);
        setFieldErrors(prev => ({ ...prev, slot_id: validateField('slot_id', e.target.value) }));
    };

    const getSlotDisplayText = (slotId) => {
        if (!slotId || !slots.length) return '';
        const slot = slots.find(s => s._id === slotId);
        if (!slot) return '';
        return slot.name ?
            `${slot.name} (${slot.start_time}-${slot.end_time})` :
            `${slot.start_time}-${slot.end_time}`;
    };

    return (
        <div className="reservation-right">
            <h3>Thông tin đặt bàn</h3>
            <form onSubmit={onSubmit}>
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
                {parseInt(form.guest_count) >= 6 && parseInt(form.guest_count) > 0 && (
                    <div className="combination-note">
                        💡 Từ 6 người trở lên, hệ thống sẽ gợi ý ghép bàn
                    </div>
                )}

                <label>Ngày*</label>
                <input
                    type="date"
                    value={form.date}
                    name="date"
                    onChange={handleInputChange}
                    min={todayStr}
                    required
                />
                {fieldErrors.date && <div className="error-message">{fieldErrors.date}</div>}

                <label>Khung giờ*</label>
                <select name="slot_id" value={form.slot_id} onChange={handleSlotChange} required>
                    <option value="">Chọn khung giờ</option>
                    {slots.map(slot => (
                        <option key={slot._id} value={slot._id}>
                            {slot.name ? `${slot.name} (${slot.start_time}-${slot.end_time})` : `${slot.start_time}-${slot.end_time}`}
                        </option>
                    ))}
                </select>
                {fieldErrors.slot_id && <div className="error-message">{fieldErrors.slot_id}</div>}

                {endTime && !Object.values(fieldErrors).some(Boolean) && parseInt(form.guest_count) > 0 && (
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
                    disabled={submitting || Object.values(fieldErrors).some(Boolean) || isGuestCountExceeded(form.guest_count)}
                >
                    {submitting ? "Đang gửi..." : isGuestCountExceeded(form.guest_count) ? "Vượt quá sức chứa" : "Đặt bàn"}
                </button>
            </form>
        </div>
    );
};

export default BookingInfoForm; 