import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../Login/Login.css';
import axios from '../../utils/axios.customize';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        phone: ''
    });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(''); // <- Để hiển thị lỗi phía trên form
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: ''
            });
        }
        setFormError(''); // Clear lỗi chung khi người dùng thay đổi input
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.username.trim()) newErrors.username = 'Username is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

        if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);

        try {
            await axios.post(
                '/user/register',
                {
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.full_name,
                    phone: formData.phone
                }
            );

            // Registration successful
            navigate('/login', { state: { message: 'Đăng kí thành công!' } });
        } catch (error) {
            // Xử lý lỗi từ backend
            const errMsg = error.response?.data?.message;
            const errField = error.response?.data?.field;

            if (errMsg === "User already exists" && errField) {
                if (errField === "email") setFormError("Email đã tồn tại");
                else if (errField === "username") setFormError("Username đã tồn tại");
                else if (errField === "phone") setFormError("Số điện thoại đã tồn tại");
                else setFormError("Tài khoản đã tồn tại");
            } else {
                setFormError(
                    errMsg ||
                    error.message ||
                    'Registration failed. Please try again.'
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-bg">
            <div className="register-container">
                <div className="logo">Đăng ký tài khoản</div>
                {formError && <div className="error-message">{formError}</div>}

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">Tên đăng nhập*</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Nhập tên đăng nhập"
                            autoFocus
                            required
                        />
                        {errors.username && <span className="error-message">{errors.username}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email*</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Nhập email"
                            required
                        />
                        {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="full_name" className="form-label">Họ tên*</label>
                        <input
                            type="text"
                            id="full_name"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Nhập họ và tên"
                            required
                        />
                        {errors.full_name && <span className="error-message">{errors.full_name}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone" className="form-label">Số điện thoại*</label>
                        <input
                            type="text"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Nhập số điện thoại"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Mật khẩu*</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Nhập mật khẩu"
                            required
                        />
                        {errors.password && <span className="error-message">{errors.password}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">Nhập lại mật khẩu*</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Nhập lại mật khẩu"
                            required
                        />
                        {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                    </div>
                    <div className="form-group checkbox" style={{ margin: '12px 0 0 0' }}>
                        <input type="checkbox" id="terms" required style={{ marginRight: 7 }} />
                        <label htmlFor="terms" style={{ fontSize: '0.97rem', color: '#444' }}>
                            Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật
                        </label>
                    </div>
                    <button type="submit" className="button-login" disabled={isLoading}>
                        {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                    </button>
                    <p className="register-link">
                        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                    </p>
                </form>
            </div>
        </div>
    );

};

export default Register;
