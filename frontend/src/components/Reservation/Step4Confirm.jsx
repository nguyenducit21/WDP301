import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axios.customize';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Step4Confirm({ form, prev }) {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const [menuItems, setMenuItems] = useState({});
    const { user, isAuthenticated } = useContext(AuthContext);
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
                const response = await axios.get('/api/menu-items');
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

    const handleSubmit = async () => {
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

        setLoading(true);
        setErr('');
        try {
            const response = await axios.post('/api/reservations', {
                table_id: form.table_id,
                date: form.date,
                time: form.time,
                guest_count: form.guest_count,
                contact_name: form.name,
                contact_phone: form.phone,
                contact_email: form.email,
                pre_order_items: form.pre_order_items || [],
                notes: form.notes
            });

            if (response?.data?.success) {
                setErr('Đặt bàn thành công!');
                // Reset form or redirect after successful reservation
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            } else {
                setErr('Có lỗi xảy ra khi đặt bàn!');
            }
        } catch (error) {
            console.error('Error creating reservation:', error);
            if (error.response?.status === 401) {
                setErr('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
                setTimeout(() => {
                    navigate('/login', { state: { from: '/reservation' } });
                }, 2000);
            } else {
                setErr(error.response?.data?.message || 'Có lỗi xảy ra khi đặt bàn!');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ color: 'red', marginBottom: '16px' }}>{err}</div>
                <div>Đang chuyển hướng đến trang đăng nhập...</div>
            </div>
        );
    }

    return (
        <div>
            <h3>Xác nhận đặt bàn</h3>
            <div className="confirmation-details">
                <div className="detail-group">
                    <h4>Thông tin liên hệ</h4>
                    <div>Họ tên: {form.name}</div>
                    <div>Email: {form.email || 'Không có'}</div>
                    <div>Số điện thoại: {form.phone}</div>
                </div>

                <div className="detail-group">
                    <h4>Thông tin đặt bàn</h4>
                    <div>Ngày: {new Date(form.date).toLocaleDateString()}</div>
                    <div>Giờ: {form.time}</div>
                    <div>Số người: {form.guest_count}</div>
                    <div>Bàn: {form.table_name || form.table_id}</div>
                </div>

                {form.pre_order_items?.length > 0 && (
                    <div className="detail-group">
                        <h4>Món đã chọn trước</h4>
                        {form.pre_order_items.map(item => {
                            const menuItem = menuItems[item.menu_item_id];
                            return (
                                <div key={item.menu_item_id} className="menu-item">
                                    {menuItem ? (
                                        <>
                                            <span>{menuItem.name}</span>
                                            <span className="quantity">x{item.quantity}</span>
                                            <span className="price">
                                                {(menuItem.price * item.quantity).toLocaleString()}đ
                                            </span>
                                        </>
                                    ) : (
                                        <span>Đang tải thông tin món...</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {form.notes && (
                    <div className="detail-group">
                        <h4>Ghi chú</h4>
                        <div>{form.notes}</div>
                    </div>
                )}
            </div>

            {err && (
                <div style={{
                    color: err.includes('thành công') ? 'green' : 'red',
                    margin: '16px 0',
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: err.includes('thành công') ? '#e6ffe6' : '#ffe6e6'
                }}>
                    {err}
                </div>
            )}

            <div style={{ marginTop: '16px' }}>
                <button onClick={prev} disabled={loading}>
                    Quay lại
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{ marginLeft: 8 }}
                >
                    {loading ? 'Đang xử lý...' : 'Xác nhận đặt bàn'}
                </button>
            </div>

            <style jsx>{`
                .confirmation-details {
                    margin: 16px 0;
                }
                .detail-group {
                    margin-bottom: 16px;
                    padding: 12px;
                    border: 1px solid #eee;
                    border-radius: 4px;
                }
                .detail-group h4 {
                    margin: 0 0 8px 0;
                    color: #333;
                }
                .menu-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                }
                .menu-item:last-child {
                    border-bottom: none;
                }
                .quantity {
                    color: #666;
                    margin: 0 8px;
                }
                .price {
                    color: #e44d26;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
}
