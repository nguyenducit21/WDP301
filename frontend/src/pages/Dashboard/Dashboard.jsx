import React, { useEffect, useState } from 'react';
import axios from '../../utils/axios.customize';
import { FaInfoCircle, FaSyncAlt, FaFilter } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
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
  const [itemsPerPage] = useState(10); // Số mục mỗi trang

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

  const filteredData = analytics.filter(
    (item) =>
      (filter ? item.storageType === filter : true) &&
      (search.trim() === '' || item.name.toLowerCase().includes(search.trim().toLowerCase()))
  );

  const totalSuggest = filteredData.reduce((sum, item) => sum + (item.suggestImport > 0 ? 1 : 0), 0);

  // Phân trang
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
            <col style={{ width: '30%' }} /> {/* Tên Nguyên Liệu */}
            <col style={{ width: '8%' }} /> {/* Bảo Quản */}
            <col style={{ width: '10%' }} /> {/* Tồn Kho */}
            <col style={{ width: '12%' }} /> {/* Tiêu Thụ TB/Ngày */}
            <col style={{ width: '12%' }} /> {/* Đủ Dùng */}
            <col style={{ width: '12%' }} /> {/* Đề Xuất Nhập */}
            <col style={{ width: '10%' }} /> {/* Diễn Giải */}
            <col style={{ width: '16%' }} /> {/* Ngày Nhập Gần Nhất */}
          </colgroup>
          <thead>
            <tr>
              <th>Tên Nguyên Liệu</th>
              <th>Bảo Quản</th>
              <th>Tồn Kho</th>
              <th>Tiêu Thụ TB/Ngày</th>
              <th>Đủ Dùng</th>
              <th>Đề Xuất Nhập</th>
              <th>Diễn Giải</th>
              <th>Ngày Nhập Gần Nhất</th>
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
                <tr
                  key={item.id}
                  className={item.suggestImport > 0 ? 'row-highlight' : ''}
                  data-tooltip-id={`tooltip-${item.id}`}
                >
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
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="info-tooltip">
                      <FaInfoCircle /> Xem
                    </span>
                    <Tooltip
                      id={`tooltip-${item.id}`}
                      place="top"
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        maxWidth: '320px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                      }}
                    >
                      <div>
                        <b>Đề xuất nhập:</b> <span style={{ color: '#157347' }}>{item.suggestImport} {item.unit}</span> (cho {item.usedForDays} ngày)<br />
                        <b>Tiêu thụ TB:</b> {item.avgDailyUsed.toFixed(2)}/ngày<br />
                        <b>Tồn kho:</b> {item.currentStock} {item.unit}<br />
                        <b>Công thức:</b> <span style={{ fontFamily: 'monospace' }}>{item.formula}</span><br />
                        <b>Ghi chú:</b> {item.description}<br />
                        {item.warning && <span style={{ color: '#dc2626' }}>{item.warning}</span>}
                      </div>
                    </Tooltip>
                  </td>
                  <td>{item.lastImportDate || 'N/A'}</td>
                </tr>
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