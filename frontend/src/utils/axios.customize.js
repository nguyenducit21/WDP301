import axios from "axios";
import { toast } from 'react-toastify';

const baseUrl = "http://localhost:3000";

const customFetch = axios.create({
    baseURL: baseUrl,
    withCredentials: true, // allow to pass with cookies
});

// Add request interceptor to include auth token
customFetch.interceptors.request.use(
    (config) => {
        // Try to get token from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                // Try different token locations for compatibility
                const token = user.token || user.user?.token || localStorage.getItem('token');

                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (error) {
                console.log('Error parsing user data for token:', error);
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
customFetch.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle inactive account
        if (error.response?.status === 403 && error.response?.data?.inactive) {
            // Clear user data
            localStorage.removeItem('user');
            localStorage.removeItem('token');

            // Show toast notification and redirect to login
            toast.error("Tài khoản của bạn đã bị khóa", {
                onClose: () => {
                    window.location.href = '/login';
                }
            });
            return Promise.reject(error);
        }

        // Handle unauthorized
        if (error.response?.status === 401) {
            // Token expired or invalid - clear localStorage
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            // Optionally redirect to login page
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default customFetch 