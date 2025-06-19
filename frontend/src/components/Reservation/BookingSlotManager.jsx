import { useState, useEffect, useCallback } from 'react';
import customFetch from '../../utils/axios.customize';

// Default time slots configuration
const DEFAULT_SLOTS = [
    { id: 1, start_time: "06:00", end_time: "07:00" },
    { id: 2, start_time: "07:00", end_time: "08:00" },
    { id: 3, start_time: "08:00", end_time: "09:00" },
    { id: 4, start_time: "09:00", end_time: "10:00" },
    { id: 5, start_time: "10:00", end_time: "11:00" },
    { id: 6, start_time: "11:00", end_time: "12:00" },
    { id: 7, start_time: "12:00", end_time: "13:00" },
    { id: 8, start_time: "13:00", end_time: "14:00" },
    { id: 9, start_time: "14:00", end_time: "15:00" },
    { id: 10, start_time: "15:00", end_time: "16:00" },
    { id: 11, start_time: "16:00", end_time: "17:00" },
    { id: 12, start_time: "17:00", end_time: "18:00" },
    { id: 13, start_time: "18:00", end_time: "19:00" },
    { id: 14, start_time: "19:00", end_time: "20:00" },
    { id: 15, start_time: "20:00", end_time: "21:00" },
    { id: 16, start_time: "21:00", end_time: "22:00" }
];

export function useBookingSlots() {
    const [slots, setSlots] = useState(DEFAULT_SLOTS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSlots = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await customFetch.get('/booking-slots');
                if (response?.data?.success && Array.isArray(response.data.data)) {
                    setSlots(response.data.data);
                }
            } catch (err) {
                console.error('Error fetching booking slots:', err);
                setError(err?.response?.data?.message || 'Could not fetch booking slots');
                // Fallback to default slots if API fails
                setSlots(DEFAULT_SLOTS);
            } finally {
                setLoading(false);
            }
        };

        fetchSlots();
    }, []);

    const getSlotIdFromTime = useCallback((time) => {
        const slot = slots.find(s => s.start_time === time);
        return slot ? slot.id : null;
    }, [slots]);

    const getTimeFromSlotId = useCallback((slotId) => {
        const slot = slots.find(s => s.id === slotId);
        return slot ? slot.start_time : null;
    }, [slots]);

    const getAvailableTimeSlots = useCallback(() => {
        return slots.map(slot => slot.start_time);
    }, [slots]);

    return {
        slots,
        loading,
        error,
        getSlotIdFromTime,
        getTimeFromSlotId,
        getAvailableTimeSlots
    };
}