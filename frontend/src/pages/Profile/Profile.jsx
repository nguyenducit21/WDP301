import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios.customize';
import './Profile.css';
import ReservationHistory from '../../components/ReservationHistory/ReservationHistory';

const Profile = () => {
    const { user, isAuthenticated, login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [formData, setFormData] = useState({
        full_name: user?.user?.full_name || '',
        phone: user?.user?.phone || '',
    });
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Thêm state riêng cho modal
    const [modalMessage, setModalMessage] = useState('');
    const [modalError, setModalError] = useState('');

    React.useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: '/profile', message: 'Vui lòng đăng nhập để xem thông tin cá nhân' } });
        }
    }, [isAuthenticated, navigate]);

    React.useEffect(() => {
        if (user?.user) {
            setFormData({
                full_name: user.user.full_name || '',
                phone: user.user.phone || '',
            });
        }
    }, [user]);

    if (!user) {
        return <div className="loading">Đang tải...</div>;
    }

    const userData = user.user || {};

    const handleEditProfile = () => {
        setMessage('');
        setError('');
        setModalMessage('');
        setModalError('');
        setIsEditing(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setModalMessage('');
        setModalError('');
        try {
            const response = await axios.put('/user/update-profile', {
                userId: userData.id || userData._id,
                full_name: formData.full_name,
                phone: formData.phone
            }, {
                headers: {
                    Authorization: `Bearer ${userData.token}`
                },
                withCredentials: true
            });

            if (response.status === 200) {
                login({
                    ...user,
                    user: {
                        ...userData,
                        full_name: response.data.user.full_name,
                        phone: response.data.user.phone
                    }
                });
                setModalMessage('Cập nhật thông tin thành công!');
                setTimeout(() => {
                    setModalMessage('');
                    setIsEditing(false);
                }, 2000);
            }
        } catch (err) {
            setModalError(err.response?.data?.message || 'Cập nhật thất bại');
        }
    };

    const handleChangePassword = () => {
        setPasswordForm({
            oldPassword: '',
            newPassword: '',
            confirmNewPassword: ''
        });
        setMessage('');
        setError('');
        setModalMessage('');
        setModalError('');
        setIsChangingPassword(true);
    };

    const handlePasswordFormChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        setModalMessage('');
        setModalError('');

        if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
            setModalError('Mật khẩu mới không khớp!');
            return;
        }

        try {
            const response = await axios.put('/user/change-password', {
                userId: userData.id || userData._id,
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword
            }, {
                headers: {
                    Authorization: `Bearer ${userData.token}`
                },
                withCredentials: true
            });

            if (response.status === 200) {
                setModalMessage('Đổi mật khẩu thành công!');
                setTimeout(() => {
                    setModalMessage('');
                    setIsChangingPassword(false);
                }, 1000);
            }
        } catch (err) {
            setModalError(err.response?.data?.message || 'Đổi mật khẩu thất bại');
        }
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1>Thông tin cá nhân</h1>
            </div>

            <div className="profile-tabs">
                <button
                    className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    Thông tin tài khoản
                </button>
                <button
                    className={`tab-button ${activeTab === 'reservations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reservations')}
                >
                    Lịch sử đặt bàn
                </button>
            </div>

            {activeTab === 'reservations' && (
                <ReservationHistory userId={userData.id || userData._id} />
            )}

            <div className="profile-content">
                {activeTab === 'profile' && (
                    <div className="profile-info">
                        <div className="profile-avatar">
                            <div className="avatar-placeholder">
                                {userData.full_name
                                    ? userData.full_name.charAt(0).toUpperCase()
                                    : (userData.username || '').charAt(0).toUpperCase()}
                            </div>
                        </div>

                        <div className="profile-details">
                            <div className="info-group">
                                <label>Tên đăng nhập:</label>
                                <p>{userData.username}</p>
                            </div>
                            <div className="info-group">
                                <label>Họ và tên:</label>
                                <p>{userData.full_name || 'Chưa cập nhật'}</p>
                            </div>
                            <div className="info-group">
                                <label>Email:</label>
                                <p>{userData.email}</p>
                            </div>
                            <div className="info-group">
                                <label>Số điện thoại:</label>
                                <p>{userData.phone || 'Chưa cập nhật'}</p>
                            </div>
                        </div>

                        <div className="profile-actions">
                            <button className="btn-edit-profile" onClick={handleEditProfile}>
                                Chỉnh sửa thông tin
                            </button>
                            <button className="btn-change-password" onClick={handleChangePassword}>
                                Đổi mật khẩu
                            </button>
                        </div>

                        {message && <div className="success-message">{message}</div>}
                        {error && <div className="error-message">{error}</div>}
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="orders-history">
                        <p className="no-data">Bạn chưa có lịch sử đặt món nào.</p>
                    </div>
                )}

                {/* Modal chỉnh sửa thông tin */}
                {isEditing && (
                    <div className="edit-profile-modal">
                        <div className="modal-content">
                            <h2>Chỉnh sửa thông tin cá nhân</h2>

                            {/* Hiển thị message và error trong modal */}
                            {modalMessage && <div className="success-message">{modalMessage}</div>}
                            {modalError && <div className="error-message">{modalError}</div>}

                            <form onSubmit={handleFormSubmit}>
                                <div className="form-group">
                                    <label>Họ và tên:</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleFormChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Số điện thoại:</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleFormChange}
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn-save">Lưu thay đổi</button>
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setModalMessage('');
                                            setModalError('');
                                        }}
                                    >
                                        Hủy
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal đổi mật khẩu */}
                {isChangingPassword && (
                    <div className="edit-profile-modal">
                        <div className="modal-content">
                            <h2>Đổi mật khẩu</h2>

                            {/* Hiển thị message và error trong modal */}
                            {modalMessage && <div className="success-message">{modalMessage}</div>}
                            {modalError && <div className="error-message">{modalError}</div>}

                            <form onSubmit={handleChangePasswordSubmit}>
                                <div className="form-group">
                                    <label>Mật khẩu cũ:</label>
                                    <input
                                        type="password"
                                        name="oldPassword"
                                        value={passwordForm.oldPassword}
                                        onChange={handlePasswordFormChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Mật khẩu mới:</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordForm.newPassword}
                                        onChange={handlePasswordFormChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Xác nhận mật khẩu mới:</label>
                                    <input
                                        type="password"
                                        name="confirmNewPassword"
                                        value={passwordForm.confirmNewPassword}
                                        onChange={handlePasswordFormChange}
                                        required
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn-save">Đổi mật khẩu</button>
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={() => {
                                            setIsChangingPassword(false);
                                            setModalMessage('');
                                            setModalError('');
                                        }}
                                    >
                                        Hủy
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
