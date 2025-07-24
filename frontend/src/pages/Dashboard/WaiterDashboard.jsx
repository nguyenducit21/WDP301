import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaTable, FaClipboardList, FaMoneyBillWave, FaCalendarAlt,
    FaReceipt, FaSync, FaFilter, FaCalendarDay, FaCalendarWeek
} from 'react-icons/fa';
import axios from '../../utils/axios.customize';
import './WaiterDashboard.css';

const WaiterDashboard = () => {
    const navigate = useNavigate();
    const [servingTables, setServingTables] = useState([]);
    const [stats, setStats] = useState({
        servingNowCount: 0,
        completedOrders: 0,
        personalRevenue: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filter, setFilter] = useState({
        period: 'today',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchAllData();
    }, [filter]);

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([
                fetchWaiterStats(),
                fetchServingTables()
            ]);
        } catch (err) {
            setError('Lỗi khi tải dữ liệu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchWaiterStats = async () => {
        try {
            const response = await axios.get('/dashboard/waiter', { params: filter });
            if (response.data.success) {
                setStats(response.data.data);
            } else {
                setError('API error: ' + response.data.message);
            }
        } catch (error) {
            setError('Không thể tải dữ liệu: ' + error.message);
        }
    };

    const fetchServingTables = async () => {
        try {
            const response = await axios.get('/dashboard/waiter/my-tables');
            if (response.data.success) {
                setServingTables(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching serving tables:', error);
        }
    };

    const handleRefresh = () => fetchAllData();
    const handlePeriodChange = (period) => {
        const today = new Date();
        let startDate = new Date(), endDate = new Date();
        switch (period) {
            case 'week': startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000); break;
            case 'month': startDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
            default: break;
        }
        setFilter(prev => ({
            ...prev, period,
            ...(period !== 'custom' && {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            })
        }));
    };
    const handleFilterChange = (key, value) => setFilter(prev => ({ ...prev, [key]: value }));
    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    const getPeriodLabel = (period) => ({ today: 'Hôm nay', week: '7 ngày qua', month: 'Tháng này', custom: 'Tùy chỉnh' }[period] || period);

    if (loading) {
        return <div className="waiter-dashboard"><div className="loading-spinner"><div className="spinner"></div><p>Đang tải dữ liệu...</p></div></div>;
    }

    return (
        <div className="waiter-dashboard">
            <div className="dashboard-header">
                <div className="header-content"><h1>Dashboard Phục Vụ</h1><p>Công việc và hiệu suất cá nhân của bạn</p></div>
                <div className="dashboard-controls"><button onClick={handleRefresh} disabled={loading} className="refresh-btn"><FaSync className={loading ? 'fa-spin' : ''} />{loading ? 'Đang tải...' : 'Làm mới'}</button>{error && <div className="error-message">{error}</div>}</div>
            </div>

            <div className="stats-section">
                <div className="section-header"><h2>Thống kê hiệu suất</h2>
                    <div className="dashboard-filters">
                        <div className="quick-filters">
                            {['today', 'week', 'month', 'custom'].map(period => (
                                <button key={period} className={`filter-btn ${filter.period === period ? 'active' : ''}`} onClick={() => handlePeriodChange(period)}>
                                    {period === 'today' && <FaCalendarDay />}
                                    {period === 'week' && <FaCalendarWeek />}
                                    {period === 'month' && <FaCalendarAlt />}
                                    {period === 'custom' && <FaFilter />}
                                    {getPeriodLabel(period)}
                                </button>
                            ))}
                        </div>
                        {filter.period === 'custom' && (
                            <div className="custom-date-range"><input type="date" value={filter.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} /><span>đến</span><input type="date" value={filter.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} /></div>
                        )}
                    </div>
                </div>
                <div className="waiter-stats-grid">
                    <div className="waiter-stat-card tables"><div className="stat-icon"><FaTable /></div><div className="stat-content"><h3>Đang Phục Vụ</h3><p className="stat-number">{stats.servingNowCount}</p><span className="stat-detail">bàn</span></div></div>
                    <div className="waiter-stat-card orders"><div className="stat-icon"><FaClipboardList /></div><div className="stat-content"><h3>Đơn Hoàn Thành</h3><p className="stat-number">{stats.completedOrders}</p><span className="stat-detail">trong {getPeriodLabel(filter.period).toLowerCase()}</span></div></div>
                </div>
            </div>

            <div className="waiter-content-grid single-column">
                <div className="my-tables">
                    <h2>Bàn Đang Phục Vụ ({servingTables.length})</h2>
                    <div className="tables-grid">
                        {servingTables.length > 0 ? servingTables.map(table => (
                            <div key={table.id} className="table-card occupied">
                                <div className="table-header"><h3>{table.name}</h3><span className="table-status warning">Có khách</span></div>
                                <div className="table-details">
                                    <p>👥 {table.customers} khách</p>
                                    <p>🕐 Khung giờ: {table.orderTime}</p>
                                    {table.currentOrderValue > 0 && (<p>💰 Tạm tính: {formatCurrency(table.currentOrderValue)}</p>)}
                                </div>
                                <div className="table-actions">
                                    <button className="action-btn bill" onClick={() => navigate(`/reservations/${table.reservationId}`)}>
                                        <FaReceipt /> Chi tiết & Thanh toán
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <p className="no-data">Chưa có bàn nào đang phục vụ.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WaiterDashboard;
