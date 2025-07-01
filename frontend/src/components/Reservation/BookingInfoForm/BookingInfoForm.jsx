import React from 'react';
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
                    onChange={onInputChange}
                    placeholder="Nhập họ và tên"
                    required
                />

                <label>Số điện thoại*</label>
                <input
                    value={form.phone}
                    name="phone"
                    onChange={onInputChange}
                    placeholder="Nhập số điện thoại"
                    type="tel"
                    required
                />

                <label>Số lượng khách*</label>
                <input
                    type="number"
                    value={form.guest_count}
                    name="guest_count"
                    onChange={onInputChange}
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