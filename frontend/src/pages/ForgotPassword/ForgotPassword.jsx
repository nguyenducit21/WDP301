import React, { useState } from 'react';
import axios from '../../utils/axios.customize';
import { useNavigate } from 'react-router-dom';


const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: nhập email, 2: nhập mã + mk mới
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const [resetToken, setResetToken] = useState('');


    // Bước 1: Gửi mã xác nhận
    const handleSendCode = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!email.trim()) return setError('Vui lòng nhập email.');

        setIsLoading(true);
        try {
            // Nhận resetToken từ backend
            const res = await axios.post('/user/forgot-password', { email });
            setMessage('Đã gửi mã xác nhận tới email. Vui lòng kiểm tra email và nhập mã xác nhận.');
            setStep(2);

            // Lưu lại resetToken vào state
            setResetToken(res.data.resetToken);

        } catch (err) {
            setError(err.response?.data?.message || 'Gửi email thất bại.');
        } finally {
            setIsLoading(false);
        }
    };


    // Bước 2: Nhập mã và đổi mật khẩu
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!code.trim() || !password || !confirm) return setError('Vui lòng nhập đầy đủ thông tin.');
        if (password !== confirm) return setError('Mật khẩu không khớp.');

        setIsLoading(true);
        try {
            await axios.post('/user/reset-password', { 
                email, 
                code, 
                newPassword: password, 
                resetToken 
            });
            setMessage('Đổi mật khẩu thành công! Chuyển về đăng nhập...');
            setTimeout(() => navigate('/login', { state: { message: 'Đổi mật khẩu thành công!' } }), 1600);
        } catch (err) {
            setError(err.response?.data?.message || 'Đổi mật khẩu thất bại.');
        } finally {
            setIsLoading(false);
        }
    };

    // Hàm xử lý khi bấm "Hủy"
    const handleCancel = (e) => {
        e.preventDefault();
        navigate('/login');
    };

    return (
        <div className="login-bg">
            <div className="login-container">
                <div className="logo">Quên mật khẩu</div>
                {message && <div className="success-message">{message}</div>}
                {error && <div className="error-message">{error}</div>}
                {step === 1 ? (
                    <form onSubmit={handleSendCode}>
                        <div className="form-group">
                            <label className="form-label">Nhập email đăng ký</label>
                            <input
                                type="email"
                                className="input-field"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Nhập email"
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="button-login" disabled={isLoading}>
                            {isLoading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
                        </button>

                        {/* Nút Hủy */}
                        <button
                            type="button"
                            className="button-cancel"
                            onClick={handleCancel}
                            style={{
                                width: '100%',
                                marginTop: 12,
                                background: '#f5f5f5',
                                color: '#ed8936',
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                padding: '11px',
                                fontSize: '1rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'background 0.17s'
                            }}
                        >
                            Hủy
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <div className="form-group">
                            <label className="form-label">Mã xác nhận đã gửi về email</label>
                            <input
                                type="text"
                                className="input-field"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                placeholder="Nhập mã xác nhận"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mật khẩu mới</label>
                            <input
                                type="password"
                                className="input-field"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Nhập mật khẩu mới"
                                required
                                autoComplete="new-password"
                            />

                        </div>
                        <div className="form-group">
                            <label className="form-label">Nhập lại mật khẩu mới</label>
                            <input
                                type="password"
                                className="input-field"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="Nhập lại mật khẩu mới"
                                required
                                autoComplete="new-password"
                            />

                        </div>
                        <button type="submit" className="button-login" disabled={isLoading}>
                            {isLoading ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
                        </button>

                        {/* Nút Hủy */}
                        <button
                            type="button"
                            className="button-cancel"
                            onClick={handleCancel}
                            style={{
                                width: '100%',
                                marginTop: 12,
                                background: '#f5f5f5',
                                color: '#ed8936',
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                padding: '11px',
                                fontSize: '1rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'background 0.17s'
                            }}
                        >
                            Hủy
                        </button>

                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
