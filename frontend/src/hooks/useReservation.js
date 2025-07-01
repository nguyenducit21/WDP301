import { useState, useEffect, useMemo } from 'react';
import customFetch from '../utils/axios.customize';

// Validation thời gian đặt bàn (Vietnam timezone)
function validateBookingTime(date, time, todayVietnam) {
    if (!date || !time) {
        console.log('Skipping validation - missing date or time');
        return null;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const [inputHour, inputMinute] = time.split(':').map(Number);

    console.log('=== VALIDATION DEBUG ===');
    console.log('Input date:', date);
    console.log('Input time:', time);
    console.log('Today Vietnam (passed):', todayVietnam);
    console.log('Local now:', now.toString());
    console.log('Current time:', currentHour + ':' + currentMinute);
    console.log('Input time:', inputHour + ':' + inputMinute);
    console.log('Date comparison (string):', date, 'vs', todayVietnam);
    console.log('Is past date (string)?', date < todayVietnam);
    console.log('Is same date (string)?', date === todayVietnam);

    const inputDate = new Date(date + 'T00:00:00');
    const todayDate = new Date(todayVietnam + 'T00:00:00');

    console.log('Input Date object:', inputDate);
    console.log('Today Date object:', todayDate);
    console.log('Input Date time:', inputDate.getTime());
    console.log('Today Date time:', todayDate.getTime());
    console.log('Is input date < today?', inputDate < todayDate);

    if (inputDate < todayDate) {
        console.log('REJECTED: Past date');
        console.log('========================');
        return "Không thể đặt bàn cho thời gian trong quá khứ";
    }

    if (inputDate.getTime() === todayDate.getTime()) {
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const inputTotalMinutes = inputHour * 60 + inputMinute;
        const minBookingMinutes = currentTotalMinutes + 60;

        console.log('Same day - checking time');
        console.log('Current total minutes:', currentTotalMinutes);
        console.log('Input total minutes:', inputTotalMinutes);
        console.log('Min booking minutes (now + 60):', minBookingMinutes);
        console.log('Is input time < min booking time?', inputTotalMinutes < minBookingMinutes);

        if (inputTotalMinutes < minBookingMinutes) {
            console.log('REJECTED: Too early');
            console.log('========================');
            return "Vui lòng đặt bàn trước ít nhất 1 giờ so với thời gian bắt đầu";
        }
    }

    console.log('VALIDATED: OK');
    console.log('========================');
    return null;
}

// Get today's date in Vietnam timezone
const getTodayVietnam = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayVietnam = `${year}-${month}-${day}`;

    console.log('=== getTodayVietnam() called ===');
    console.log('Local Time:', now.toString());
    console.log('Local Time ISO:', now.toISOString());
    console.log('Vietnam Date (Local):', todayVietnam);
    console.log('Current Hour:', now.getHours());
    console.log('Current Minute:', now.getMinutes());
    console.log('================================');

    return todayVietnam;
};

export const useReservation = () => {
    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        guest_count: 1,
        date: getTodayVietnam(),
        slot_id: ""
    });

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [validationError, setValidationError] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [reservationId, setReservationId] = useState(null);
    const [preOrderItems, setPreOrderItems] = useState([]);
    const [reservationNote, setReservationNote] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Ngày hôm nay (yyyy-mm-dd) - Vietnam timezone  
    const todayStr = useMemo(() => {
        const result = getTodayVietnam();
        console.log('todayStr memoized:', result);
        return result;
    }, []);

    // Check authentication status
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setIsAuthenticated(!!(user.user?.id || user.id || user._id));
            } catch (e) {
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
        setForm({
            name: "",
            phone: "",
            email: "",
            guest_count: 1,
            date: getTodayVietnam(),
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

        if (validationError) {
            setError(validationError);
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
        validationError,
        showSuccessModal,
        reservationId,
        preOrderItems,
        reservationNote,
        isAuthenticated,
        todayStr,
        handleInput,
        handleSlotChange,
        submitReservation,
        setError,
        setSuccess,
        setValidationError,
        setShowSuccessModal,
        setReservationId,
        setPreOrderItems,
        setReservationNote,
        validateBookingTime
    };
}; 