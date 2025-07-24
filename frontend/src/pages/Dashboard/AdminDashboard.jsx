import React, { useState, useEffect } from 'react';
import {
    FaShoppingCart, FaDollarSign, FaUsers, FaSync,
    FaCalendarDay, FaCalendarWeek, FaCalendarAlt, FaFilter, FaCrown, FaClock, FaTag
} from 'react-icons/fa';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import axios from '../../utils/axios.customize';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

const FILTERS = [
    { key: 'today', label: 'Hôm nay', icon: <FaCalendarDay /> },
    { key: 'week', label: '7 ngày', icon: <FaCalendarWeek /> },
    { key: 'month', label: '30 ngày', icon: <FaCalendarAlt /> },
    { key: 'year', label: 'Năm', icon: <FaFilter /> },
    { key: 'custom', label: 'Tùy chọn', icon: <FaFilter /> }
];

const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

function AdminDashboard() {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yearStart = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const yearEnd = new Date(today.getFullYear(), 11, 31).toISOString().slice(0, 10);

    const [kpi, setKpi] = useState({ orders: 0, revenue: 0, customers: 0 });
    const [mainChart, setMainChart] = useState([]);
    const [topEmployees, setTopEmployees] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [busiestSlot, setBusiestSlot] = useState(null);
    const [promotionStats, setPromotionStats] = useState({ total: 0, used: 0 });
    const [filter, setFilter] = useState('today');
    const [loading, setLoading] = useState(true);
    const [periodStart, setPeriodStart] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    const [customStartDate, setCustomStartDate] = useState(todayStr);
    const [customEndDate, setCustomEndDate] = useState(todayStr);

    useEffect(() => {
        switch (filter) {
            case 'today':
                setCustomStartDate(todayStr);
                setCustomEndDate(todayStr);
                break;
            case 'week': {
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - 6);
                setCustomStartDate(weekStart.toISOString().slice(0, 10));
                setCustomEndDate(todayStr);
                break;
            }
            case 'month': {
                const monthStart = new Date(today);
                monthStart.setDate(today.getDate() - 29);
                setCustomStartDate(monthStart.toISOString().slice(0, 10));
                setCustomEndDate(todayStr);
                break;
            }
            case 'year':
                setCustomStartDate(yearStart);
                setCustomEndDate(yearEnd);
                break;
            case 'custom':
                fetchAllData();
                break;
            default:
                break;
        }
    }, [filter]);

    useEffect(() => {
        fetchAllData();
    }, [customStartDate, customEndDate]);

    const fetchAllData = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const params = { period: filter, startDate: customStartDate, endDate: customEndDate };

            const apiCalls = [
                { name: 'admin-stats', call: axios.get('/dashboard/admin-stats', { params }) },
                { name: 'admin-employee-performance', call: axios.get('/dashboard/admin-employee-performance', { params }) },
                { name: 'admin-top-products', call: axios.get('/dashboard/admin-top-products', { params: { ...params, limit: 5 } }) },
                { name: 'admin-busiest-slot', call: axios.get('/dashboard/admin-busiest-slot', { params }) },
                { name: 'admin-promotion-stats', call: axios.get('/dashboard/admin-promotion-stats', { params }) }
            ];

            const results = await Promise.allSettled(apiCalls.map(api => api.call));

            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Error in ${apiCalls[index].name}:`, result.reason.response?.data || result.reason.message);
                    toast.error(`Lỗi khi lấy dữ liệu từ ${apiCalls[index].name}: ${result.reason.response?.data?.message || result.reason.message}`);
                    setErrorMessage(prev => prev ? `${prev}; ${apiCalls[index].name} failed` : `${apiCalls[index].name} failed`);
                }
            });

            const statsRes = results[0].status === 'fulfilled' && results[0].value.data;
            if (statsRes?.success) {
                setKpi({
                    orders: statsRes.data.totalInvoices,
                    revenue: statsRes.data.totalRevenue,
                    customers: statsRes.data.newCustomers
                });
                setMainChart(
                    statsRes.data.chartData.map(d => ({
                        ...d,
                        LoiNhuan: Math.round((d.revenue || 0) * 0.28)
                    }))
                );
                setPeriodStart(new Date(statsRes.data.period?.from));
            }

            const empRes = results[1].status === 'fulfilled' && results[1].value.data;
            setTopEmployees(empRes?.success ? empRes.data : []);

            const prodRes = results[2].status === 'fulfilled' && results[2].value.data;
            setTopProducts(prodRes?.success ? prodRes.data : []);

            const slotRes = results[3].status === 'fulfilled' && results[3].value.data;
            setBusiestSlot(slotRes?.success ? slotRes.data : null);

            const promoRes = results[4].status === 'fulfilled' && results[4].value.data;
            setPromotionStats(promoRes?.success ? promoRes.data : { total: 0, used: 0 });

        } catch (err) {
            console.error('fetchAllData error:', err);
            toast.error('Lỗi khi tải dữ liệu dashboard. Vui lòng thử lại.');
            setErrorMessage('Lỗi tổng quát khi tải dữ liệu');
        }
        setLoading(false);
    };

    const formatCurrency = n => n ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n) : '0 đ';
    const formatNumber = n => n ? new Intl.NumberFormat().format(n) : '0';

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1>Dashboard Quản trị</h1>
                <div className="filter-buttons">
                    {FILTERS.map(f =>
                        <button
                            key={f.key}
                            className={filter === f.key ? 'active' : ''}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.icon} {f.label}
                        </button>
                    )}
                    <button title="Làm mới" onClick={fetchAllData}><FaSync /></button>
                </div>
                {filter === 'custom' && (
                    <div className="custom-date-picker" style={{ marginTop: 10 }}>
                        <label>Từ:</label>
                        <input type="date" value={customStartDate} max={customEndDate} onChange={e => setCustomStartDate(e.target.value)} />
                        <label>Đến:</label>
                        <input type="date" value={customEndDate} min={customStartDate} onChange={e => setCustomEndDate(e.target.value)} />
                    </div>
                )}
            </div>

            {errorMessage && (
                <div className="error-message" style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>
                    Lỗi: {errorMessage}
                </div>
            )}

            <div className="kpi-cards">
                <div className="card">
                    <div className="card-icon blue"><FaShoppingCart /></div>
                    <div className="card-content">
                        <span className="card-title">Hóa đơn</span>
                        <span className="card-value">{formatNumber(kpi.orders)}</span>
                    </div>
                </div>
                <div className="card">
                    <div className="card-icon green"><FaDollarSign /></div>
                    <div className="card-content">
                        <span className="card-title">Doanh thu</span>
                        <span className="card-value">{formatCurrency(kpi.revenue)}</span>
                    </div>
                </div>
                <div className="card">
                    <div className="card-icon orange"><FaUsers /></div>
                    <div className="card-content">
                        <span className="card-title">Khách hàng mới</span>
                        <span className="card-value">{formatNumber(kpi.customers)}</span>
                    </div>
                </div>
                <div className="card">
                    <div className="card-icon purple"><FaClock /></div>
                    <div className="card-content">
                        <span className="card-title">Khung giờ đông nhất</span>
                        <span className="card-value">
                            {busiestSlot ? `${busiestSlot.start_time} - ${busiestSlot.end_time} (${formatNumber(busiestSlot.reservations)} đặt bàn)` : 'Chưa có dữ liệu'}
                        </span>
                    </div>
                </div>
                <div className="card">
                    <div className="card-icon teal"><FaTag /></div>
                    <div className="card-content">
                        <span className="card-title">Mã giảm giá</span>
                        <span className="card-value">
                            {formatNumber(promotionStats.total)} mã / {formatNumber(promotionStats.used)} lượt dùng
                        </span>
                        <span className="card-change neutral">
                            Tỷ lệ sử dụng: {promotionStats.total > 0 ? ((promotionStats.used / promotionStats.total) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="main-chart-container">
                <h3>Thống kê Doanh thu & Lợi nhuận ({FILTERS.find(f => f.key === filter)?.label})</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={mainChart} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={value => formatCurrency(value)} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={value => formatCurrency(value)} />
                        <Legend />
                        <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} name="Doanh thu" />
                        <Area type="monotone" dataKey="LoiNhuan" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} name="Lợi nhuận" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="section-container employee-performance-section">
                <div className="table-container">
                    <h3>Nhân viên xuất sắc nhất</h3>
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Nhân viên</th>
                                <th>Doanh thu cá nhân</th>
                                <th>Số đơn hoàn thành</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topEmployees.map(emp => (
                                <tr key={emp.staffId}>
                                    <td>{emp.staffName}</td>
                                    <td>{formatCurrency(emp.revenue)}</td>
                                    <td>{formatNumber(emp.orders)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="chart-container">
                    <h3>Top 5 Nhân viên theo Doanh thu</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topEmployees.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="staffName" width={110} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={value => formatCurrency(value)} />
                            <Bar dataKey="revenue" fill="#8884d8" barSize={20}>
                                {topEmployees.slice(0, 5).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="section-container">
                <div className="table-container">
                    <h3>Sản phẩm bán chạy nhất</h3>
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Tên</th>
                                <th>Danh mục</th>
                                <th>Giá</th>
                                <th>Số lượng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topProducts.map((p, idx) => (
                                <tr key={p.id || p._id}>
                                    <td>{idx + 1}{idx === 0 && <FaCrown className="crown-icon" />}</td>
                                    <td>{p.name}</td>
                                    <td>{p.category}</td>
                                    <td>{formatCurrency(p.price)}</td>
                                    <td>{formatNumber(p.quantitySold)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="chart-container">
                    <h3>Top 5 mặt hàng bán chạy</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={topProducts}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                innerRadius={60}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="quantitySold"
                                nameKey="name"
                            >
                                {topProducts.map((entry, i) => (
                                    <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} lượt bán`} />
                            <Legend iconSize={10} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {loading && <div className="admin-dashboard-loading">Đang tải dữ liệu...</div>}
        </div>
    );
}

export default AdminDashboard;