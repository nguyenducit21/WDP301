import React, { useState, useEffect } from 'react';
import {
    FaShoppingCart, FaDollarSign, FaUsers, FaSync,
    FaCalendarDay, FaCalendarWeek, FaCalendarAlt, FaFilter, FaCrown
} from 'react-icons/fa';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import axios from '../../utils/axios.customize';
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
    const [filter, setFilter] = useState('today');
    const [loading, setLoading] = useState(true);

    // Ngày custom cho filter 'custom'
    const [customStartDate, setCustomStartDate] = useState(todayStr);
    const [customEndDate, setCustomEndDate] = useState(todayStr);

    // set lại date khi chuyển sang filter khác
    useEffect(() => {
        if (filter === 'today') {
            setCustomStartDate(todayStr);
            setCustomEndDate(todayStr);
        } else if (filter === 'year') {
            setCustomStartDate(yearStart);
            setCustomEndDate(yearEnd);
        } else if (filter === 'week') {
            const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
            setCustomStartDate(weekStart.toISOString().slice(0, 10));
            setCustomEndDate(todayStr);
        } else if (filter === 'month') {
            const monthStart = new Date(today); monthStart.setDate(today.getDate() - 29);
            setCustomStartDate(monthStart.toISOString().slice(0, 10));
            setCustomEndDate(todayStr);
        }
        // không tự fetchAllData vì useEffect phía dưới sẽ gọi khi filter hoặc custom date đổi
        // eslint-disable-next-line
    }, [filter]);

    useEffect(() => { fetchAllData(); }, [filter, customStartDate, customEndDate]);
    const getDateRangeByFilter = () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    switch (filter) {
        case 'today':
            return { startDate: todayStr, endDate: todayStr };

        case 'week': {
            const start = new Date(today);
            start.setDate(today.getDate() - 6);
            return {
                startDate: start.toISOString().slice(0, 10),
                endDate: todayStr
            };
        }

        case 'month': {
            const start = new Date(today);
            start.setDate(today.getDate() - 29);
            return {
                startDate: start.toISOString().slice(0, 10),
                endDate: todayStr
            };
        }

        case 'year': {
            const start = new Date(today.getFullYear(), 0, 1);
            const end = new Date(today.getFullYear(), 11, 31);
            return {
                startDate: start.toISOString().slice(0, 10),
                endDate: end.toISOString().slice(0, 10)
            };
        }

        case 'custom':
            return { startDate: customStartDate, endDate: customEndDate };

        default:
            return { startDate: todayStr, endDate: todayStr };
    }
};
    const fetchAllData = async () => {
        setLoading(true);
        try {
            let params = { period: filter };
            if (filter === 'custom' || filter === 'year' || filter === 'week' || filter === 'month') {
                params.startDate = customStartDate;
                params.endDate = customEndDate;
            }
            if (filter === 'today') { params.startDate = todayStr; params.endDate = todayStr; }

            // KPI & Chart
            const statsRes = await axios.get('/dashboard/admin-stats', { params });
            if (statsRes.data.success) {
                setKpi({
                    orders: statsRes.data.data.totalInvoices,
                    revenue: statsRes.data.data.totalRevenue,
                    customers: statsRes.data.data.newCustomers
                });
                setMainChart(
                    statsRes.data.data.chartData.map(d => ({
                        ...d,
                        LoiNhuan: Math.round((d.revenue || 0) * 0.28)
                    }))
                );
            }

            // Top Employees
            const empRes = await axios.get('/dashboard/admin-employee-performance', { params });
            setTopEmployees(empRes.data.success ? empRes.data.data : []);

            // Top Products
            const prodRes = await axios.get('/dashboard/admin-top-products', { params: { ...params, limit: 5 } });
            setTopProducts(prodRes.data.success ? prodRes.data.data : []);

        } catch (err) {
            setKpi({ orders: 0, revenue: 0, customers: 0 });
            setMainChart([]);
            setTopEmployees([]);
            setTopProducts([]);
        }
        setLoading(false);
    };

    const formatCurrency = n => n ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n) : '0 đ';
    const formatNumber = n => n ? new Intl.NumberFormat().format(n) : '0';

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1>Dashboard</h1>
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
                    <div className="custom-date-picker" style={{marginTop: 10}}>
                        <label>Từ:</label>
                        <input type="date" value={customStartDate} max={customEndDate} onChange={e => setCustomStartDate(e.target.value)} />
                        <label>Đến:</label>
                        <input type="date" value={customEndDate} min={customStartDate} onChange={e => setCustomEndDate(e.target.value)} />
                    </div>
                )}
                {filter === 'year' && (
                    <div className="custom-date-picker" style={{marginTop: 10}}>
                        <label>Từ:</label>
                        <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                        <label>Đến:</label>
                        <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                    </div>
                )}
                {filter === 'week' && (
                    <div className="custom-date-picker" style={{marginTop: 10}}>
                        <label>Từ:</label>
                        <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                        <label>Đến:</label>
                        <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                    </div>
                )}
                {filter === 'month' && (
                    <div className="custom-date-picker" style={{marginTop: 10}}>
                        <label>Từ:</label>
                        <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                        <label>Đến:</label>
                        <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                    </div>
                )}
            </div>

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
