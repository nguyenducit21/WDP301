import React from 'react';
import OrderAssignmentNotification from '../components/OrderAssignmentNotification/OrderAssignmentNotification';
import './OrderAssignmentsPage.css';

const OrderAssignmentsPage = () => {
    return (
        <div className="order-assignments-page">
            <h2 className="page-title">Bàn đặt trước</h2>
            <OrderAssignmentNotification isPage />
        </div>
    );
};

export default OrderAssignmentsPage; 