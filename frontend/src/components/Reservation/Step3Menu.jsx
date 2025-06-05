import React, { useEffect, useState } from 'react';
import axios from '../../utils/axios.customize';

export default function Step3Menu({ form, setForm, next, prev }) {
    const [menu, setMenu] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    useEffect(() => {
        const fetchMenuItems = async () => {
            try {
                setLoading(true);
                setErr('');
                const response = await axios.get('/api/menu-items');

                if (response?.data?.success && Array.isArray(response.data.data)) {
                    setMenu(response.data.data);
                } else {
                    console.error('Invalid response format:', response);
                    setMenu([]);
                    setErr('Không thể tải danh sách món ăn');
                }
            } catch (error) {
                console.error('Error fetching menu items:', error);
                setMenu([]);
                setErr(error.response?.data?.message || 'Có lỗi xảy ra khi tải danh sách món ăn');
            } finally {
                setLoading(false);
            }
        };

        fetchMenuItems();
    }, []);

    const handleChange = (id, qty) => {
        const currentItems = form.pre_order_items || [];
        let items = currentItems.filter(i => i.menu_item_id !== id);
        if (qty > 0) {
            items.push({ menu_item_id: id, quantity: qty });
        }
        setForm({ ...form, pre_order_items: items });
    };

    return (
        <div>
            <h3>Chọn món (tùy chọn)</h3>
            {loading ? (
                <div>Đang tải danh sách món ăn...</div>
            ) : err ? (
                <div style={{ color: 'red' }}>{err}</div>
            ) : menu.length === 0 ? (
                <div>Không có món ăn nào!</div>
            ) : (
                menu.map(item => {
                    const found = (form.pre_order_items || []).find(i => i.menu_item_id === item._id);
                    return (
                        <div key={item._id} style={{ margin: '8px 0' }}>
                            {item.name} - {item.price.toLocaleString()}đ
                            <input
                                type="number"
                                min={0}
                                value={found ? found.quantity : 0}
                                onChange={e => handleChange(item._id, parseInt(e.target.value) || 0)}
                                style={{ width: 60, marginLeft: 8 }}
                            />
                        </div>
                    );
                })
            )}
            <div style={{ marginTop: '16px' }}>
                <button onClick={prev}>Quay lại</button>
                <button
                    onClick={next}
                    style={{ marginLeft: 8 }}
                    disabled={loading}
                >
                    Tiếp theo
                </button>
            </div>
        </div>
    );
}
