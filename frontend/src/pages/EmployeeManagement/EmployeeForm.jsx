import React, { useState, useEffect } from 'react';

const EmployeeForm = ({ employee, roles, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        phone: '',
        birth_date: '',
        role_name: '',
        status: 'active'
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (employee) {
            // Format birth_date for input[type="date"]
            const birthDate = employee.birth_date ?
                new Date(employee.birth_date).toISOString().split('T')[0] : '';

            setFormData({
                username: employee.username || '',
                email: employee.email || '',
                full_name: employee.full_name || '',
                phone: employee.phone || '',
                birth_date: birthDate,
                role_name: employee.role_id?.name || '',
                status: employee.status || 'active'
            });
        }
    }, [employee]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Tên đăng nhập là bắt buộc';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email là bắt buộc';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email không hợp lệ';
        }

        if (!formData.birth_date) {
            newErrors.birth_date = 'Ngày sinh là bắt buộc';
        } else {
            // Kiểm tra tuổi (phải trên 18)
            const birthDate = new Date(formData.birth_date);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (age < 18 || (age === 18 && monthDiff < 0) ||
                (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                newErrors.birth_date = 'Nhân viên phải đủ 18 tuổi trở lên';
            }
        }

        if (!formData.role_name) {
            newErrors.role_name = 'Vai trò là bắt buộc';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Lỗi khi submit form:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Xóa lỗi khi user bắt đầu nhập
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content employee-form-modal">
                <div className="modal-header">
                    <h2>{employee ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}</h2>
                    <button className="close-btn" onClick={onCancel}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="employee-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="username">Tên đăng nhập *</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className={errors.username ? 'error' : ''}
                                disabled={loading}
                            />
                            {errors.username && <span className="error-text">{errors.username}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email *</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={errors.email ? 'error' : ''}
                                disabled={loading}
                            />
                            {errors.email && <span className="error-text">{errors.email}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="full_name">Họ tên</label>
                            <input
                                type="text"
                                id="full_name"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone">Số điện thoại</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="birth_date">Ngày sinh *</label>
                            <input
                                type="date"
                                id="birth_date"
                                name="birth_date"
                                value={formData.birth_date}
                                onChange={handleChange}
                                className={errors.birth_date ? 'error' : ''}
                                disabled={loading}
                                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                            />
                            {errors.birth_date && <span className="error-text">{errors.birth_date}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="role_name">Vai trò *</label>
                            <select
                                id="role_name"
                                name="role_name"
                                value={formData.role_name}
                                onChange={handleChange}
                                className={errors.role_name ? 'error' : ''}
                                disabled={loading}
                            >
                                <option value="">Chọn vai trò</option>
                                {roles.map(role => (
                                    <option key={role._id} value={role.name}>
                                        {role.name} - {role.description}
                                    </option>
                                ))}
                            </select>
                            {errors.role_name && <span className="error-text">{errors.role_name}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="status">Trạng thái</label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                disabled={loading}
                            >
                                <option value="active">Hoạt động</option>
                                <option value="inactive">Không hoạt động</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Đang lưu...' : (employee ? 'Cập nhật' : 'Tạo mới')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmployeeForm;
