import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUtensils, 
  FaChartLine, 
  FaEye, 
  FaEdit, 
  FaPlus,
  FaArrowUp,
  FaArrowDown,
  FaFilter,
  FaSync
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from '../../../utils/axios.customize';
import './MenuDashboard.css';

const MenuDashboard = () => {
  const [analytics, setAnalytics] = useState({
    totalMenuItems: 0,
    availableItems: 0,
    featuredItems: 0,
    categoryStats: [],
    priceRangeStats: [],
    recentItems: []
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMenuAnalytics();
  }, []);

  const fetchMenuAnalytics = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching menu analytics...');

      // ✅ Gọi API thật từ backend
      const [menuRes, categoriesRes] = await Promise.all([
        axios.get('/menu-items', { withCredentials: true }),
        axios.get('/categories', { withCredentials: true })
      ]);

      console.log('📊 Menu API response:', menuRes.data);
      console.log('📂 Categories API response:', categoriesRes.data);

      // ✅ Xử lý dữ liệu từ API response
      const menuItems = menuRes.data?.data || menuRes.data || [];
      const categories = categoriesRes.data?.data || categoriesRes.data || [];

      console.log('✅ Processed data:', { 
        menuItems: menuItems.length, 
        categories: categories.length 
      });

      // ✅ Tính toán thống kê với dữ liệu thật
      const totalMenuItems = menuItems.length;
      const availableItems = menuItems.filter(item => item.is_available === true).length;
      const featuredItems = menuItems.filter(item => item.is_featured === true).length;

      // ✅ Thống kê theo danh mục
      const categoryStats = categories.map(category => {
        const categoryItems = menuItems.filter(item => {
          const itemCategoryId = item.category_id?._id || item.category_id;
          return itemCategoryId?.toString() === category._id?.toString();
        });
        
        return {
          name: category.name,
          count: categoryItems.length,
          available: categoryItems.filter(item => item.is_available === true).length,
          avgPrice: categoryItems.length > 0 
            ? categoryItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0) / categoryItems.length 
            : 0
        };
      });

      // ✅ Thống kê theo khoảng giá
      const priceRanges = [
        { label: 'Dưới 50k', min: 0, max: 50000 },
        { label: '50k - 100k', min: 50000, max: 100000 },
        { label: '100k - 200k', min: 100000, max: 200000 },
        { label: 'Trên 200k', min: 200000, max: Infinity }
      ];

      const priceRangeStats = priceRanges.map(range => ({
        ...range,
        count: menuItems.filter(item => {
          const price = Number(item.price) || 0;
          return price >= range.min && price < range.max;
        }).length
      }));

      // ✅ Món ăn gần đây (5 món mới nhất)
      const recentItems = menuItems
        .sort((a, b) => {
          const dateA = new Date(a.created_at || a.createdAt || 0);
          const dateB = new Date(b.created_at || b.createdAt || 0);
          return dateB - dateA;
        })
        .slice(0, 5);

      console.log('📈 Analytics calculated:', {
        totalMenuItems,
        availableItems,
        featuredItems,
        categoryStats: categoryStats.length,
        priceRangeStats: priceRangeStats.length,
        recentItems: recentItems.length
      });

      setAnalytics({
        totalMenuItems,
        availableItems,
        featuredItems,
        categoryStats,
        priceRangeStats,
        recentItems
      });

    } catch (error) {
      console.error('❌ Fetch analytics error:', error);
      
      // ✅ Xử lý lỗi cụ thể
      if (error.response?.status === 401) {
        toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        navigate('/login');
      } else if (error.response?.status === 404) {
        toast.error('API endpoint không tồn tại. Kiểm tra backend.');
      } else {
        toast.error(`Lỗi khi tải dữ liệu: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath || imagePath === 'default.jpg') return '/default-food.png';
    if (imagePath.startsWith('http')) return imagePath;
    return `/uploads/${imagePath}`;
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return '0 VND';
    return new Intl.NumberFormat('vi-VN').format(price) + ' VND';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  return (
    <div className="menu-dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">📊 Dashboard Quản Lý Menu</h1>
          <p className="dashboard-subtitle">
            Tổng quan về menu nhà hàng và phân tích hiệu suất
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={fetchMenuAnalytics}
            disabled={loading}
          >
            <FaSync /> {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/chef/products')}
          >
            <FaUtensils /> Quản lý Menu
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu dashboard...</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">
                <FaUtensils />
              </div>
              <div className="stat-content">
                <h3>{analytics.totalMenuItems}</h3>
                <p>Tổng món ăn</p>
              </div>
            </div>

            <div className="stat-card success">
              <div className="stat-icon">
                <FaArrowUp />
              </div>
              <div className="stat-content">
                <h3>{analytics.availableItems}</h3>
                <p>Món có sẵn</p>
                <small>
                  {analytics.totalMenuItems > 0 
                    ? `${((analytics.availableItems / analytics.totalMenuItems) * 100).toFixed(1)}% tổng menu`
                    : '0% tổng menu'
                  }
                </small>
              </div>
            </div>

            <div className="stat-card warning">
              <div className="stat-icon">
                <FaChartLine />
              </div>
              <div className="stat-content">
                <h3>{analytics.featuredItems}</h3>
                <p>Món nổi bật</p>
                <small>
                  {analytics.totalMenuItems > 0 
                    ? `${((analytics.featuredItems / analytics.totalMenuItems) * 100).toFixed(1)}% được đề xuất`
                    : '0% được đề xuất'
                  }
                </small>
              </div>
            </div>

            <div className="stat-card info">
              <div className="stat-icon">
                <FaArrowDown />
              </div>
              <div className="stat-content">
                <h3>{analytics.totalMenuItems - analytics.availableItems}</h3>
                <p>Món hết hàng</p>
                <small>Cần bổ sung nguyên liệu</small>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-section">
            {/* Category Stats */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>📈 Thống kê theo danh mục</h3>
                <p>Phân bố món ăn theo từng danh mục</p>
              </div>
              <div className="category-stats">
                {analytics.categoryStats.length === 0 ? (
                  <div className="no-data">
                    <p>Chưa có dữ liệu danh mục</p>
                    <button 
                      className="btn btn-outline"
                      onClick={() => navigate('/chef/manage-categories')}
                    >
                      Thêm danh mục
                    </button>
                  </div>
                ) : (
                  analytics.categoryStats.map((category, index) => (
                    <div key={index} className="category-item">
                      <div className="category-info">
                        <h4>{category.name}</h4>
                        <div className="category-metrics">
                          <span className="metric">
                            <strong>{category.count}</strong> món
                          </span>
                          <span className="metric available">
                            <strong>{category.available}</strong> có sẵn
                          </span>
                          <span className="metric price">
                            TB: <strong>{formatPrice(category.avgPrice)}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="category-progress">
                        <div 
                          className="progress-bar"
                          style={{ 
                            width: analytics.totalMenuItems > 0 
                              ? `${(category.count / analytics.totalMenuItems) * 100}%` 
                              : '0%'
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Price Range Stats */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>💰 Phân bố theo giá</h3>
                <p>Số lượng món ăn trong từng khoảng giá</p>
              </div>
              <div className="price-stats">
                {analytics.priceRangeStats.map((range, index) => (
                  <div key={index} className="price-item">
                    <div className="price-label">{range.label}</div>
                    <div className="price-bar">
                      <div 
                        className="bar-fill"
                        style={{ 
                          width: analytics.totalMenuItems > 0 
                            ? `${(range.count / analytics.totalMenuItems) * 100}%` 
                            : '0%'
                        }}
                      ></div>
                    </div>
                    <div className="price-count">{range.count} món</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Items */}
          <div className="recent-section">
            <div className="section-header">
              <h3>🆕 Món ăn mới nhất</h3>
              <button 
                className="btn btn-outline"
                onClick={() => navigate('/chef/products')}
              >
                Xem tất cả
              </button>
            </div>
            
            {analytics.recentItems.length === 0 ? (
              <div className="empty-state">
                <FaUtensils size={48} />
                <h3>Chưa có món ăn nào</h3>
                <p>Hãy thêm món ăn đầu tiên cho menu của bạn</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/chef/products')}
                >
                  <FaPlus /> Thêm món ăn
                </button>
              </div>
            ) : (
              <div className="recent-items-grid">
                {analytics.recentItems.map((item, index) => (
                  <div key={item._id || index} className="recent-item-card">
                    <div className="item-image">
                      <img 
                        src={getImageUrl(item.image)} 
                        alt={item.name}
                        onError={(e) => {
                          e.target.src = '/default-food.png';
                        }}
                      />
                      {item.is_featured && (
                        <span className="featured-badge">⭐ Nổi bật</span>
                      )}
                    </div>
                    
                    <div className="item-content">
                      <h4 className="item-name">{item.name}</h4>
                      <p className="item-category">
                        {item.category_id?.name || 'Chưa phân loại'}
                      </p>
                      <div className="item-price">
                        {formatPrice(item.price)}
                      </div>
                      <div className="item-status">
                        <span className={`status-badge ${item.is_available ? 'available' : 'unavailable'}`}>
                          {item.is_available ? '✅ Có sẵn' : '❌ Hết hàng'}
                        </span>
                      </div>
                      <div className="item-date">
                        Tạo: {formatDate(item.created_at || item.createdAt)}
                      </div>
                    </div>

                    <div className="item-actions">
                      <button 
                        className="action-btn view-btn"
                        onClick={() => navigate(`/chef/products/${item._id}`)}
                        title="Xem chi tiết"
                      >
                        <FaEye />
                      </button>
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => navigate(`/chef/products?edit=${item._id}`)}
                        title="Chỉnh sửa"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <h3>⚡ Thao tác nhanh</h3>
            <div className="actions-grid">
              <button 
                className="action-card"
                onClick={() => navigate('/chef/products')}
              >
                <FaUtensils />
                <span>Quản lý món ăn</span>
              </button>
              <button 
                className="action-card"
                onClick={() => navigate('/chef/manage-categories')}
              >
                <FaChartLine />
                <span>Quản lý danh mục</span>
              </button>
              <button 
                className="action-card"
                onClick={() => navigate('/chef/deleted-menu-items')}
              >
                <  FaArrowDown/>
                <span>Món đã xóa</span>
              </button>
              <button 
                className="action-card"
                onClick={() => navigate('/chef/recipes')}
              >
                <FaEdit />
                <span>Công thức nấu ăn</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MenuDashboard;
