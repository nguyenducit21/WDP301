import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Login.css';
import axios from '../../utils/axios.customize';
import { AuthContext } from '../../context/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Check for any messages passed from other pages (like successful registration)
    useEffect(() => {
        if (location.state?.message) {
            setMessage(location.state.message);
            // Clear the message from location state to prevent showing it again on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        // Clear error when user types
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: ''
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.username.trim()) newErrors.username = 'Username or email is required';
        if (!formData.password) newErrors.password = 'Password is required';
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
            const response = await axios.post(
                '/user/login',
                {
                    username: formData.username,
                    password: formData.password
                },
                { withCredentials: true }
            );

            // Lưu thông tin người dùng vào AuthContext
            login(response.data);

            // Redirect to home or intended page
            const redirectTo = location.state?.from || '/';
            navigate(redirectTo);
        } catch (error) {
            console.error('Login error:', error);
            setErrors({
                form:
                    error.response?.data?.message ||
                    error.message ||
                    'Login failed. Please check your credentials.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-bg">
            <div className="login-container">
                <div className="logo">Đăng nhập</div>

                {message && <div className="success-message">{message}</div>}
                {errors.form && <div className="error-message">{errors.form}</div>}

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">Email/Tên đăng nhập</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Nhập email hoặc tên đăng nhập"
                            autoFocus
                            required
                        />
                        {errors.username && <span className="error-message">{errors.username}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Mật khẩu</label>
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

                    <div className="forgot-password">
                        <Link to="/forgot-password">Quên mật khẩu?</Link>
                    </div>

                    <button type="submit" className="button-login" disabled={isLoading}>
                        {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                    <p className="register-link">
                        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
