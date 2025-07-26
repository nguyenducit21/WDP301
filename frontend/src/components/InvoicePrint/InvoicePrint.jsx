// components/InvoicePrint/InvoicePrint.jsx
import React from 'react';
import './InvoicePrint.css';

const InvoicePrint = ({ invoiceData, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount || 0);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('vi-VN');
    };

    if (!invoiceData) return null;

    const {
        reservation,
        order,
        table,
        preOrderItems,
        orderItems,
        totals,
        restaurant
    } = invoiceData;

    return (
        <div className="invoice-modal-overlay">
            <div className="invoice-modal-container">
                <div className="invoice-header-controls">
                    <button className="print-button" onClick={handlePrint}>
                        🖨️ In hóa đơn
                    </button>
                    <button className="close-button" onClick={onClose}>
                        ✕ Đóng
                    </button>
                </div>

                <div className="invoice-content" id="invoice-print-area">
                    {/* Header nhà hàng */}
                    <div className="invoice-restaurant-header">
                        <div className="restaurant-logo">
                            <div className="logo-placeholder">🏮</div>
                        </div>
                        <div className="restaurant-info">
                            <h1 className="restaurant-name">Nhà Hàng Hương Sen</h1>
                            <p className="restaurant-address">
                                Địa chỉ: Số 8, Số 2 Tôn Thất Tùng, Đống Đa - Hà Nội
                            </p>
                            <p className="restaurant-contact">
                                Điện thoại: 1900300060 | Email: support@elise.vn
                            </p>
                        </div>
                    </div>

                    <div className="invoice-divider"></div>

                    {/* Thông tin khách hàng */}
                    <div className="customer-info-section">
                        <h3>Thông tin khách hàng</h3>
                        <div className="customer-details">
                            <div className="customer-row">
                                <span><strong>Tên:</strong> {reservation?.contact_name || 'N/A'}</span>
                                <span><strong>Mã:</strong> {reservation?._id?.slice(-8).toUpperCase() || 'N/A'}</span>
                            </div>
                            <div className="customer-row">
                                <span><strong>Phone:</strong> {reservation?.contact_phone || 'N/A'}</span>
                            </div>
                            <div className="customer-row">
                                <span><strong>Email:</strong> {reservation?.contact_email || 'N/A'}</span>
                            </div>
                            <div className="customer-row">
                                <span><strong>Ngày đặt:</strong> {reservation?.date ? formatDate(reservation.date) : 'N/A'} {reservation?.time || ''}</span>
                                <span><strong>Số người:</strong> {reservation?.guest_count || 'N/A'}</span>
                                <span><strong>Số bàn:</strong> {table?.name || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Chi tiết đơn hàng */}
                    <div className="order-details-section">
                        <h3>Chi tiết đơn hàng</h3>
                        <table className="order-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Món</th>
                                    <th>Số lượng</th>
                                    <th>Giá</th>
                                    <th>Tổng tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Món đặt trước */}
                                {preOrderItems?.map((item, index) => (
                                    <tr key={`pre-${index}`} className="pre-order-row">
                                        <td>{index + 1}</td>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>{formatCurrency(item.price)} VNĐ</td>
                                        <td>{formatCurrency(item.price * item.quantity)} VNĐ</td>
                                    </tr>
                                ))}

                                {/* Món gọi thêm */}
                                {orderItems?.map((item, index) => (
                                    <tr key={`order-${index}`}>
                                        <td>{(preOrderItems?.length || 0) + index + 1}</td>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>{formatCurrency(item.price)} VNĐ</td>
                                        <td>{formatCurrency(item.price * item.quantity)} VNĐ</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="order-note">
                            <strong>Ghi chú:</strong> {order?.note || 'Không có'}
                        </div>
                    </div>

                    {/* Thông tin thanh toán */}
                    <div className="payment-summary">
                        <div className="payment-left">
                            <h4>Thông tin hóa đơn</h4>
                            <div className="payment-row">
                                <span>Món đặt trước:</span>
                                <span>{formatCurrency(totals?.preOrderTotal)} VNĐ</span>
                            </div>
                            <div className="payment-row">
                                <span>Món gọi thêm:</span>
                                <span>{formatCurrency(totals?.orderTotal)} VNĐ</span>
                            </div>
                            <div className="payment-row">
                                <span>Tạm tính:</span>
                                <span>{formatCurrency(totals?.subtotal)} VNĐ</span>
                            </div>

                            {/* ✅ HIỂN THỊ GIẢM GIÁ CHỈ CHO PHẦN ĐẶT TRƯỚC */}
                            {totals?.discount > 0 && totals?.promotionInfo && (
                                <>
                                    <div className="payment-row promotion-info">
                                        <span>Mã giảm giá ({totals.promotionInfo.code}) - chỉ áp dụng món đặt trước:</span>
                                        <span>
                                            {totals.promotionInfo.type === 'percent' || totals.promotionInfo.type === 'first_order'
                                                ? `-${totals.promotionInfo.value}%`
                                                : `-${formatCurrency(totals.promotionInfo.value)} VNĐ`
                                            }
                                        </span>
                                    </div>
                                    <div className="payment-row">
                                        <span>Số tiền được giảm:</span>
                                        <span className="discount-amount">-{formatCurrency(totals.discount)} VNĐ</span>
                                    </div>
                                </>
                            )}

                            <div className="payment-row total-row">
                                <span><strong>Tổng cộng:</strong></span>
                                <span><strong>{formatCurrency(totals?.total)} VNĐ</strong></span>
                            </div>
                        </div>

                        <div className="payment-right">
                            <h4>Thông tin thanh toán</h4>
                            <div className="payment-row">
                                <span>Đã thanh toán (đặt trước sau giảm giá):</span>
                                <span>{formatCurrency(totals?.preOrderAfterDiscount)} VNĐ</span>
                            </div>
                            <div className="payment-row">
                                <span>Còn lại cần thanh toán (món gọi thêm):</span>
                                <span>{formatCurrency(totals?.remaining)} VNĐ</span>
                            </div>
                            {/* <div className="payment-row">
                                <span>Trạng thái:</span>
                                <span>
                                    {reservation?.payment_status === 'paid'
                                        ? 'Đã thanh toán đầy đủ'
                                        : 'Chưa thanh toán phần gọi thêm'
                                    }
                                </span>
                            </div> */}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="invoice-footer">
                        <p>Cảm ơn quý khách đã sử dụng dịch vụ!</p>
                        <p>Thời gian in: {new Date().toLocaleString('vi-VN')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePrint;
