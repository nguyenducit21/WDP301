// pages/Chef/Inventory/StockCheck.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from '../../../utils/axios.customize';
import './StockCheck.css';

const StockCheck = () => {
  const [inventories, setInventories] = useState([]);
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInventories();
  }, []);

  const fetchInventories = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/inventory', { withCredentials: true });

      if (response.data.success) {
        const inventoriesData = response.data.data;
        setInventories(inventoriesData);

        // Initialize stock data with current stock
        const initialStockData = {};
        inventoriesData.forEach(inv => {
          initialStockData[inv._id] = {
            actual_stock: inv.currentstock,
            system_stock: inv.currentstock,
            difference: 0
          };
        });
        setStockData(initialStockData);
      }
    } catch (error) {
      toast.error('Không thể tải danh sách nguyên liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = (inventoryId, actualStock) => {
    let value = actualStock;
    if (value === '') {
      value = '';
    } else if (Number(value) < 0) {
      value = 0;
    }
    const systemStock = inventories.find(inv => inv._id === inventoryId)?.currentstock || 0;
    const difference = Number(value) - systemStock;

    setStockData(prev => ({
      ...prev,
      [inventoryId]: {
        actual_stock: value === '' ? '' : Number(value),
        system_stock: systemStock,
        difference: value === '' ? 0 : difference
      }
    }));
  };


  const handleSaveStockCheck = async (inventoryId) => {
    setSaving(true);
    try {
      const data = stockData[inventoryId];

      const response = await axios.patch(`/inventory/${inventoryId}/stock-check`, {
        actual_stock: data.actual_stock
      }, { withCredentials: true });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchInventories(); // Refresh data
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật kiểm kho');
    } finally {
      setSaving(false);
    }
  };

  const getDifferenceClass = (difference) => {
    if (difference > 0) return 'positive';
    if (difference < 0) return 'negative';
    return 'zero';
  };

  const getDifferenceText = (difference) => {
    if (difference > 0) return `+${difference}`;
    if (difference < 0) return `${difference}`;
    return '0';
  };

  const hasChanges = Object.values(stockData).some(data => data.difference !== 0);

  return (
    <div className="stock-check-container">
      {/* Header */}
      <div className="page-header">
        <button
          className="back-btn"
          onClick={() => navigate('/chef/inventory-list')}
        >
          <FaArrowLeft /> Quay lại
        </button>
        <div className="header-content">
          <h1 className="page-title">📋 Kiểm Kho Nguyên Liệu</h1>
          <p className="page-subtitle">Cập nhật số liệu thực tế và so sánh với hệ thống</p>
        </div>
      </div>

      {hasChanges && (
        <div className="alert alert-info">
          <FaExclamationTriangle />
          <strong>Có thay đổi:</strong> Nhấn "Lưu" để cập nhật từng nguyên liệu có chênh lệch.
        </div>
      )}

      {/* Stock Check Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <table className="stock-check-table">
            <thead>
              <tr>
                <th>Mã NL</th>
                <th>Tên Nguyên Liệu</th>
                <th>Đơn Vị</th>
                <th>Số Liệu Hệ Thống</th>
                <th>Số Liệu Thực Tế</th>
                <th>Chênh Lệch</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {inventories.map((inventory, index) => {
                const data = stockData[inventory._id] || {};
                const difference = data.difference || 0;

                return (
                  <tr key={inventory._id}>
                    <td>
                      <span className="inventory-code">{index + 1}</span>
                    </td>
                    <td className="inventory-name">
                      <strong>{inventory.name}</strong>
                    </td>
                    <td className="unit">{inventory.unit}</td>
                    <td className="system-stock">
                      <span className="stock-value">{inventory.currentstock}</span>
                    </td>
                    <td className="actual-stock">
                      <input
                        type="number"
                        value={data.actual_stock !== undefined && data.actual_stock !== null ? data.actual_stock : inventory.currentstock}
                        onChange={(e) => handleStockChange(inventory._id, e.target.value)}
                        min="0"
                        step="0.01"
                        className="stock-input"
                      />
                    </td>
                    <td className="difference">
                      <span className={`difference-value ${getDifferenceClass(difference)}`}>
                        {getDifferenceText(difference)}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSaveStockCheck(inventory._id)}
                        disabled={difference === 0 || saving}
                      >
                        <FaSave /> Lưu
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      <div className="summary-section">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Tổng nguyên liệu:</span>
            <span className="stat-value">{inventories.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Có chênh lệch:</span>
            <span className="stat-value">
              {Object.values(stockData).filter(data => data.difference !== 0).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockCheck;
