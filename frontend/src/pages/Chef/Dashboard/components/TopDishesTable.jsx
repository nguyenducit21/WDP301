import React from 'react';

const TopDishesTable = ({ data, loading }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  };

  if (loading) {
    return (
      <div className="table-loading">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="table-skeleton"></div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-empty">
        <p>Không có dữ liệu món ăn</p>
      </div>
    );
  }

  return (
    <div className="top-dishes-table">
      <div className="table-header">
        <div className="header-cell">Hạng</div>
        <div className="header-cell">Tên món</div>
        <div className="header-cell">Danh mục</div>
        <div className="header-cell">Số lượng</div>
        <div className="header-cell">Doanh thu</div>
      </div>
      
      <div className="table-body">
        {data.map((dish, index) => (
          <div key={index} className="table-row">
            <div className="table-cell rank">
              <span className={`rank-badge rank-${index + 1}`}>
                {index + 1}
              </span>
            </div>
            <div className="table-cell dish-name">
              <strong>{dish.name}</strong>
            </div>
            <div className="table-cell category">
              {dish.category}
            </div>
            <div className="table-cell quantity">
              {dish.quantity} suất
            </div>
            <div className="table-cell revenue">
              {formatCurrency(dish.revenue)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopDishesTable;
