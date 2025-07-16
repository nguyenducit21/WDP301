import { useState, useEffect, useMemo } from 'react';
import customFetch from '../utils/axios.customize';



// Get today's date
const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const useReservation = () => {
    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        guest_count: 1,
        date: getTodayDate(),
        slot_id: ""
    });

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [reservationId, setReservationId] = useState(null);

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check authentication status and auto-fill user info
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const userResponse = JSON.parse(userData);
                const user = userResponse.user || userResponse; // Handle both formats

                if (user.id || user._id) {
                    setIsAuthenticated(true);

                    // Auto-fill form with user info
                    setForm(prevForm => ({
                        ...prevForm,
                        name: user.full_name || user.name || prevForm.name,
                        email: user.email || prevForm.email,
                        phone: user.phone || prevForm.phone, // Thêm dòng này
                        // Keep existing values for guest_count, date, slot_id
                    }));
                } else {
                    setIsAuthenticated(false);
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
                setIsAuthenticated(false);
            }
        } else {
            setIsAuthenticated(false);
        }
    }, []);

    const handleInput = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSlotChange = (e) => {
        setForm({ ...form, slot_id: e.target.value });
    };

    const resetForm = () => {
        // Check if user is logged in to preserve their info
        const userData = localStorage.getItem('user');
        let userName = "";
        let userEmail = "";
        let userPhone = "";

        if (userData) {
            try {
                const userResponse = JSON.parse(userData);
                const user = userResponse.user || userResponse;
                userName = user.full_name || user.name || "";
                userEmail = user.email || "";
                userPhone = user.phone || "";
            } catch (e) {
                console.error('Error parsing user data in resetForm:', e);
            }
        }

        setForm({
            name: userName, // Keep user name if logged in
            phone: userPhone,
            email: userEmail, // Keep user email if logged in
            guest_count: 1,
            date: getTodayDate(),
            slot_id: ""
        });
    };

    const submitReservation = async (selectedTables) => {
        setError("");
        setSuccess(false);

        // Validation
        if (
            !form.name ||
            !form.phone ||
            !form.date ||
            !form.slot_id ||
            !selectedTables.length
        ) {
            setError("Vui lòng nhập đầy đủ thông tin và chọn bàn!");
            return false;
        }

        // Check if guest count exceeds available capacity
        const MAX_CAPACITY = 23;
        if (form.guest_count >= MAX_CAPACITY) {
            setError("Số lượng khách vượt quá giới hạn đặt bàn trực tuyến (tối đa 23 người). Vui lòng liên hệ trực tiếp để đặt bàn số lượng lớn.");
            return false;
        }

        setSubmitting(true);
        try {
            const reservationData = {
                table_ids: selectedTables.map(table => table._id),
                date: form.date,
                slot_id: form.slot_id,
                guest_count: form.guest_count,
                contact_name: form.name,
                contact_phone: form.phone,
                contact_email: form.email,
                payment_status: 'pending'
            };

            const response = await customFetch.post("/reservations", reservationData);

            if (response?.data?.data?._id) {
                setReservationId(response.data.data._id);
                setShowSuccessModal(true);
                setSuccess(false);
                resetForm();
                return true;
            }
            return false;
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "Đặt bàn thất bại");
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    // Validate các trường đặt bàn
    const nameRegex = /^[a-zA-ZÀ-ỹ\s]+$/;
    const phoneRegex = /^0\d{9}$/;
    const MAX_CAPACITY = 23; // Có thể cho truyền vào nếu cần

    const validateField = (name, value, getMaxPossibleCapacity = () => MAX_CAPACITY) => {
        let error = '';
        if (name === 'name') {
            if (!value.trim()) {
                error = 'Họ và tên không được để trống';
            } else if (!nameRegex.test(value.trim())) {
                error = 'Họ và tên chỉ được chứa chữ cái và khoảng trắng';
            }
        }
        if (name === 'phone') {
            if (!value.trim()) {
                error = 'Số điện thoại không được để trống';
            } else if (!phoneRegex.test(value.trim())) {
                error = 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0';
            }
        }
        if (name === 'guest_count') {
            const guestCount = Number(value);
            if (!guestCount || guestCount < 1) {
                error = 'Số lượng khách phải lớn hơn hoặc bằng 1';
            } else if (guestCount > getMaxPossibleCapacity()) {
                error = `Số lượng khách vượt quá sức chứa tối đa (${getMaxPossibleCapacity()})`;
            }
        }
        return error;
    };

    const validateForm = (formData = form, getMaxPossibleCapacity = () => MAX_CAPACITY) => {
        const errors = {};
        if (!formData.name.trim()) {
            errors.name = 'Họ và tên không được để trống';
        } else if (!nameRegex.test(formData.name.trim())) {
            errors.name = 'Họ và tên chỉ được chứa chữ cái và khoảng trắng';
        }
        if (!formData.phone.trim()) {
            errors.phone = 'Số điện thoại không được để trống';
        } else if (!phoneRegex.test(formData.phone.trim())) {
            errors.phone = 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0';
        }
        const guestCount = Number(formData.guest_count);
        if (!guestCount || guestCount < 1) {
            errors.guest_count = 'Số lượng khách phải lớn hơn hoặc bằng 1';
        } else if (guestCount > getMaxPossibleCapacity()) {
            errors.guest_count = `Số lượng khách vượt quá sức chứa tối đa (${getMaxPossibleCapacity()})`;
        }
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };

    return {
        form,
        submitting,
        success,
        error,
        showSuccessModal,
        reservationId,

        isAuthenticated,
        handleInput,
        handleSlotChange,
        submitReservation,
        setError,
        setSuccess,
        setShowSuccessModal,
        setReservationId,

        // validate
        validateForm,
        validateField
    };
}; 