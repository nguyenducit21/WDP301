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
                        phone: user.phone || prevForm.phone,
                        
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
        setReservationId
    };
}; 