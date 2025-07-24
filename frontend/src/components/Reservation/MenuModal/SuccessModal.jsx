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
    // Promotion states
    const [promotionCode, setPromotionCode] = useState("");
    const [promotionResult, setPromotionResult] = useState(null);
    const [promotionError, setPromotionError] = useState("");
    const [promotionLoading, setPromotionLoading] = useState(false);

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

            // Nếu có nhập mã nhưng chưa bấm áp dụng, tự động validate
            if (promotionCode.trim() && (!promotionResult || promotionResult.promotion.code !== promotionCode.trim())) {
                await handleApplyPromotion();
                // Nếu sau khi validate vẫn không hợp lệ, không cho tiếp tục
                if (!promotionResult || !promotionResult.success) {
                    setLoading(false);
                    setPromotionError('Vui lòng nhập mã khuyến mại hợp lệ hoặc bỏ trống!');
                    return;
                }
            }

            // Update reservation với pre-order items, note, promotion info
            const updateData = {
                pre_order_items: preOrderItems.filter(item => item.quantity > 0),
                notes: reservationNote,
                total_amount: finalTotal,
                original_amount: calculateOriginalTotal(),
                discount_amount: discount,
                payment_status: 'paid',
            };
            if (promotionResult && promotionResult.success) {
                updateData.promotion = promotionResult.promotion.code;
            }

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

    // Handle promotion code apply
    const handleApplyPromotion = async () => {
        setPromotionError("");
        setPromotionResult(null);
        setPromotionLoading(true);
        try {
            const orderTotal = calculateOriginalTotal();
            // TODO: Lấy userId, isFirstOrder nếu cần (giả sử chưa có thì bỏ qua)
            const res = await customFetch.post('/promotions/validate', {
                code: promotionCode.trim(),
                orderTotal
            });
            if (res.data && res.data.success) {
                setPromotionResult(res.data);
            } else {
                setPromotionError(res.data.message || 'Mã không hợp lệ');
            }
        } catch (err) {
            setPromotionError(err.response?.data?.message || 'Mã không hợp lệ');
        } finally {
            setPromotionLoading(false);
        }
    };

    // Generate order info for payment
    const getOrderInfo = () => {
        const itemCount = getSelectedItemsCount();
        return `Đặt bàn + Đặt trước ${itemCount} món ăn (Giảm 15%)`;
    };

    // Tính toán tổng tiền và giảm giá
    let discount = 0;
    let finalTotal = calculatePreOrderTotal();
    let discountLabel = 'Giảm 15%';
    if (promotionResult && promotionResult.success) {
        discount = promotionResult.discount;
        finalTotal = calculateOriginalTotal() - discount;
        discountLabel = `Mã: ${promotionResult.promotion.code}`;
    } else {
        discount = calculateOriginalTotal() - calculatePreOrderTotal();
    }

    return (
        <div className="success-modal-overlay">
            <div className="success-modal">
                <div className="success-modal-header">
                    <h3>🎉 Đặt bàn thành công!</h3>
                    <p>Bàn của bạn đã được đặt thành công. Bạn có muốn đặt món trước để nhận ưu đãi 15% hoặc nhập mã khuyến mại?</p>
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

                    {/* Promotion code section */}
                    <div className="promotion-section">
                        <label>Nhập mã khuyến mại (nếu có):</label>
                        <div className="promotion-input-wrap">
                            <input
                                type="text"
                                value={promotionCode}
                                onChange={e => setPromotionCode(e.target.value)}
                                placeholder="Nhập mã khuyến mại"
                                disabled={promotionLoading}
                                className="promotion-modern-input"
                            />
                            <button
                                className="promotion-modern-btn"
                                onClick={handleApplyPromotion}
                                disabled={promotionLoading || !promotionCode.trim()}
                            >
                                {promotionLoading ? 'Đang kiểm tra...' : 'Áp dụng'}
                            </button>
                        </div>
                        {promotionError && <div className="promotion-modern-error">{promotionError}</div>}
                        {promotionResult && promotionResult.success && (
                            <div className="promotion-modern-success">
                                Đã áp dụng mã: <b>{promotionResult.promotion.code}</b> - Giảm {promotionResult.discount.toLocaleString()}đ
                            </div>
                        )}
                    </div>


                    {/* Pre-order section */}
                    <div className="pre-order-section">

                        <p className="discount-info">
                            💥 <strong>Ưu đãi đặc biệt:</strong> Đặt món trước để nhận giảm giá 15% với mã <strong>PREORDER15</strong> !
                        </p>

                        {preOrderItems.length > 0 && (
                            <div className="pre-order-summary">
                                <div className="price-breakdown">
                                    <div className="original-price">
                                        Tổng gốc: <span className="strikethrough">{calculateOriginalTotal().toLocaleString()}đ</span>
                                    </div>
                                    <div className="discount-amount">
                                        {discountLabel}: <span className="discount">-{discount.toLocaleString()}đ</span>
                                    </div>
                                    <div className="final-price">
                                        Thành tiền: <strong>{finalTotal.toLocaleString()}đ</strong>
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
                                `Xác nhận đặt món (${finalTotal.toLocaleString()}đ)` :
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
                totalAmount={finalTotal}
                orderInfo={getOrderInfo()}
                promotion={promotionResult && promotionResult.success ? promotionResult.promotion.code : undefined}
            />
        </div>
    );
};

export default SuccessModal; 