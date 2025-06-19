import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts";
import "./Dashboard.css";

const COLORS = ["#28a745", "#ffc107", "#dc3545"]; // Có sẵn, Hết hàng, Ngừng KD

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await axios.get("/dashboard/chef", { withCredentials: true });
        setStats(res.data);
      } catch (error) {
        setStats(null);
        console.error("Dashboard error:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const pieData = [
    { name: "Có sẵn", value: stats?.available || 0 },
    { name: "Hết hàng", value: stats?.outOfStock || 0 },
    { name: "Ngừng kinh doanh", value: stats?.stoppedItems || 0 },
  ];

  if (loading) return <div className="loading">Đang tải Dashboard...</div>;
  if (!stats) return <div className="loading">Không thể tải dữ liệu dashboard!</div>;

  return (
    <div className="chef-dashboard">
      <h2>Chef Dashboard</h2>
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{stats.totalItems}</span>
          <span className="stat-label">Tổng món ăn</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.available}</span>
          <span className="stat-label">Có sẵn</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.outOfStock}</span>
          <span className="stat-label">Hết hàng</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.stoppedItems}</span>
          <span className="stat-label">Ngừng kinh doanh</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalCategories}</span>
          <span className="stat-label">Danh mục</span>
        </div>
      </div>

      <div style={{ width: 540, margin: "0 auto", marginTop: 30 }}>
        <h4 style={{ textAlign: "center" }}>Tỉ lệ món ăn theo trạng thái</h4>
        <PieChart width={520} height={400}>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {pieData.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>


      <div className="dashboard-shortcut">
        <button onClick={() => window.location.href = "/chef/products"}>Quản lý món ăn</button>
        <button onClick={() => window.location.href = "/chef/manage-categories"}>Quản lý danh mục</button>
        <button onClick={() => window.location.href = "/chef/deleted-menu-items"}>Ngừng kinh doanh</button>
      </div>
      <div className="recent-items-section">
        <h3>Món vừa thêm gần đây</h3>
        <table className="recent-items-table">
          <thead>
            <tr>
              <th>Ảnh</th>
              <th>Tên món</th>
              <th>Danh mục</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {(stats.recentItems || []).map(item => (
              <tr key={item._id}>
                <td>
                  <img src={`/uploads/${item.image}`} alt={item.name} width={50} />
                </td>
                <td>{item.name}</td>
                <td>{item.category_id?.name}</td>
                <td>
                  <span className={item.is_available ? "status-active" : "status-inactive"}>
                    {item.is_available ? "Có sẵn" : "Hết hàng"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
