import { createContext, useState, useEffect } from 'react';
import axios from '../utils/axios.customize';

export const AuthContext = createContext(null);

const AuthContextProvider = (props) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Kiểm tra xem có thông tin người dùng trong localStorage không
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        // console.log(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = async () => {
        try {
            // Gọi API logout
            const response = await fetch('http://localhost:5000/user/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                }
            });

            if (response.ok) {
                // Xóa thông tin người dùng khỏi state và localStorage
                setUser(null);
                localStorage.removeItem('user');
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
            return { success: true, message: 'Đã đăng xuất nhưng có lỗi kết nối với server' };
        }
    };

    const authContextValue = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {props.children}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider; 