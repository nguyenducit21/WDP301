import { createContext, useState, useEffect } from 'react';
import axios from '../utils/axios.customize';
import { toast } from 'react-toastify';

export const AuthContext = createContext(null);

const AuthContextProvider = (props) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Kiểm tra xem có thông tin người dùng trong localStorage không
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));

            // Verify user status on initial load
            verifyUserStatus();
        }
        setLoading(false);
    }, []);

    // Function to verify if user account is still active
    const verifyUserStatus = async () => {
        try {
            await axios.get('/user/verify-status');
        } catch (error) {
            if (error.response?.status === 403 && error.response?.data?.inactive) {
                // Account is inactive, handled by axios interceptor
                // Just to be safe, we'll also clear user data here
                setUser(null);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
    };

    const login = (userData) => {
        setUser(userData);

        // Lưu toàn bộ thông tin user
        localStorage.setItem('user', JSON.stringify(userData));

        // Lưu token riêng để dễ truy cập
        if (userData?.user?.token) {
            localStorage.setItem('token', userData.user.token);
        }
    };

    const logout = async () => {
        try {
            // Lấy token đúng cách - có thể từ user.user.token hoặc token riêng
            const token = user?.user?.token || localStorage.getItem('token');

            // Gọi API logout
            const response = await fetch('/user/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.ok) {
                // Xóa thông tin người dùng khỏi state và localStorage
                setUser(null);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                return { success: true };
            } else {
                const data = await response.json();
                return { success: false, message: data.message || 'Đăng xuất thất bại' };
            }
        } catch (error) {
            console.error('Lỗi khi đăng xuất:', error);
            // Nếu lỗi kết nối, vẫn xóa dữ liệu người dùng ở client
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            return { success: true, message: 'Đã đăng xuất nhưng có lỗi kết nối với server' };
        }
    };

    const authContextValue = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        // Thêm helper function để lấy token dễ dàng
        getToken: () => user?.user?.token || localStorage.getItem('token')
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {props.children}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider; 