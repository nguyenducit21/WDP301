// pages/Chef/Inventory/InventoryDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaHistory, 
  FaBox, 
  FaCalendarAlt,
  FaUser,
  FaDollarSign,
  FaTruck,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from '../../../utils/axios.customize';
import './InventoryDetail.css';

const InventoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchInventoryHistory();
  }, [id, currentPage]);

  const fetchInventoryHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/inventory/${id}/history?page=${currentPage}&limit=10`, {
        withCredentials: true
      });

      if (response.data.success) {
        setInventoryData(response.data.data);
      } else {
        toast.error('Không thể tải lịch sử nguyên liệu');
      }
    } catch (error) {
      console.error('Fetch inventory history error:', error);
      if (error.response?.status === 404) {
        toast.error('Không tìm thấy nguyên liệu');
        navigate('/chef/inventory-list');
      } else {
        toast.error('Lỗi khi tải lịch sử nguyên liệu');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  if (loading && !inventoryData) {
    return (
      <div className="inventory-detail-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!inventoryData) {
    return (
      <div className="inventory-detail-container">
        <div className="error-container">
          <h2>Không tìm thấy nguyên liệu</h2>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/chef/inventory-list')}
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const { inventory, history, pagination } = inventoryData;

  return (
    <div className="inventory-detail-container">
      {/* Header */}
      <div className="detail-header">
        <button 
          className="back-btn"
          onClick={() => navigate('/chef/inventory-list')}
        >
          <FaArrowLeft /> Quay lại
        </button>
        <h1>Chi Tiết Nguyên Liệu</h1>
      </div>

      {/* Inventory Info */}
      <div className="inventory-info-card">
        <div className="info-header">
          <div className="inventory-icon">
            <FaBox />
          </div>
          <div className="inventory-basic">
            <h2>{inventory.name}</h2>
            <div className="inventory-stats">
              <div className="stat-item">
                <span className="stat-label">Tồn kho hiện tại:</span>
                <span className="stat-value">{inventory.currentstock} {inventory.unit}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Tổng đã nhập:</span>
                <span className="stat-value">{inventory.total_imported} {inventory.unit}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import History */}
      <div className="history-section">
        <div className="section-header">
          <h3>
            <FaHistory /> Lịch Sử Nhập Hàng
          </h3>
          <span className="history-count">
            {pagination.totalRecords} lần nhập
          </span>
        </div>

        {history.length === 0 ? (
          <div className="empty-history">
            <FaHistory size={48} />
            <p>Chưa có lịch sử nhập hàng</p>
          </div>
        ) : (
          <>
            <div className="history-list">
              {history.map((item, index) => (
                <div key={item._id} className="history-item">
                  <div className="history-main">
                    <div className="history-info">
                      <div className="receipt-code">
                        <strong>{item.receipt_code}</strong>
                      </div>
                      <div className="import-details">
                        <div className="detail-row">
                          <FaCalendarAlt className="detail-icon" />
                          <span>{formatDate(item.import_date)}</span>
                        </div>
                        <div className="detail-row">
                          <FaTruck className="detail-icon" />
                          <span>{item.supplier}</span>
                        </div>
                        <div className="detail-row">
                          <FaUser className="detail-icon" />
                          <span>{item.staff_name}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="history-numbers">
                      <div className="quantity-info">
                        <div className="quantity-change">
                          +{item.quantity_imported} {inventory.unit}
                        </div>
                        <div className="quantity-flow">
                          {item.quantity_before} → {item.quantity_after}
                        </div>
                      </div>
                      
                      <div className="price-info">
                        <div className="unit-price">
                          {formatCurrency(item.unit_price)}/{inventory.unit}
                        </div>
                        <div className="total-cost">
                          Tổng: {formatCurrency(item.total_cost)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {item.reason && (
                    <div className="history-reason">
                      <small>{item.reason}</small>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                >
                  <FaChevronLeft /> Trước
                </button>
                
                <span className="page-info">
                  Trang {pagination.currentPage} / {pagination.totalPages}
                </span>
                
                <button
                  className="page-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNext}
                >
                  Sau <FaChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryDetail;
