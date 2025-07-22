import React, { useState, useEffect } from 'react';
import { FaShoppingCart, FaDollarSign, FaUserPlus, FaSync, FaFilter, FaCalendarDay, FaCalendarWeek, FaCalendarAlt, FaCrown } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from '../../utils/axios.customize'; // Đảm bảo bạn có file config axios
import './AdminDashboard.css';

const AdminDashboard = () => {
    // States cho từng phần của dashboard
    const [stats, setStats] = useState({ totalRevenue: 0, totalInvoices: 0, newCustomers: 0 });
    const [chartData, setChartData] = useState([]);
    const [employeePerformance, setEmployeePerformance] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    
    // States cho từng bộ lọc
    const [mainFilter, setMainFilter] = useState({ period: 'today', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] });
    const [employeeFilter, setEmployeeFilter] = useState({ period: 'today', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] });
    const [productFilter, setProductFilter] = useState({ period: 'today', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] });

    const [loading, setLoading] = useState(true);

    // useEffect hooks để fetch dữ liệu khi filter thay đổi
    useEffect(() => { fetchStatsAndChart(); }, [mainFilter]);
    useEffect(() => { fetchEmployeePerformance(); }, [employeeFilter]);
    useEffect(() => { fetchTopProducts(); }, [productFilter]);

    // Các hàm fetch dữ liệu
    const fetchStatsAndChart = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/dashboard/admin-stats', { params: mainFilter });
            if (response.data.success) {
                const { totalRevenue, totalInvoices, newCustomers, chartData } = response.data.data;
                setStats({ totalRevenue, totalInvoices, newCustomers });
                setChartData(chartData);
            }
        } catch (error) { console.error("Error fetching stats:", error); } 
        finally { setLoading(false); }
    };

    const fetchEmployeePerformance = async () => {
        try {
            const response = await axios.get('/dashboard/employee-performance', { params: employeeFilter });
            setEmployeePerformance(response.data.success ? response.data.data : []);
        } catch (error) { console.error("Error fetching employee performance:", error); }
    };

    const fetchTopProducts = async () => {
        try {
            const response = await axios.get('/dashboard/top-products', { params: productFilter });
            setTopProducts(response.data.success ? response.data.data : []);
        } catch (error) { console.error("Error fetching top products:", error); }
    };
    
    const handleFilterChange = (filterSetter, period) => {
        const today = new Date();
        let startDate = new Date();
        let endDate = new Date();
        
        switch (period) {
            case 'week': startDate.setDate(today.getDate() - 6); break;
            case 'month': startDate.setMonth(today.getMonth() - 1); break;
            case 'year': startDate.setFullYear(today.getFullYear() - 1); break;
            default: startDate = today;
        }
        
        filterSetter({ period, startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] });
    };

    // Component Filter UI
    const FilterControls = ({ filter, onFilterChange, setFilterState }) => (
        <div className="dashboard-filters">
            {['today', 'week', 'month', 'year'].map(p => (
                <button key={p} className={`filter-btn ${filter.period === p ? 'active' : ''}`} onClick={() => onFilterChange(setFilterState, p)}>
                    {p === 'today' && <FaCalendarDay />} {p === 'week' && <FaCalendarWeek />} {p === 'month' && <FaCalendarAlt />} {p === 'year' && <FaFilter />}
                    {p === 'today' ? 'Hôm nay' : p === 'week' ? '7 ngày' : p === 'month' ? '30 ngày' : '1 năm'}
                </button>
            ))}
            {/* Có thể thêm Custom Date Range Picker ở đây */}
        </div>
    );
    
    const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

    return (
        <div className="manager-dashboard">
            <div className="dashboard-header">
                <h1>Dashboard Tổng Quan</h1>
                <button onClick={() => { fetchStatsAndChart(); fetchEmployeePerformance(); fetchTopProducts(); }} className="refresh-btn"><FaSync /> Làm mới</button>
            </div>

            <div className="stats-section">
                <div className="section-header"><h2>Chỉ số kinh doanh</h2><FilterControls filter={mainFilter} onFilterChange={handleFilterChange} setFilterState={setMainFilter} /></div>
                <div className="manager-stats-grid">
                    <KPI_Card icon={<FaMoneyBillWave />} title="Tổng Doanh Thu" value={formatCurrency(stats.totalRevenue)} />
                    <KPI_Card icon={<FaClipboardCheck />} title="Tổng Hóa Đơn" value={stats.totalInvoices.toLocaleString('vi-VN')} />
                    <KPI_Card icon={<FaUserPlus />} title="Khách Hàng Mới" value={stats.newCustomers.toLocaleString('vi-VN')} />
                </div>
            </div>

            <div className="chart-section">
                <h2>Biểu đồ doanh thu</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis tickFormatter={(val) => `${val / 1000}k`} /><Tooltip formatter={formatCurrency} /><Legend /><Line type="monotone" dataKey="DoanhThu" name="Doanh thu" stroke="#8884d8" /></LineChart>
                </ResponsiveContainer>
            </div>

            <div className="performance-grid">
                <div className="performance-section">
                    <div className="section-header"><h2>Hiệu suất nhân viên</h2><FilterControls filter={employeeFilter} onFilterChange={handleFilterChange} setFilterState={setEmployeeFilter} /></div>
                    <div className="performance-list">
                        {employeePerformance.map((staff, index) => (
                            <div key={staff.staffId} className="performance-item">
                                <span className="rank">{index + 1}</span>
                                <span className="name">{staff.staffName}</span>
                                <span className="data revenue">{formatCurrency(staff.totalRevenue)}</span>
                                <span className="data orders">{staff.orderCount} đơn</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="performance-section">
                    <div className="section-header"><h2>Sản phẩm bán chạy</h2><FilterControls filter={productFilter} onFilterChange={handleFilterChange} setFilterState={setProductFilter} /></div>
                    <div className="performance-list">
                        {topProducts.map((product, index) => (
                            <div key={product.productId} className="performance-item">
                                <span className="rank">{index + 1}{index === 0 && <FaCrown className="crown-icon"/>}</span>
                                <span className="name">{product.productName}</span>
                                <span className="data quantity">{product.totalQuantity.toLocaleString('vi-VN')} lượt bán</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPI_Card = ({ icon, title, value }) => (
    <div className="manager-stat-card"><div className="stat-icon">{icon}</div><div className="stat-content"><h3>{title}</h3><p className="stat-number">{value}</p></div></div>
);

export default ManagerDashboard;
