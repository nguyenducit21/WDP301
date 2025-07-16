import React from 'react'
import { useNavigate } from 'react-router-dom';

const Header = ({ pageName, activeTab }) => {
    const navigate = useNavigate();
    return (
        <>
            <h1>{pageName}</h1>
            <div className="tab-navigation">
                <button
                    className={`tab-button ${activeTab === 'areas' ? 'active' : ''}`}
                    onClick={() => navigate('/manager/areas')}
                >
                    Quản lý khu vực
                </button>
                <button
                    className={`tab-button ${activeTab === 'tables' ? 'active' : ''}`}
                    onClick={() => navigate('/manager/tables')}
                >
                    Sơ đồ bàn
                </button>
                <button
                    className={`tab-button ${activeTab === 'reservations' ? 'active' : ''}`}
                    onClick={() => navigate('/manager/reservations')}
                >
                    Danh sách đặt bàn
                </button>
            </div>
        </>
    )
}

export default Header