import React, { useState, useEffect } from 'react';
import customFetch from '../../../utils/axios.customize';
import PaymentModal from '../PaymentModal/PaymentModal';

// CSS cho animation loading
const spinKeyframes = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

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
    const [promotionCode, setPromotionCode] = useState("");
    const [promotionResult, setPromotionResult] = useState(null);
    const [promotionError, setPromotionError] = useState("");
    const [promotionLoading, setPromotionLoading] = useState(false);
    const [availablePromotions, setAvailablePromotions] = useState([]);
    const [selectedPromotion, setSelectedPromotion] = useState(null);

    useEffect(() => {
        // Lấy danh sách promotion còn lượt dùng
        const fetchPromotions = async () => {
            try {
                const res = await customFetch.get('/promotions?isClient=true');
                console.log('Available promotions:', res.data.data);
                setAvailablePromotions(res.data.data || []);
            } catch (err) {
                console.error('Error fetching promotions:', err);
                setAvailablePromotions([]);
            }
        };
        fetchPromotions();
    }, []);

    // Khi thay đổi mã khuyến mại, cập nhật selectedPromotion
    useEffect(() => {
        if (!promotionCode) {
            setSelectedPromotion(null);
            return;
        }
        const found = availablePromotions.find(p => p.code === promotionCode.trim());
        console.log('Selected promotion:', found);
        setSelectedPromotion(found || null);

        // Nếu mã đã hết lượt dùng, hiển thị cảnh báo nhưng vẫn cho chọn
        if (found && (found.isExhausted || (found.usageLimit !== null && found.usedCount >= found.usageLimit))) {
            setPromotionError("Mã khuyến mại này đã hết lượt sử dụng, nhưng bạn vẫn có thể thử áp dụng");
        } else {
            setPromotionError("");
        }
    }, [promotionCode, availablePromotions]);

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

        // Kiểm tra nếu chưa chọn món
        const orderTotal = calculateOriginalTotal();
        if (orderTotal <= 0) {
            setPromotionError("Vui lòng chọn món trước khi áp dụng mã giảm giá");
            return;
        }

        setPromotionLoading(true);
        try {
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
            // Hiển thị thông báo lỗi chi tiết hơn
            if (err.response?.status === 400) {
                // Lỗi validation
                setPromotionError(err.response.data.message || 'Mã không hợp lệ cho đơn hàng này');
            } else if (err.response?.status === 404) {
                // Mã không tồn tại
                setPromotionError('Mã khuyến mại không tồn tại hoặc đã hết hạn');
            } else {
                // Lỗi khác
                setPromotionError('Không thể áp dụng mã. Vui lòng thử lại sau');
            }
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
                        <div className="promotion-input-wrap" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px'
                        }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                    type="text"
                                    value={promotionCode || ''}
                                    onChange={e => setPromotionCode(e.target.value)}
                                    placeholder="Nhập mã khuyến mại"
                                    disabled={promotionLoading || (promotionResult && promotionResult.success)}
                                    className="promotion-modern-input"
                                    list="promotion-suggestions"
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '4px',
                                        border: '1px solid #d1d5db',
                                        width: '100%',
                                        fontSize: '15px'
                                    }}
                                />
                                <datalist id="promotion-suggestions">
                                    {availablePromotions.map(promo => {
                                        const isExhausted = promo.isExhausted || (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit);
                                        return (
                                            <option key={promo.code} value={promo.code}>
                                                {promo.code} - {promo.description || 'Không có mô tả'}
                                                {isExhausted ? ' (Hết lượt)' : ''}
                                            </option>
                                        );
                                    })}
                                </datalist>
                            </div>
                            <button
                                className="promotion-modern-btn"
                                onClick={handleApplyPromotion}
                                disabled={promotionLoading || !promotionCode.trim() || (promotionResult && promotionResult.success)}
                                style={{
                                    backgroundColor: promotionLoading || !promotionCode.trim() || (promotionResult && promotionResult.success)
                                        ? '#94a3b8'
                                        : '#0ea5e9',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '10px 16px',
                                    cursor: promotionLoading || !promotionCode.trim() || (promotionResult && promotionResult.success)
                                        ? 'not-allowed'
                                        : 'pointer',
                                    fontWeight: '500',
                                    minWidth: '100px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                }}
                            >
                                {promotionLoading ?
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <span style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            border: '2px solid #ffffff',
                                            borderTopColor: 'transparent',
                                            animation: 'spin 1s linear infinite',
                                            display: 'inline-block'
                                        }}></span>
                                        Đang kiểm tra
                                    </span> :
                                    'Áp dụng'
                                }
                            </button>
                        </div>

                        {/* Hiển thị danh sách gợi ý mã khuyến mại */}
                        {!selectedPromotion && !promotionResult?.success && availablePromotions.length > 0 && (
                            <div style={{
                                marginTop: '8px',
                                marginBottom: '12px',
                                padding: '8px 12px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                fontSize: '13px'
                            }}>
                                <div style={{ fontWeight: '500', marginBottom: '6px', color: '#475569' }}>
                                    Mã khuyến mại có thể sử dụng:
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                }}>
                                    {availablePromotions.slice(0, 5).map(promo => {
                                        const isExhausted = promo.isExhausted || (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit);
                                        return (
                                            <div
                                                key={promo.code}
                                                onClick={() => !isExhausted && setPromotionCode(promo.code)}
                                                style={{
                                                    padding: '4px 8px',
                                                    backgroundColor: isExhausted ? '#f1f5f9' : '#e0f2fe',
                                                    color: isExhausted ? '#94a3b8' : '#0369a1',
                                                    borderRadius: '4px',
                                                    cursor: isExhausted ? 'default' : 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    border: `1px solid ${isExhausted ? '#e2e8f0' : '#bae6fd'}`,
                                                    opacity: isExhausted ? 0.7 : 1
                                                }}
                                            >
                                                <span>{promo.code}</span>
                                                {isExhausted && (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        backgroundColor: '#e2e8f0',
                                                        color: '#64748b',
                                                        padding: '1px 4px',
                                                        borderRadius: '3px'
                                                    }}>
                                                        Hết lượt
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Hiển thị thông tin mã khuyến mại đã chọn */}
                        {selectedPromotion && !promotionResult?.success && (
                            <div style={{
                                fontSize: '14px',
                                marginTop: '10px',
                                marginBottom: '10px',
                                padding: '12px',
                                backgroundColor: selectedPromotion.isExhausted || (selectedPromotion.usageLimit !== null && selectedPromotion.usedCount >= selectedPromotion.usageLimit)
                                    ? '#fef2f2'
                                    : '#f0f9ff',
                                borderRadius: '6px',
                                border: `1px solid ${selectedPromotion.isExhausted || (selectedPromotion.usageLimit !== null && selectedPromotion.usedCount >= selectedPromotion.usageLimit)
                                    ? '#fecaca'
                                    : '#bae6fd'}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <span style={{
                                            fontWeight: '600',
                                            color: selectedPromotion.isExhausted || (selectedPromotion.usageLimit !== null && selectedPromotion.usedCount >= selectedPromotion.usageLimit)
                                                ? '#b91c1c'
                                                : '#0369a1',
                                            fontSize: '15px'
                                        }}>
                                            {selectedPromotion.code}
                                        </span>
                                        {selectedPromotion.isExhausted || (selectedPromotion.usageLimit !== null && selectedPromotion.usedCount >= selectedPromotion.usageLimit) ? (
                                            <span style={{
                                                backgroundColor: '#fee2e2',
                                                color: '#b91c1c',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                marginLeft: '8px'
                                            }}>
                                                Hết lượt
                                            </span>
                                        ) : null}
                                    </div>

                                    {selectedPromotion.usageLimit !== null && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: selectedPromotion.isExhausted || (selectedPromotion.usedCount >= selectedPromotion.usageLimit)
                                                ? '#b91c1c'
                                                : '#0369a1'
                                        }}>
                                            Đã dùng: {selectedPromotion.usedCount || 0}/{selectedPromotion.usageLimit}
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    fontSize: '13px',
                                    color: selectedPromotion.isExhausted || (selectedPromotion.usageLimit !== null && selectedPromotion.usedCount >= selectedPromotion.usageLimit)
                                        ? '#7f1d1d'
                                        : '#075985'
                                }}>
                                    {selectedPromotion.description || 'Không có mô tả'}
                                </div>

                                <div style={{
                                    marginTop: '4px',
                                    fontSize: '13px',
                                    color: selectedPromotion.isExhausted || (selectedPromotion.usageLimit !== null && selectedPromotion.usedCount >= selectedPromotion.usageLimit)
                                        ? '#7f1d1d'
                                        : '#075985'
                                }}>
                                    {selectedPromotion.type === 'percent' && (
                                        <>Giảm <b>{selectedPromotion.value}%</b>{selectedPromotion.maxDiscount ? ` (tối đa ${selectedPromotion.maxDiscount.toLocaleString()}đ)` : ''}</>
                                    )}
                                    {selectedPromotion.type === 'fixed' && (
                                        <>Giảm <b>{selectedPromotion.value.toLocaleString()}đ</b></>
                                    )}
                                    {selectedPromotion.minOrderValue ? <> · Đơn từ {selectedPromotion.minOrderValue.toLocaleString()}đ</> : null}
                                </div>
                            </div>
                        )}

                        {/* Hiển thị thông báo lỗi */}
                        {promotionError && !promotionResult?.success && (
                            <div style={{
                                padding: '10px 12px',
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                borderRadius: '6px',
                                marginTop: '10px',
                                fontSize: '14px',
                                border: '1px solid #fecaca',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '16px' }}>⚠️</span>
                                <span>{promotionError}</span>
                            </div>
                        )}

                        {/* Hiển thị thông báo áp dụng thành công */}
                        {promotionResult && promotionResult.success && (
                            <div style={{
                                padding: '10px 12px',
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                borderRadius: '6px',
                                marginTop: '10px',
                                fontSize: '14px',
                                border: '1px solid #bbf7d0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '16px' }}>✅</span>
                                <span>Đã áp dụng mã <b>{promotionResult.promotion.code}</b> - Giảm {promotionResult.discount.toLocaleString()}đ</span>
                            </div>
                        )}
                    </div>


                    {/* Pre-order section */}
                    <div className="pre-order-section">

                        {/* <p className="discount-info">
                            💥 <strong>Ưu đãi đặc biệt:</strong> Đặt món trước để nhận giảm giá 15% với mã <strong>PREORDER15</strong> !
                        </p> */}

                        {preOrderItems.length > 0 && (
                            <div className="pre-order-summary" style={{
                                backgroundColor: '#f8fafc',
                                borderRadius: '8px',
                                padding: '16px',
                                marginTop: '16px',
                                marginBottom: '16px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div className="price-breakdown" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <div className="original-price" style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        color: '#64748b',
                                        fontSize: '14px'
                                    }}>
                                        <span>Tổng gốc:</span>
                                        <span className="strikethrough" style={{
                                            textDecoration: 'line-through'
                                        }}>{calculateOriginalTotal().toLocaleString()}đ</span>
                                    </div>
                                    <div className="discount-amount" style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        color: '#10b981',
                                        fontSize: '14px'
                                    }}>
                                        <span>{discountLabel}:</span>
                                        <span className="discount">-{discount.toLocaleString()}đ</span>
                                    </div>
                                    <div className="final-price" style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderTop: '1px dashed #e2e8f0',
                                        paddingTop: '8px',
                                        marginTop: '4px',
                                        fontWeight: 'bold',
                                        fontSize: '16px'
                                    }}>
                                        <span>Thành tiền:</span>
                                        <strong style={{ color: '#0ea5e9' }}>{finalTotal.toLocaleString()}đ</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            className="choose-menu-btn"
                            onClick={onShowMenuModal}
                            disabled={loading}
                            style={{
                                backgroundColor: '#f8fafc',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                                padding: '12px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {preOrderItems.length > 0 ?
                                <>
                                    <span style={{ fontSize: '18px' }}>✏️</span>
                                    <span>Chỉnh sửa món ({getSelectedItemsCount()} món)</span>
                                </> :
                                <>
                                    <span style={{ fontSize: '18px' }}>🍽️</span>
                                    <span>Chọn món đặt trước</span>
                                </>
                            }
                        </button>
                    </div>
                </div>

                <div className="success-modal-footer" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '16px',
                    borderTop: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc'
                }}>
                    <button
                        className="skip-btn"
                        onClick={handleSkipPreOrder}
                        disabled={loading}
                        style={{
                            backgroundColor: 'white',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                            padding: '12px 16px',
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            flex: 1,
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {loading ? "Đang xử lý..." : "Bỏ qua, đặt bàn thôi"}
                    </button>
                    <button
                        className="confirm-preorder-btn"
                        onClick={handleConfirmPreOrder}
                        disabled={preOrderItems.length === 0 || loading}
                        style={{
                            backgroundColor: preOrderItems.length === 0 || loading ? '#94a3b8' : '#0ea5e9',
                            color: 'white',
                            border: 'none',
                            padding: '12px 16px',
                            borderRadius: '6px',
                            cursor: preOrderItems.length === 0 || loading ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            flex: 1,
                            boxShadow: preOrderItems.length === 0 || loading ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <span style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    border: '2px solid #ffffff',
                                    borderTopColor: 'transparent',
                                    animation: 'spin 1s linear infinite',
                                    display: 'inline-block'
                                }}></span>
                                Đang xử lý...
                            </span>
                        ) : preOrderItems.length > 0 ? (
                            <>
                                <span style={{ fontSize: '18px' }}>✅</span>
                                <span>Xác nhận đặt món ({finalTotal.toLocaleString()}đ)</span>
                            </>
                        ) : (
                            "Chọn món để tiếp tục"
                        )}
                    </button>
                </div>
            </div>

            {/* CSS cho animation */}
            <style>{spinKeyframes}</style>

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