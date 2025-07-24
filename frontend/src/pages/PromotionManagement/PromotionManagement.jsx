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
            // Lấy tất cả mã khuyến mại, không lọc theo isActive
            const res = await customFetch.get('/promotions?includeAll=true');
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
        console.log('Submitting form data:', form);
        try {
            if (editingId) {
                const response = await customFetch.put(`/promotions/${editingId}`, form);
                console.log('Update response:', response.data);
                setSuccess('Cập nhật thành công!');
            } else {
                const response = await customFetch.post('/promotions', form);
                console.log('Create response:', response.data);
                setSuccess('Thêm mới thành công!');
            }
            setForm(emptyForm);
            setEditingId(null);
            fetchPromotions();
        } catch (err) {
            console.error('Error saving promotion:', err);
            setError(err.response?.data?.message || 'Lỗi khi lưu khuyến mại');
        }
    };

    const handleEdit = (promo) => {
        console.log('Editing promotion:', promo);
        setForm({
            ...promo,
            startDate: promo.startDate?.slice(0, 10),
            endDate: promo.endDate?.slice(0, 10),
            description: promo.description || ''
        });
        setEditingId(promo._id);
        setError('');
        setSuccess('');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xác nhận xóa khuyến mại này?')) return;
        try {
            await customFetch.delete(`/promotions/${id}`);
            setSuccess('Đã xóa thành công!');
            fetchPromotions();
        } catch (err) {
            setError('Lỗi khi xóa mã khuyến mại');
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
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                <h2>Quản lý khuyến mại</h2>
                <button 
                    onClick={fetchPromotions} 
                    className="refresh-button"
                >
                    <span>🔄</span> Làm mới
                </button>
            </div>
            
            <div className="promotion-form">
                {editingId ? (
                    <div className="form-header">Chỉnh sửa mã khuyến mại</div>
                ) : (
                    <div className="form-header">Thêm mã khuyến mại mới</div>
                )}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div style={{flex: 1, minWidth: 200}}>
                            <label htmlFor="code">Mã khuyến mại</label>
                            <input 
                                id="code"
                                name="code" 
                                value={form.code} 
                                onChange={handleChange} 
                                placeholder="Nhập mã khuyến mại" 
                                required 
                                disabled={!!editingId} 
                            />
                        </div>
                        <div style={{flex: 1, minWidth: 200}}>
                            <label htmlFor="type">Loại giảm giá</label>
                            <select 
                                id="type"
                                name="type" 
                                value={form.type} 
                                onChange={handleChange}
                            >
                                <option value="percent">Giảm theo %</option>
                                <option value="fixed">Giảm số tiền</option>
                                <option value="first_order">Đơn đầu tiên</option>
                            </select>
                        </div>
                        <div style={{flex: 1, minWidth: 200}}>
                            <label htmlFor="value">Giá trị</label>
                            <input 
                                id="value"
                                name="value" 
                                value={form.value} 
                                onChange={handleChange} 
                                placeholder="Nhập giá trị" 
                                type="number" 
                                required 
                            />
                        </div>
                    </div>
                    
                    <div className="form-row">
                        <div style={{flex: 1, minWidth: 200}}>
                            <label htmlFor="minOrderValue">Đơn tối thiểu (VNĐ)</label>
                            <input 
                                id="minOrderValue"
                                name="minOrderValue" 
                                value={form.minOrderValue} 
                                onChange={handleChange} 
                                placeholder="Đơn tối thiểu" 
                                type="number" 
                            />
                        </div>
                        <div style={{flex: 1, minWidth: 200}}>
                            <label htmlFor="maxDiscount">Giảm tối đa (VNĐ)</label>
                            <input 
                                id="maxDiscount"
                                name="maxDiscount" 
                                value={form.maxDiscount} 
                                onChange={handleChange} 
                                placeholder="Giảm tối đa" 
                                type="number" 
                            />
                        </div>
                        <div style={{flex: 1, minWidth: 200}}>
                            <label htmlFor="usageLimit">Số lượt dùng</label>
                            <input 
                                id="usageLimit"
                                name="usageLimit" 
                                value={form.usageLimit} 
                                onChange={handleChange} 
                                placeholder="Không giới hạn nếu để trống" 
                                type="number" 
                            />
                        </div>
                    </div>
                    
                    <div className="form-row">
                        <div style={{flex: 1, minWidth: 200}}>
                            <label htmlFor="startDate">Ngày bắt đầu</label>
                            <input 
                                id="startDate"
                                name="startDate" 
                                value={form.startDate} 
                                onChange={handleChange} 
                                type="date" 
                                required 
                            />
                        </div>
                        <div style={{flex: 1, minWidth: 200}}>
                            <label htmlFor="endDate">Ngày kết thúc</label>
                            <input 
                                id="endDate"
                                name="endDate" 
                                value={form.endDate} 
                                onChange={handleChange} 
                                type="date" 
                                required 
                            />
                        </div>
                        <div style={{flex: 1, minWidth: 200}}>
                            <label htmlFor="description">Mô tả</label>
                            <input 
                                id="description"
                                name="description" 
                                value={form.description} 
                                onChange={handleChange} 
                                placeholder="Mô tả mã khuyến mại" 
                            />
                        </div>
                    </div>
                    
                    <div className="form-row" style={{alignItems: 'center'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <input 
                                id="isActive"
                                name="isActive" 
                                type="checkbox" 
                                checked={form.isActive} 
                                onChange={handleChange} 
                            />
                            <label htmlFor="isActive" style={{marginBottom: 0}}>Kích hoạt</label>
                        </div>
                        
                        <div style={{marginLeft: 'auto'}}>
                            <button type="submit" className="add-button">
                                {editingId ? 'Lưu thay đổi' : 'Thêm mới'}
                            </button>
                            {editingId && (
                                <button type="button" onClick={handleCancel} style={{marginLeft: '8px'}}>
                                    Hủy
                                </button>
                            )}
                        </div>
                    </div>
                </form>
                
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
            </div>
            
            <div className="table-header">
                <h3>Danh sách mã khuyến mại</h3>
                <div className="table-counter">
                    Tổng số: {promotions.length} mã
                </div>
            </div>
            
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
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {promotions.map(promo => {
                        // Kiểm tra mã đã hết lượt dùng chưa
                        const isExhausted = promo.isExhausted || (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit);
                        
                        return (
                            <tr key={promo._id} className={isExhausted ? 'exhausted-row' : ''}>
                                <td className="code-cell">
                                    {promo.code}
                                    {isExhausted && <span className="exhausted-badge">Hết lượt</span>}
                                </td>
                                <td>
                                    {promo.type === 'percent' ? 'Phần trăm' : 
                                     promo.type === 'fixed' ? 'Số tiền' : 
                                     'Đơn đầu tiên'}
                                </td>
                                <td>
                                    <strong>
                                        {promo.value}{promo.type === 'percent' ? '%' : 'đ'}
                                    </strong>
                                </td>
                                <td>{promo.minOrderValue ? `${promo.minOrderValue.toLocaleString()}đ` : '-'}</td>
                                <td>{promo.maxDiscount ? `${promo.maxDiscount.toLocaleString()}đ` : '-'}</td>
                                <td>{promo.usageLimit === null ? 'Không giới hạn' : promo.usageLimit}</td>
                                <td>
                                    <span style={{
                                        color: isExhausted ? '#b91c1c' : '#0284c7',
                                        fontWeight: isExhausted ? '600' : '400'
                                    }}>
                                        {promo.usedCount || 0}
                                        {promo.usageLimit !== null && ` / ${promo.usageLimit}`}
                                    </span>
                                </td>
                                <td>{new Date(promo.startDate).toLocaleDateString('vi-VN')}</td>
                                <td>{new Date(promo.endDate).toLocaleDateString('vi-VN')}</td>
                                <td>
                                    <span className={`status-badge ${promo.isActive ? 'active' : 'inactive'}`}>
                                        {promo.isActive ? '✓ Kích hoạt' : '✗ Vô hiệu'}
                                    </span>
                                </td>
                                <td>
                                    <button onClick={() => handleEdit(promo)}>Sửa</button>
                                    <button onClick={() => handleDelete(promo._id)} className="delete-btn">Xóa</button>
                                </td>
                            </tr>
                        );
                    })}
                    
                    {promotions.length === 0 && (
                        <tr>
                            <td colSpan="11" style={{textAlign: 'center', padding: '24px 0', color: '#64748b'}}>
                                Chưa có mã khuyến mại nào
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default PromotionManagement; 