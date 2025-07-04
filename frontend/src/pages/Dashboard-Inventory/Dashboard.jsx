import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios.customize';
import { FaInfoCircle, FaSyncAlt, FaFilter, FaChevronDown, FaChevronRight, FaShoppingCart } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './ImportDashboard.css';

const STORAGE_TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'Tươi sống', label: 'Tươi sống' },
  { value: 'Bán tươi', label: 'Bán tươi' },
  { value: 'Khô/đông lạnh', label: 'Khô/đông lạnh' },
];

const ImportDashboard = () => {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/inventory/analytics');
      if (!res.data.success) {
        throw new Error(res.data.message || 'Lỗi từ server');
      }
      setAnalytics(res.data.data || []);
    } catch (error) {
      console.error('fetchAnalytics error:', error.response?.data || error.message);
      toast.error(`Lỗi khi lấy dữ liệu dashboard: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (value) => setFilter(value);
  const handleSearch = (e) => setSearch(e.target.value);

  const toggleRowDetails = (itemId) => {
    setExpandedRows(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleQuickImport = (item) => {
    const importData = {
      inventory_id: item.id,
      name: item.name,
      unit: item.unit,
      suggestedQuantity: item.suggestImport,
      currentStock: item.currentStock,
      minStockLevel: item.minStockLevel,
      storageType: item.storageType,
      description: item.description
    };

    navigate('/chef/import-receipts/create', {
      state: { prefilledItem: importData }
    });
  };

  const handleBulkImport = () => {
    const itemsNeedImport = filteredData.filter(item => item.suggestImport > 0);
    
    if (itemsNeedImport.length === 0) {
      toast.info('Không có nguyên liệu nào cần nhập hàng');
      return;
    }

    const bulkData = itemsNeedImport.map(item => ({
      inventory_id: item.id,
      name: item.name,
      unit: item.unit,
      suggestedQuantity: item.suggestImport,
      currentStock: item.currentStock,
      minStockLevel: item.minStockLevel,
      storageType: item.storageType
    }));

    navigate('/chef/import-receipts/create', {
      state: { prefilledItems: bulkData }
    });
  };

  const filteredData = analytics.filter(
    (item) =>
      (filter ? item.storageType === filter : true) &&
      (search.trim() === '' || item.name.toLowerCase().includes(search.trim().toLowerCase()))
  );

  const totalSuggest = filteredData.reduce((sum, item) => sum + (item.suggestImport > 0 ? 1 : 0), 0);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="import-dashboard-container">
      <div className="page-header">
        <div className="header-content">
          <h2 className="page-title">Dashboard Đề Xuất Nhập Hàng</h2>
          <p className="page-subtitle">
            Theo dõi tồn kho, tiêu thụ và đề xuất nhập hàng khoa học cho từng loại nguyên liệu.
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleBulkImport}
            disabled={filteredData.filter(item => item.suggestImport > 0).length === 0}
          >
            <FaShoppingCart /> Nhập hàng ({filteredData.filter(item => item.suggestImport > 0).length})
          </button>
          
          <button className="btn btn-outline" onClick={fetchAnalytics} title="Tải lại dữ liệu">
            <FaSyncAlt /> Làm mới
          </button>
        </div>
      </div>

      <div className="table-controls">
        <div className="entries-control">
          <FaFilter />
          <select value={filter} onChange={(e) => handleFilter(e.target.value)} className="entries-select">
            {STORAGE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="search-control">
          <input
            className="search-input"
            placeholder="Tìm nguyên liệu..."
            value={search}
            onChange={handleSearch}
          />
        </div>
        <div className="statistic">
          <span>
            <b>{totalSuggest}</b> nguyên liệu cần nhập tuần này
          </span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="receipt-table">
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Tên Nguyên Liệu</th>
              <th>Bảo Quản</th>
              <th>Tồn Kho</th>
              <th>Tiêu Thụ TB/Ngày</th>
              <th>Đủ Dùng</th>
              <th>Đề Xuất Nhập</th>
              <th>Chi Tiết</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    Đang tải dữ liệu...
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#6b7280' }}>
                  Không có dữ liệu phù hợp
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className={item.suggestImport > 0 ? 'row-highlight' : ''}>
                    <td>
                      <span className="receipt-number">{item.name}</span>
                      <span className="unit-label">({item.unit})</span>
                    </td>
                    <td className="storage-type">{item.storageType}</td>
                    <td className={item.currentStock < item.minStockLevel ? 'cell-warning' : ''}>
                      {item.currentStock}
                    </td>
                    <td>{item.avgDailyUsed.toFixed(2)}</td>
                    <td>
                      {item.neededForDays} {item.unit} / {item.usedForDays} ngày
                    </td>
                    <td>
                      <span className={item.suggestImport > 0 ? 'import-suggest' : 'import-none'}>
                        {item.suggestImport}
                      </span>
                      {item.warning && (
                        <span className="warning-icon" title={item.warning}>
                          ⚠️
                        </span>
                      )}
                    </td>
                    <td className="details-cell">
                      <button 
                        className={`details-toggle ${expandedRows.includes(item.id) ? 'active' : ''}`}
                        onClick={() => toggleRowDetails(item.id)}
                      >
                        {expandedRows.includes(item.id) ? <FaChevronDown /> : <FaChevronRight />}
                        {expandedRows.includes(item.id) ? 'Ẩn' : 'Chi tiết'}
                      </button>
                    </td>
                    <td className="action-cell">
                      {item.suggestImport > 0 ? (
                        <button 
                          className="btn-quick-import"
                          onClick={() => handleQuickImport(item)}
                          title="Nhập hàng nhanh"
                        >
                          <FaShoppingCart />
                        </button>
                      ) : (
                        <span className="no-action">-</span>
                      )}
                    </td>
                  </tr>
                  
                  {expandedRows.includes(item.id) && (
                    <tr className="details-row">
                      <td colSpan={8}>
                        <div className="details-content">
                          <div className="details-grid">
                            <div className="detail-item">
                              <div className="detail-label">Đề xuất nhập</div>
                              <div className="detail-value">
                                <span className="import-suggest">{item.suggestImport} {item.unit}</span>
                                <small> (cho {item.usedForDays} ngày)</small>
                              </div>
                            </div>
                            
                            <div className="detail-item">
                              <div className="detail-label">Tiêu thụ trung bình</div>
                              <div className="detail-value">{item.avgDailyUsed.toFixed(2)} {item.unit}/ngày</div>
                            </div>
                            
                            <div className="detail-item">
                              <div className="detail-label">Tồn kho hiện tại</div>
                              <div className="detail-value">{item.currentStock} {item.unit}</div>
                            </div>
                            
                            <div className="detail-item">
                              <div className="detail-label">Mức tối thiểu</div>
                              <div className="detail-value">{item.minStockLevel} {item.unit}</div>
                            </div>
                            
                            <div className="detail-item">
                              <div className="detail-label">Công thức tính</div>
                              <div className="detail-formula">{item.formula}</div>
                            </div>
                            
                            <div className="detail-item">
                              <div className="detail-label">Mô tả</div>
                              <div className="detail-value">{item.description}</div>
                            </div>
                          </div>
                          
                          {item.warning && (
                            <div className="detail-warning">
                              <strong>⚠️ Cảnh báo:</strong> {item.warning}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Trước
          </button>
          <span className="pagination-info">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportDashboard;
