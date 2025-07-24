// pages/Chef/Inventory/InventoryList.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBoxes,
  FaSearch,
  FaFilter,
  FaRedo,
  FaClipboardList,
  FaExclamationTriangle,
  FaEye,
  FaEdit,
  FaPlus,
  FaTrash,
  FaUndo
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from '../../../utils/axios.customize';
import AddInventoryModal from './AddInventoryModal';
import EditInventoryModal from './EditInventoryModal';
import './InventoryList.css';

const InventoryList = () => {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    stockStatus: '',
    storageType: '',
    entriesPerPage: 10,
    showFilter: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const navigate = useNavigate();

  const stockStatuses = [
    { value: '', label: 'Tất cả trạng thái', icon: '📦' },
    { value: 'in-stock', label: 'Còn hàng', icon: '✅' },
    { value: 'low-stock', label: 'Sắp hết', icon: '⚠️' },
    { value: 'out-of-stock', label: 'Hết hàng', icon: '❌' }
  ];

  const storageTypes = [
    { value: '', label: 'Tất cả loại', icon: '📦' },
    { value: 'perishable', label: 'Tươi sống (2 ngày)', icon: '🥬' },
    { value: 'semi-perishable', label: 'Bán tươi (4 ngày)', icon: '🥩' },
    { value: 'dry', label: 'Khô/đông lạnh (7 ngày)', icon: '🌾' }
  ];

  useEffect(() => {
    fetchInventories();
    // eslint-disable-next-line
  }, [filters.search, filters.stockStatus, filters.storageType, showDeleted]);

  const fetchInventories = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;

      if (showDeleted) {
        params.inactive = true;
      } else if (filters.stockStatus === 'low-stock') {
        params.lowstock = true;
      }

      const response = await axios.get('/inventory', {
        params,
        withCredentials: true
      });

      if (response.data.success) {
        let filteredData = response.data.data || [];

        if (!showDeleted && filters.stockStatus) {
          filteredData = filteredData.filter(inventory => {
            const status = getStockStatus(inventory);
            return status === filters.stockStatus;
          });
        }

        if (filters.storageType) {
          filteredData = filteredData.filter(inventory => {
            return (inventory.storageType || 'perishable') === filters.storageType;
          });
        }

        setInventories(filteredData);
      } else {
        toast.error('Không thể tải danh sách nguyên liệu');
      }
    } catch (error) {
      console.error('Fetch inventories error:', error);
      toast.error('Lỗi khi tải danh sách nguyên liệu');
    } finally {
      setLoading(false);
    }
  };

  const getInventoryCode = (index) => {
    return ((currentPage - 1) * filters.entriesPerPage + index + 1).toString();
  };

  const getStockStatus = (inventory) => {
    if (inventory.currentstock === 0) return 'out-of-stock';
    if (inventory.currentstock <= inventory.minstocklevel) return 'low-stock';
    return 'in-stock';
  };

  const getStockStatusText = (inventory) => {
    if (inventory.currentstock === 0) return 'Hết hàng';
    if (inventory.currentstock <= inventory.minstocklevel) return 'Sắp hết';
    return 'Còn hàng';
  };

  const getStorageTypeLabel = (storageType) => {
    const type = storageTypes.find(t => t.value === (storageType || 'perishable'));
    return type ? `${type.icon} ${type.label}` : '🥬 Tươi sống (2 ngày)';
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleEntriesChange = (value) => {
    setFilters(prev => ({ ...prev, entriesPerPage: parseInt(value) }));
    setCurrentPage(1);
  };

  const handleDeleteInventory = async (inventory) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${inventory.name}"?\nNguyên liệu sẽ bị ẩn khỏi danh sách.`)) return;
    try {
      const resp = await axios.delete(`/inventory/${inventory._id}`, { withCredentials: true });
      if (resp.data.success) {
        toast.success('Xóa nguyên liệu thành công!');
        fetchInventories();
      } else {
        toast.error(resp.data.message || 'Có lỗi khi xóa nguyên liệu');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa nguyên liệu');
    }
  };

  const handleRestoreInventory = async (inventory) => {
    if (!window.confirm(`Bạn có muốn khôi phục "${inventory.name}" về trạng thái hoạt động?`)) return;
    try {
      const resp = await axios.patch(`/inventory/${inventory._id}/restore`, {}, { withCredentials: true });
      if (resp.data.success) {
        toast.success('Khôi phục nguyên liệu thành công!');
        fetchInventories();
      } else {
        toast.error(resp.data.message || 'Có lỗi khi khôi phục nguyên liệu');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi khôi phục nguyên liệu');
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      stockStatus: '',
      storageType: '',
      entriesPerPage: 10,
      showFilter: false
    });
    setCurrentPage(1);
  };

  const toggleFilter = () => {
    setFilters(prev => ({ ...prev, showFilter: !prev.showFilter }));
  };

  const handleStockCheck = () => {
    navigate('/chef/stock-check');
  };

  const handleAddInventory = async (inventoryData) => {
    try {
      const response = await axios.post('/inventory', inventoryData, {
        withCredentials: true
      });

      if (response.data.success) {
        toast.success('Thêm nguyên liệu thành công!');
        setShowAddModal(false);
        fetchInventories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi thêm nguyên liệu');
    }
  };

  const handleEditInventory = async (inventoryData) => {
    try {
      const response = await axios.put(`/inventory/${selectedInventory._id}`, inventoryData, {
        withCredentials: true
      });

      if (response.data.success) {
        toast.success('Cập nhật nguyên liệu thành công!');
        setShowEditModal(false);
        setSelectedInventory(null);
        fetchInventories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật nguyên liệu');
    }
  };

  const openEditModal = (inventory) => {
    setSelectedInventory(inventory);
    setShowEditModal(true);
  };

  const totalPages = Math.ceil(inventories.length / filters.entriesPerPage);
  const startIndex = (currentPage - 1) * filters.entriesPerPage;
  const endIndex = startIndex + filters.entriesPerPage;
  const currentInventories = inventories.slice(startIndex, endIndex);

  const lowStockCount = inventories.filter(item =>
    item.currentstock <= item.minstocklevel
  ).length;

  return (
    <div className="inventory-list-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">📦 Kho Nguyên Liệu</h1>
          <p className="page-subtitle">Danh sách nguyên liệu trong kho</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={toggleFilter}>
            <FaFilter /> Lọc
          </button>
          <button className="btn btn-outline" onClick={resetFilters}>
            <FaRedo /> Reset
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              setShowDeleted(prev => !prev);
              setCurrentPage(1);
            }}
            style={{ fontWeight: showDeleted ? 'bold' : 'normal', color: showDeleted ? '#d9534f' : undefined }}
          >
            {showDeleted ? "← Về danh sách hoạt động" : "🗑 Nguyên liệu đã xóa"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleStockCheck}
          >
            <FaClipboardList /> Kiểm Kho
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <FaPlus /> Thêm Nguyên Liệu
          </button>
        </div>
      </div>

      {!showDeleted && lowStockCount > 0 && (
        <div className="alert alert-warning">
          <FaExclamationTriangle />
          <strong>Cảnh báo:</strong> {lowStockCount} nguyên liệu sắp hết hàng!
        </div>
      )}

      {filters.showFilter && (
        <div className="filter-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label>Trạng thái tồn kho:</label>
              <select
                value={filters.stockStatus}
                onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
                className="filter-input"
                disabled={showDeleted}
              >
                {stockStatuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.icon} {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Loại bảo quản:</label>
              <select
                value={filters.storageType}
                onChange={(e) => handleFilterChange('storageType', e.target.value)}
                className="filter-input"
              >
                {storageTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="table-controls">
        <div className="entries-control">
          <span>Hiển thị</span>
          <select
            value={filters.entriesPerPage}
            onChange={(e) => handleEntriesChange(e.target.value)}
            className="entries-select"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>mục</span>
        </div>

        <div className="search-control">
          <span>Tìm kiếm:</span>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
            placeholder="Nhập tên nguyên liệu..."
          />
        </div>
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Mã NL</th>
                <th>Tên Nguyên Liệu</th>
                <th>Loại Bảo Quản</th>
                <th>Số Lượng Tồn</th>
                <th>Đơn Vị</th>
                <th>Mức Tối Thiểu</th>
                <th>Giá/Đơn Vị</th>
                <th>Nhà Cung Cấp</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {currentInventories.length === 0 ? (
                <tr>
                  <td colSpan={10} className="no-data">
                    <div className="empty-state">
                      <FaBoxes size={48} />
                      <p>Không có nguyên liệu nào</p>
                      {filters.stockStatus && !showDeleted && (
                        <small>
                          Không có nguyên liệu nào với trạng thái "{stockStatuses.find(s => s.value === filters.stockStatus)?.label}"
                        </small>
                      )}
                      {filters.storageType && (
                        <small>
                          Không có nguyên liệu nào với loại bảo quản "{storageTypes.find(s => s.value === filters.storageType)?.label}"
                        </small>
                      )}
                      {showDeleted && <small>Chưa có nguyên liệu nào đã bị xóa mềm</small>}
                    </div>
                  </td>
                </tr>
              ) : currentInventories.map((inventory, index) => (
                <tr key={inventory._id}>
                  <td>
                    <span className="inventory-code">
                      {getInventoryCode(index)}
                    </span>
                  </td>
                  <td className="inventory-name">
                    <strong>{inventory.name}</strong>
                  </td>
                  <td className="storage-type">
                    <span className={`storage-badge ${inventory.storageType || 'perishable'}`}>
                      {getStorageTypeLabel(inventory.storageType)}
                    </span>
                  </td>
                  <td className="stock-quantity">
                    <span className={`quantity ${getStockStatus(inventory)}`}>
                      {inventory.currentstock}
                    </span>
                  </td>
                  <td className="unit">{inventory.unit}</td>
                  <td className="min-stock">{inventory.minstocklevel}</td>
                  <td className="price">
                    {inventory.costperunit > 0 ? (
                      `${inventory.costperunit.toLocaleString()} VND`
                    ) : (
                      <span className="no-price">Chưa nhập hàng</span>
                    )}
                  </td>
                  <td className="supplier">{inventory.supplier}</td>
                  <td>
                    <span className={`status-badge ${getStockStatus(inventory)}`}>
                      {getStockStatusText(inventory)}
                    </span>
                  </td>
                  <td className="actions">
                    {!showDeleted ? (
                      <>
                        <button
                          className="action-btn view-btn"
                          onClick={() => navigate(`/chef/inventory/${inventory._id}`)}
                          title="Xem chi tiết và lịch sử"
                        >
                          <FaEye />
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => openEditModal(inventory)}
                          title="Chỉnh sửa"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteInventory(inventory)}
                          title="Xóa (ẩn khỏi danh sách)"
                          style={{ color: '#d9534f' }}
                        >
                          <FaTrash />
                        </button>
                      </>
                    ) : (
                      <button
                        className="action-btn restore-btn"
                        onClick={() => handleRestoreInventory(inventory)}
                        title="Khôi phục nguyên liệu"
                        style={{ color: '#5cb85c' }}
                      >
                        <FaUndo />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="table-footer">
        <div className="table-info">
          <span>
            Hiển thị {startIndex + 1} - {Math.min(endIndex, inventories.length)}
            trong tổng số {inventories.length} nguyên liệu
            {filters.stockStatus && !showDeleted && (
              <span className="filter-info">
                {' '}(Lọc trạng thái: {stockStatuses.find(s => s.value === filters.stockStatus)?.label})
              </span>
            )}
            {filters.storageType && (
              <span className="filter-info">
                {' '}(Lọc bảo quản: {storageTypes.find(s => s.value === filters.storageType)?.label})
              </span>
            )}
            {showDeleted && <span className="filter-info"> (Đang xem nguyên liệu đã xóa)</span>}
          </span>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ← Trước
            </button>

            {[...Array(totalPages)].map((_, index) => {
              const pageNum = index + 1;
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              } else if (
                pageNum === currentPage - 2 ||
                pageNum === currentPage + 2
              ) {
                return <span key={pageNum} className="page-dots">...</span>;
              }
              return null;
            })}

            <button
              className="page-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Sau →
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddInventoryModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddInventory}
        />
      )}

      {showEditModal && selectedInventory && (
        <EditInventoryModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedInventory(null);
          }}
          onSubmit={handleEditInventory}
          inventory={selectedInventory}
        />
      )}
    </div>
  );
};

export default InventoryList;
