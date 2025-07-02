import React, { useState } from 'react';
import customFetch from '../../../utils/axios.customize';
import PaymentModal from '../PaymentModal/PaymentModal';

const SuccessModal = ({
    isOpen,
    onClose,
    reservationId,
    preOrderItems,
    setPreOrderItems,
    onMenuItemChange,
    calculatePreOrderTotal,
    calculateOriginalTotal,
    getSelectedItemsCount,
    onShowMenuModal
}) => {
    const [reservationNote, setReservationNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    if (!isOpen) return null;

    // Handle skip pre-order
    const handleSkipPreOrder = async () => {
        try {
            setLoading(true);

            // Update reservation with note only
            if (reservationNote.trim()) {
                await customFetch.put(`/reservations/${reservationId}`, {
                    notes: reservationNote
                });
            }

            setPreOrderItems([]);
            setReservationNote("");
            onClose(true); // Pass true to indicate success
        } catch (error) {
            console.error('Error updating reservation note:', error);
            onClose(true); // Still show success even if note update fails
        } finally {
            setLoading(false);
        }
    };

    // Handle confirm pre-order
    const handleConfirmPreOrder = async () => {
        try {
            setLoading(true);

            // Update reservation with pre-order items and note
            const updateData = {
                pre_order_items: preOrderItems.filter(item => item.quantity > 0),
                notes: reservationNote,
                total_amount: calculatePreOrderTotal(),
                original_amount: calculateOriginalTotal(),
                discount_amount: calculateOriginalTotal() - calculatePreOrderTotal(),
                payment_status: 'paid'
            };

            await customFetch.put(`/reservations/${reservationId}`, updateData);

            // Show payment modal instead of closing
            setShowPaymentModal(true);
        } catch (error) {
            console.error('Error updating reservation with pre-order:', error);
            alert('Có lỗi xảy ra khi cập nhật đơn hàng. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    // Handle payment modal close
    const handlePaymentModalClose = (paymentSuccess) => {
        setShowPaymentModal(false);
        if (paymentSuccess) {
            // Reset states and close success modal
            setPreOrderItems([]);
            setReservationNote("");
            onClose(true);
        }
        // If payment failed, user stays on the success modal
    };

    // Generate order info for payment
    const getOrderInfo = () => {
        const itemCount = getSelectedItemsCount();
        return `Đặt bàn + Đặt trước ${itemCount} món ăn (Giảm 15%)`;
    };

    return (
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
                            onClick={onShowMenuModal}
                            disabled={loading}
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
                        onClick={handleSkipPreOrder}
                        disabled={loading}
                    >
                        {loading ? "Đang xử lý..." : "Bỏ qua, đặt bàn thôi"}
                    </button>
                    <button
                        className="confirm-preorder-btn"
                        onClick={handleConfirmPreOrder}
                        disabled={preOrderItems.length === 0 || loading}
                    >
                        {loading ? "Đang xử lý..." :
                            preOrderItems.length > 0 ?
                                `Xác nhận đặt món (${calculatePreOrderTotal().toLocaleString()}đ)` :
                                "Chọn món để tiếp tục"
                        }
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={handlePaymentModalClose}
                reservationId={reservationId}
                totalAmount={calculatePreOrderTotal()}
                orderInfo={getOrderInfo()}
            />
        </div>
    );
};

export default SuccessModal; 