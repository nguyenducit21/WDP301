import React, { useEffect, useState } from 'react';
import customFetch from '../../utils/axios.customize';
import './PromotionManagement.css';

const emptyForm = {
    code: '',
    type: 'percent',
    value: '',
    minOrderValue: '',
    maxDiscount: '',
    startDate: '',
    endDate: '',
    usageLimit: '',
    isActive: true,
    description: '',
};

const PromotionManagement = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchPromotions = async () => {
        setLoading(true);
        try {
            const res = await customFetch.get('/promotions');
            setPromotions(res.data.data || []);
        } catch (err) {
            setError('Lỗi khi tải danh sách khuyến mại');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            if (editingId) {
                await customFetch.put(`/promotions/${editingId}`, form);
                setSuccess('Cập nhật thành công!');
            } else {
                await customFetch.post('/promotions', form);
                setSuccess('Thêm mới thành công!');
            }
            setForm(emptyForm);
            setEditingId(null);
            fetchPromotions();
        } catch (err) {
            setError(err.response?.data?.message || 'Lỗi khi lưu khuyến mại');
        }
    };

    const handleEdit = (promo) => {
        setForm({ ...promo, startDate: promo.startDate?.slice(0, 10), endDate: promo.endDate?.slice(0, 10) });
        setEditingId(promo._id);
        setError('');
        setSuccess('');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xác nhận xóa khuyến mại này?')) return;
        try {
            await customFetch.delete(`/promotions/${id}`);
            setSuccess('Đã xóa!');
            fetchPromotions();
        } catch (err) {
            setError('Lỗi khi xóa');
        }
    };

    const handleCancel = () => {
        setForm(emptyForm);
        setEditingId(null);
        setError('');
        setSuccess('');
    };

    return (
        <div className="promotion-management-container">
            <h2>Quản lý khuyến mại</h2>
            <form onSubmit={handleSubmit} className="promotion-form">
                <div className="form-row">
                    <input name="code" value={form.code} onChange={handleChange} placeholder="Mã khuyến mại" required />
                    <select name="type" value={form.type} onChange={handleChange}>
                        <option value="percent">Giảm theo %</option>
                        <option value="fixed">Giảm số tiền</option>
                        <option value="first_order">Đơn đầu tiên</option>
                    </select>
                    <input name="value" value={form.value} onChange={handleChange} placeholder="Giá trị" type="number" required />
                    <input name="minOrderValue" value={form.minOrderValue} onChange={handleChange} placeholder="Đơn tối thiểu" type="number" />
                    <input name="maxDiscount" value={form.maxDiscount} onChange={handleChange} placeholder="Giảm tối đa" type="number" />
                    <input name="usageLimit" value={form.usageLimit} onChange={handleChange} placeholder="Số lượt dùng" type="number" />
                    <input name="startDate" value={form.startDate} onChange={handleChange} type="date" required />
                    <input name="endDate" value={form.endDate} onChange={handleChange} type="date" required />
                    <input name="description" value={form.description} onChange={handleChange} placeholder="Mô tả" />
                    <label>
                        <input name="isActive" type="checkbox" checked={form.isActive} onChange={handleChange} /> Kích hoạt
                    </label>
                </div>
                <div style={{ marginTop: 12 }}>
                    <button type="submit">{editingId ? 'Cập nhật' : 'Thêm mới'}</button>
                    {editingId && <button type="button" onClick={handleCancel} style={{ marginLeft: 8 }}>Hủy</button>}
                </div>
                {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
                {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
            </form>
            <table className="promotion-table">
                <thead>
                    <tr>
                        <th>Mã</th>
                        <th>Loại</th>
                        <th>Giá trị</th>
                        <th>Đơn tối thiểu</th>
                        <th>Giảm tối đa</th>
                        <th>Số lượt</th>
                        <th>Đã dùng</th>
                        <th>Ngày bắt đầu</th>
                        <th>Ngày kết thúc</th>
                        <th>Kích hoạt</th>
                        <th>Mô tả</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {promotions.map((promo) => (
                        <tr key={promo._id} style={{ background: promo.isActive ? '#eaffea' : '#ffeaea' }}>
                            <td>{promo.code}</td>
                            <td>{promo.type}</td>
                            <td>{promo.value}</td>
                            <td>{promo.minOrderValue}</td>
                            <td>{promo.maxDiscount}</td>
                            <td>{promo.usageLimit}</td>
                            <td>{promo.usedCount}</td>
                            <td>{promo.startDate ? new Date(promo.startDate).toLocaleDateString() : ''}</td>
                            <td>{promo.endDate ? new Date(promo.endDate).toLocaleDateString() : ''}</td>
                            <td>{promo.isActive ? '✔️' : '❌'}</td>
                            <td>{promo.description}</td>
                            <td>
                                <button className="action-btn" onClick={() => handleEdit(promo)}>Sửa</button>
                                <button className="action-btn delete" onClick={() => handleDelete(promo._id)}>Xóa</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PromotionManagement; 