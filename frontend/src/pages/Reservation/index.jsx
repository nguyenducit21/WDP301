import React, { useState } from 'react'
import ReservationForm from '../../components/Reservation/ReservationForm';
import MyReservations from '../../components/Reservation/MyReservations';
import './ReservationPage.css';

const Reservation = () => {
  const [activeTab, setActiveTab] = useState('book'); // 'book', 'my-reservations', hoặc 'test'

  return (
    <div className="reservation-page">
      <div className="reservation-header">
        <h1>Đặt bàn nhà hàng</h1>
        <p>Chọn thời gian và bàn phù hợp cho bữa ăn của bạn</p>
      </div>

      <div className="reservation-tabs">
        <button
          className={`tab-btn ${activeTab === 'book' ? 'active' : ''}`}
          onClick={() => setActiveTab('book')}
        >
          🍽️ Đặt bàn mới
        </button>
        <button
          className={`tab-btn ${activeTab === 'my-reservations' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-reservations')}
        >
          📋 Bàn đã đặt của tôi
        </button>

      </div>

      <div className="reservation-content">
        {activeTab === 'book' ? (
          <ReservationForm />
        ) : activeTab === 'my-reservations' ? (
          <MyReservations />
        ) : null}
      </div>
    </div>
  )
}

export default Reservation;