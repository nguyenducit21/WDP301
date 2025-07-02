import React, { useState, useEffect } from 'react';
import customFetch from '../../../utils/axios.customize';
import './PaymentModal.css';

const PaymentModal = ({
    isOpen,
    onClose,
    reservationId,
    totalAmount,
    orderInfo
}) => {
    const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, checking, success, failed
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
    const [checkingPayment, setCheckingPayment] = useState(false);

    // Countdown timer
    useEffect(() => {
        if (!isOpen || paymentStatus !== 'pending') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setPaymentStatus('failed');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, paymentStatus]);

    // Auto check payment status (simulate payment checking)
    useEffect(() => {
        if (!isOpen || paymentStatus !== 'pending') return;

        const checkPayment = async () => {
            setCheckingPayment(true);
            try {
                // Simulate payment check API call
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Simulate random payment success (70% success rate for demo)
                const isSuccess = Math.random() > 0.3;

                if (isSuccess) {
                    // Update reservation payment status
                    await customFetch.put(`/reservations/${reservationId}`, {
                        payment_status: 'paid',
                        paid_at: new Date().toISOString()
                    });

                    setPaymentStatus('success');
                }
            } catch (error) {
                console.error('Payment check error:', error);
            } finally {
                setCheckingPayment(false);
            }
        };

        // Check payment every 5 seconds
        const checkInterval = setInterval(checkPayment, 5000);

        // Initial check after 3 seconds
        setTimeout(checkPayment, 3000);

        return () => clearInterval(checkInterval);
    }, [isOpen, paymentStatus, reservationId]);

    // Format time display
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Handle manual payment check
    const handleCheckPayment = async () => {
        setCheckingPayment(true);
        try {
            // Simulate manual payment check
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Higher success rate for manual check (90%)
            const isSuccess = Math.random() > 0.1;

            if (isSuccess) {
                await customFetch.put(`/reservations/${reservationId}`, {
                    payment_status: 'paid',
                    paid_at: new Date().toISOString()
                });
                setPaymentStatus('success');
            } else {
                alert('Chưa nhận được thanh toán. Vui lòng thử lại sau!');
            }
        } catch (error) {
            console.error('Manual payment check error:', error);
            alert('Lỗi khi kiểm tra thanh toán. Vui lòng thử lại!');
        } finally {
            setCheckingPayment(false);
        }
    };

    // Handle close modal
    const handleClose = () => {
        if (paymentStatus === 'success') {
            onClose(true); // Pass true to indicate successful payment
        } else {
            onClose(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="payment-modal-overlay">
            <div className="payment-modal">
                {paymentStatus === 'pending' && (
                    <>
                        <div className="payment-modal-header">
                            <h3>💳 Thanh toán đơn hàng</h3>
                            <div className="payment-timer">
                                Thời gian còn lại: <span className="timer">{formatTime(timeLeft)}</span>
                            </div>
                        </div>

                        <div className="payment-modal-content">
                            <div className="payment-info">
                                <div className="amount-display">
                                    <span className="amount-label">Tổng tiền:</span>
                                    <span className="amount-value">{totalAmount.toLocaleString()}đ</span>
                                </div>
                                <div className="order-info">
                                    <p>{orderInfo}</p>
                                </div>
                            </div>

                            <div className="qr-code-section">
                                <div className="qr-code-placeholder">
                                    <div className="qr-code">
                                        {/* Placeholder QR Code - in real app, generate actual QR */}
                                        <div className="qr-pattern">
                                            <div className="qr-corner qr-top-left"></div>
                                            <div className="qr-corner qr-top-right"></div>
                                            <div className="qr-corner qr-bottom-left"></div>
                                            <div className="qr-data">
                                                <div className="qr-line"></div>
                                                <div className="qr-line"></div>
                                                <div className="qr-line"></div>
                                                <div className="qr-line"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="qr-instruction">
                                        Quét mã QR bằng ứng dụng ngân hàng<br />
                                        hoặc ví điện tử để thanh toán
                                    </p>
                                </div>

                                <div className="payment-methods">
                                    <div className="method-item">
                                        <span className="method-icon">🏦</span>
                                        <span>Chuyển khoản ngân hàng</span>
                                    </div>
                                    <div className="method-item">
                                        <span className="method-icon">📱</span>
                                        <span>Ví điện tử (MoMo, ZaloPay)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="payment-status">
                                {checkingPayment ? (
                                    <div className="checking-payment">
                                        <div className="loading-spinner"></div>
                                        <span>Đang kiểm tra thanh toán...</span>
                                    </div>
                                ) : (
                                    <div className="payment-note">
                                        <span>💡 Hệ thống sẽ tự động xác nhận khi nhận được thanh toán</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="payment-modal-footer">
                            <button
                                className="cancel-payment-btn"
                                onClick={handleClose}
                                disabled={checkingPayment}
                            >
                                Hủy thanh toán
                            </button>
                            <button
                                className="check-payment-btn"
                                onClick={handleCheckPayment}
                                disabled={checkingPayment}
                            >
                                {checkingPayment ? 'Đang kiểm tra...' : 'Kiểm tra thanh toán'}
                            </button>
                        </div>
                    </>
                )}

                {paymentStatus === 'success' && (
                    <div className="payment-success">
                        <div className="success-icon">✅</div>
                        <h3>Thanh toán thành công!</h3>
                        <p>Đơn đặt bàn và món ăn của bạn đã được xác nhận.</p>
                        <p className="success-note">
                            Chúng tôi sẽ liên hệ với bạn để xác nhận chi tiết.
                        </p>
                        <button className="success-btn" onClick={handleClose}>
                            Hoàn tất
                        </button>
                    </div>
                )}

                {paymentStatus === 'failed' && (
                    <div className="payment-failed">
                        <div className="failed-icon">❌</div>
                        <h3>Thanh toán thất bại</h3>
                        <p>Đã hết thời gian thanh toán hoặc có lỗi xảy ra.</p>
                        <p className="failed-note">
                            Bạn có thể liên hệ trực tiếp với nhà hàng để được hỗ trợ.
                        </p>
                        <div className="failed-actions">
                            <button className="retry-btn" onClick={() => {
                                setPaymentStatus('pending');
                                setTimeLeft(300);
                            }}>
                                Thử lại
                            </button>
                            <button className="contact-btn" onClick={handleClose}>
                                Liên hệ nhà hàng
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentModal; 