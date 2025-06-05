import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axios.customize';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaCalendarAlt, FaClock, FaUsers, FaUtensils, FaStickyNote } from 'react-icons/fa';

export default function Step4Confirm({ form, prev }) {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const [menuItems, setMenuItems] = useState({});
    const [paymentLoading, setPaymentLoading] = useState(false);
    const { user, isAuthenticated, context } = useContext(AuthContext);
    const navigate = useNavigate();

    // Check authentication
    useEffect(() => {
        if (!isAuthenticated) {
            setErr('Vui lòng đăng nhập để đặt bàn!');
            setTimeout(() => {
                navigate('/login', { state: { from: '/reservation' } });
            }, 2000);
        }
    }, [isAuthenticated, navigate]);

    // Fetch menu items details for pre-orders
    useEffect(() => {
        const fetchMenuItems = async () => {
            if (!form.pre_order_items?.length) return;

            try {
                const response = await axios.get('/menu-items');
                if (response?.data?.success && Array.isArray(response.data.data)) {
                    const itemsMap = {};
                    response.data.data.forEach(item => {
                        itemsMap[item._id] = item;
                    });
                    setMenuItems(itemsMap);
                }
            } catch (error) {
                console.error('Error fetching menu items:', error);
            }
        };

        if (isAuthenticated) {
            fetchMenuItems();
        }
    }, [form.pre_order_items, isAuthenticated]);

    const handlePayment = async () => {
        if (!isAuthenticated) {
            setErr('Vui lòng đăng nhập để đặt bàn!');
            setTimeout(() => {
                navigate('/login', { state: { from: '/reservation' } });
            }, 2000);
            return;
        }

        if (!form.table_id || !form.date || !form.time || !form.name || !form.phone) {
            setErr('Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }

        setPaymentLoading(true);
        setErr('');

        try {
            // Calculate total amount including pre-orders
            let totalAmount = 0;
            if (form.pre_order_items?.length > 0) {
                totalAmount = form.pre_order_items.reduce((sum, item) => {
                    const menuItem = menuItems[item.menu_item_id];
                    return sum + (menuItem?.price || 0) * item.quantity;
                }, 0);
            }

            // If there are pre-ordered items, process payment
            if (totalAmount > 0) {
                // Create payment URL
                const paymentResponse = await axios.post('/payment/create_payment_url', {
                    amount: totalAmount,
                    orderDescription: `Đặt bàn ngày ${new Date(form.date).toLocaleDateString('vi-VN')} - ${form.time}`,
                    orderType: 'reservation',
                    language: 'vn'
                });

                if (paymentResponse?.data?.paymentUrl && paymentResponse?.data?.orderId) {
                    // Create reservation with payment info
                    const reservationData = {
                        table_id: form.table_id,
                        date: form.date,
                        time: form.time,
                        guest_count: form.guest_count,
                        contact_name: form.name,
                        contact_phone: form.phone,
                        contact_email: form.email,
                        pre_order_items: form.pre_order_items || [],
                        notes: form.notes,
                        payment_order_id: paymentResponse.data.orderId,
                        total_amount: totalAmount,
                        status: 'pending_payment'
                    };

                    const reservationResponse = await axios.post('/reservations', reservationData);

                    if (reservationResponse?.data?.success) {
                        // Open payment URL in new window
                        window.open(paymentResponse.data.paymentUrl, '_blank');
                        // Redirect to reservation status page
                        navigate(`/reservation-status/${reservationResponse.data.data._id}`);
                    } else {
                        throw new Error('Không thể tạo đơn đặt bàn');
                    }
                } else {
                    throw new Error('Không thể tạo URL thanh toán');
                }
            } else {
                // Create regular reservation without payment
                const reservationData = {
                    table_id: form.table_id,
                    date: form.date,
                    time: form.time,
                    guest_count: form.guest_count,
                    contact_name: form.name,
                    contact_phone: form.phone,
                    contact_email: form.email,
                    notes: form.notes,
                    status: 'confirmed'
                };

                const reservationResponse = await axios.post('/reservations', reservationData);

                if (reservationResponse?.data?.success) {
                    setErr('Đặt bàn thành công!');
                    setTimeout(() => {
                        navigate('/');
                    }, 2000);
                } else {
                    throw new Error('Không thể tạo đơn đặt bàn');
                }
            }
        } catch (error) {
            console.error('Lỗi xử lý đặt bàn:', error);
            setErr(error.response?.data?.message || error.message || 'Có lỗi xảy ra khi xử lý đặt bàn');
        } finally {
            setPaymentLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="auth-message">
                <div className="error-message">{err}</div>
                <div className="redirect-message">Đang chuyển hướng đến trang đăng nhập...</div>
            </div>
        );
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };


    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user?.userId) {
            fetchDataFromApi(`/api/cart?userId=${user.userId}`).then((res) => {
                setCartData(res);
                calculateTotal(res);
                // Initialize expandedItems
                const initialExpanded = {};
                res.forEach(item => {
                    initialExpanded[item._id] = false;
                });
                setExpandedItems(initialExpanded);
            });

            fetchDataFromApi(`/api/user/${user.userId}`).then((res) => {
                setUserData(res);
                setFormField({
                    fullname: res.name || '',
                    phoneNumber: res.phone || '',
                    email: res.email || '',
                    city: '',
                    details: '',
                    moreInfo: '',
                    note: '',
                });
                if (res.address && res.address.length > 0) {
                    setSelectedAddressIndex(0);
                    setFormField((prev) => ({
                        ...prev,
                        city: res.address[0].city || '',
                        details: res.address[0].details || '',
                        moreInfo: res.address[0].moreInfo || '',
                    }));
                }
            });
        }
    }, []);

    const checkout = async (e) => {
        e.preventDefault();

        const user = JSON.parse(localStorage.getItem('user'));

        if (!formField.fullname || !formField.phoneNumber || !formField.email || !formField.city || !formField.details) {
            context.setAlterBox({
                open: true,
                error: true,
                message: 'Vui lòng nhập đầy đủ thông tin bắt buộc',
            });
            return;
        }

        try {
            const res = await postData('/payment/create_payment_url', {
                amount: totalAmount,
                orderDescription: 'Thanh toán đơn hàng',
                orderType: 'pay',
                language: 'vn',
            });

            if (res?.paymentUrl && res?.orderId) {
                const orderData = {
                    fullname: formField.fullname,
                    phoneNumber: formField.phoneNumber,
                    email: formField.email,
                    city: formField.city,
                    address: `${formField.details}${formField.moreInfo ? `, ${formField.moreInfo}` : ''}`,
                    note: formField.note,
                    amount: totalAmount,
                    orderDescription: 'Thanh toán đơn hàng',
                    orderType: 'pay',
                    language: 'vn',
                    orderId: res.orderId,
                    userId: user?.userId,
                    products: cartData.map(item => ({
                        productId: item.productId,
                        productTitle: item.productTitle,
                        quantity: item.quantity,
                        images: item.images,
                        price: item.price,
                        subTotal: item.subTotal,
                        classifications: item.classifications || []
                    })),
                    status: 'Success',
                };

                await postData('/api/orders/create', orderData).then((res) => {
                    console.log('Order created:', res);
                });

                window.open(res.paymentUrl);
            } else {
                context.setAlterBox({
                    open: true,
                    error: true,
                    message: 'Không thể tạo URL thanh toán',
                });
            }
        } catch (error) {
            console.error('Lỗi thanh toán:', error);
            context.setAlterBox({
                open: true,
                error: true,
                message: 'Lỗi thanh toán: ' + error.message,
            });
        }
    };

    return (
        <div className="step4-container">
            <h2 className="step-title">Xác nhận đặt bàn</h2>

            <div className="confirmation-details">
                <div className="detail-group">
                    <div className="detail-header">
                        <FaUser className="detail-icon" />
                        <h4>Thông tin liên hệ</h4>
                    </div>
                    <div className="detail-content">
                        <div className="detail-item">
                            <span className="label">Họ tên:</span>
                            <span className="value">{form.name}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Email:</span>
                            <span className="value">{form.email || 'Không có'}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Số điện thoại:</span>
                            <span className="value">{form.phone}</span>
                        </div>
                    </div>
                </div>

                <div className="detail-group">
                    <div className="detail-header">
                        <FaCalendarAlt className="detail-icon" />
                        <h4>Thông tin đặt bàn</h4>
                    </div>
                    <div className="detail-content">
                        <div className="detail-item">
                            <span className="label">Ngày:</span>
                            <span className="value">{new Date(form.date).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Giờ:</span>
                            <span className="value">{form.time}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Số người:</span>
                            <span className="value">{form.guest_count} người</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Bàn:</span>
                            <span className="value">{form.table_name || form.table_id}</span>
                        </div>
                    </div>
                </div>

                {form.pre_order_items?.length > 0 && (
                    <div className="detail-group">
                        <div className="detail-header">
                            <FaUtensils className="detail-icon" />
                            <h4>Món đã chọn trước</h4>
                        </div>
                        <div className="menu-items-list">
                            {form.pre_order_items.map(item => {
                                const menuItem = menuItems[item.menu_item_id];
                                return (
                                    <div key={item.menu_item_id} className="menu-item">
                                        {menuItem ? (
                                            <>
                                                <div className="menu-item-info">
                                                    <span className="menu-item-name">{menuItem.name}</span>
                                                    <span className="menu-item-quantity">x{item.quantity}</span>
                                                </div>
                                                <span className="menu-item-price">
                                                    {(menuItem.price * item.quantity).toLocaleString()}đ
                                                </span>
                                            </>
                                        ) : (
                                            <span className="loading-text">Đang tải thông tin món...</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {form.notes && (
                    <div className="detail-group">
                        <div className="detail-header">
                            <FaStickyNote className="detail-icon" />
                            <h4>Ghi chú</h4>
                        </div>
                        <div className="detail-content">
                            <div className="notes-content">{form.notes}</div>
                        </div>
                    </div>
                )}
            </div>

            {err && (
                <div className={`message-box ${err.includes('thành công') ? 'success' : 'error'}`}>
                    {err}
                </div>
            )}

            <div className="action-buttons">
                <button
                    className="btn btn-secondary"
                    onClick={prev}
                    disabled={loading || paymentLoading}
                >
                    Quay lại
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handlePayment}
                    disabled={loading || paymentLoading}
                >
                    {paymentLoading ? 'Đang xử lý...' : form.pre_order_items?.length > 0 ? 'Thanh toán và đặt bàn' : 'Xác nhận đặt bàn'}
                </button>
            </div>

            <style jsx>{`
                .step4-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 24px;
                }

                .step-title {
                    font-size: 24px;
                    color: #2c3e50;
                    margin-bottom: 24px;
                    text-align: center;
                }

                .auth-message {
                    text-align: center;
                    padding: 40px 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin: 20px 0;
                }

                .error-message {
                    color: #dc3545;
                    font-size: 18px;
                    margin-bottom: 12px;
                }

                .redirect-message {
                    color: #6c757d;
                }

                .confirmation-details {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .detail-group {
                    background: #ffffff;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }

                .detail-header {
                    display: flex;
                    align-items: center;
                    padding: 16px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                }

                .detail-icon {
                    margin-right: 12px;
                    color: #2c3e50;
                    font-size: 18px;
                }

                .detail-header h4 {
                    margin: 0;
                    color: #2c3e50;
                    font-size: 18px;
                }

                .detail-content {
                    padding: 16px;
                }

                .detail-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #f1f3f5;
                }

                .detail-item:last-child {
                    border-bottom: none;
                }

                .label {
                    color: #6c757d;
                    font-weight: 500;
                }

                .value {
                    color: #2c3e50;
                    font-weight: 500;
                }

                .menu-items-list {
                    padding: 16px;
                }

                .menu-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid #f1f3f5;
                }

                .menu-item:last-child {
                    border-bottom: none;
                }

                .menu-item-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .menu-item-name {
                    font-weight: 500;
                    color: #2c3e50;
                }

                .menu-item-quantity {
                    color: #6c757d;
                    font-size: 0.9em;
                }

                .menu-item-price {
                    color: #e74c3c;
                    font-weight: 600;
                }

                .loading-text {
                    color: #6c757d;
                    font-style: italic;
                }

                .notes-content {
                    color: #2c3e50;
                    line-height: 1.5;
                    padding: 8px 0;
                }

                .message-box {
                    padding: 16px;
                    border-radius: 8px;
                    margin: 20px 0;
                    text-align: center;
                    font-weight: 500;
                }

                .message-box.success {
                    background-color: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }

                .message-box.error {
                    background-color: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }

                .action-buttons {
                    display: flex;
                    justify-content: center;
                    gap: 16px;
                    margin-top: 32px;
                }

                .btn {
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: none;
                    font-size: 16px;
                }

                .btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .btn-primary {
                    background-color: #3498db;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background-color: #2980b9;
                }

                .btn-secondary {
                    background-color: #e9ecef;
                    color: #2c3e50;
                }

                .btn-secondary:hover:not(:disabled) {
                    background-color: #dee2e6;
                }
            `}</style>
        </div>
    );
}
