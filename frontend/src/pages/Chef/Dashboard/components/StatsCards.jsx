import React from 'react';
import { FaMoneyBillWave, FaUtensils, FaShoppingCart, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const StatsCards = ({ stats, loading }) => {
  const formatCurrency = (amount) => {
    if (amount === 0) return '0 VND';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  };

  const statsConfig = [
    {
      title: 'Tổng doanh thu',
      value: formatCurrency(stats.totalRevenue),
      icon: FaMoneyBillWave,
      color: 'primary',
      change: stats.growth > 0 ? `+${stats.growth}%` : `${stats.growth}%`,
      changeType: stats.growth > 0 ? 'positive' : 'negative'
    },
    {
      title: 'Tổng món ăn',
      value: stats.totalDishes,
      icon: FaUtensils,
      color: 'success',
      change: 'Trong menu',
      changeType: 'neutral'
    },
    {
      title: 'Món có sẵn',
      value: stats.totalOrders,
      icon: FaShoppingCart,
      color: 'warning',
      change: 'Đang phục vụ',
      changeType: 'positive'
    },
    {
      title: 'Tăng trưởng',
      value: stats.growth > 0 ? `+${stats.growth}%` : `${stats.growth}%`,
      icon: stats.growth > 0 ? FaArrowUp : FaArrowDown,
      color: stats.growth > 0 ? 'success' : 'danger',
      change: 'So với kỳ trước',
      changeType: 'neutral'
    }
  ];

  if (loading) {
    return (
      <div className="stats-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card loading">
            <div className="stat-skeleton"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="stats-grid">
      {statsConfig.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index} className={`stat-card ${stat.color}`}>
            <div className="stat-icon">
              <IconComponent />
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{stat.value}</h3>
              <p className="stat-title">{stat.title}</p>
              <div className={`stat-change ${stat.changeType}`}>
                {stat.change}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
