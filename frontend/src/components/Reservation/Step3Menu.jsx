import React, { useEffect, useState } from 'react';
import axios from '../../utils/axios.customize';
import { Card, InputNumber, Button, Spin, Alert, Typography, Space, Divider } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function Step3Menu({ form, setForm, next, prev }) {
    const [menu, setMenu] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    useEffect(() => {
        const fetchMenuItems = async () => {
            try {
                setLoading(true);
                setErr('');
                const response = await axios.get('/menu-items');

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

    const calculateTotal = () => {
        return (form.pre_order_items || []).reduce((total, item) => {
            const menuItem = menu.find(m => m._id === item.menu_item_id);
            return total + (menuItem?.price || 0) * item.quantity;
        }, 0);
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }}>
            <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
                <ShoppingCartOutlined style={{ marginRight: 8 }} />
                Chọn món ăn (tùy chọn)
            </Title>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>Đang tải danh sách món ăn...</div>
                </div>
            ) : err ? (
                <Alert
                    message="Lỗi"
                    description={err}
                    type="error"
                    showIcon
                />
            ) : menu.length === 0 ? (
                <Alert
                    message="Thông báo"
                    description="Không có món ăn nào trong menu!"
                    type="info"
                    showIcon
                />
            ) : (
                <>
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        {menu.map(item => {
                            const found = (form.pre_order_items || []).find(i => i.menu_item_id === item._id);
                            return (
                                <Card key={item._id} hoverable style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <Title level={5} style={{ margin: 0 }}>{item.name}</Title>
                                            <Text type="secondary">{item.price.toLocaleString()}đ</Text>
                                        </div>
                                        <InputNumber
                                            min={0}
                                            value={found ? found.quantity : 0}
                                            onChange={value => handleChange(item._id, value || 0)}
                                            style={{ width: 100 }}
                                        />
                                    </div>
                                </Card>
                            );
                        })}
                    </Space>

                    <Divider />

                    <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Title level={4} style={{ margin: 0 }}>Tổng tiền:</Title>
                            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                                {calculateTotal().toLocaleString()}đ
                            </Title>
                        </div>
                    </Card>

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                        <Button size="large" onClick={prev}>
                            Quay lại
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            onClick={next}
                            disabled={loading}
                        >
                            Tiếp theo
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
