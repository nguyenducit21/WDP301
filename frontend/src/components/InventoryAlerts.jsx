// components/InventoryAlerts.jsx
import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from '../utils/axios.customize';

const InventoryAlerts = () => {
    useEffect(() => {
        // Check alerts every 30 minutes
        const interval = setInterval(checkInventoryAlerts, 30 * 60 * 1000);
        
        // Check immediately on mount
        checkInventoryAlerts();
        
        return () => clearInterval(interval);
    }, []);

    const checkInventoryAlerts = async () => {
        try {
            const [lowStockRes, expiringRes] = await Promise.all([
                axios.get('/inventory/low-stock'),
                axios.get('/inventory/expiring')
            ]);
            
            if (lowStockRes.data.data.length > 0) {
                toast.warning(`${lowStockRes.data.data.length} nguyên liệu sắp hết!`);
            }
            
            if (expiringRes.data.data.length > 0) {
                toast.error(`${expiringRes.data.data.length} lô hàng sắp hết hạn!`);
            }
        } catch (error) {
            console.error('Error checking alerts:', error);
        }
    };

    return null; // Component chỉ để check alerts
};
