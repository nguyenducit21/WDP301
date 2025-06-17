// pages/Chef/Inventory/InventoryManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from '../../../utils/axios.customize';
import { toast } from 'react-toastify';
import AddInventoryModal from './AddInventoryModal';
import ImportStockModal from './ImportStockModal';
import './InventoryManagement.css';

const InventoryManagement = () => {
    const [inventories, setInventories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [filters, setFilters] = useState({
        category: '',
        search: '',
        low_stock: false
    });

    const categories = [
        { value: 'thịt', label: 'Thịt' },
        { value: 'cá', label: 'Cá' },
        { value: 'rau_củ', label: 'Rau củ' },
        { value: 'gia_vị', label: 'Gia vị' },
        { value: 'đồ_khô', label: 'Đồ khô' },
        { value: 'đồ_uống', label: 'Đồ uống' },
        { value: 'khác', label: 'Khác' }
    ];

    useEffect(() => {
        fetchInventories();
    }, [filters]);

    const fetchInventories = async () => {
        setLoading(true);
        try {
            const params = { ...filters };
            const res = await axios.get('/inventory', { params, withCredentials: true });
            setInventories(res.data.data || []);
        } catch (error) {
            toast.error('Không thể tải dữ liệu nguyên liệu');
            console.error('Fetch inventories error:', error);
        }
        setLoading(false);
    };

    const handleAddInventory = async (inventoryData) => {
        try {
            const res = await axios.post('/inventory', inventoryData, { withCredentials: true });
            if (res.data.success) {
                toast.success('Thêm nguyên liệu thành công!');
                setShowAddModal(false);
                fetchInventories();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi thêm nguyên liệu');
        }
    };

    const handleImportStock = async (importData) => {
        try {
            const res = await axios.post(`/inventory/${selectedInventory._id}/import`, importData, { withCredentials: true });
            if (res.data.success) {
                toast.success(res.data.message);
                setShowImportModal(false);
                setSelectedInventory(null);
                fetchInventories();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi nhập kho');
        }
    };

    const openImportModal = (inventory) => {
        setSelectedInventory(inventory);
        setShowImportModal(true);
    };

    const getStatusColor = (inventory) => {
        if (inventory.current_stock <= inventory.min_stock_level) return 'status-danger';
        return 'status-success';
    };

    const getStatusText = (inventory) => {
        if (inventory.current_stock <= inventory.min_stock_level) return 'Sắp hết';
        return 'Đủ hàng';
    };

    return (
        <div className="inventory-management">
            <div className="header-section">
                <h2>Quản lý nguyên liệu</h2>
                
                {/* Alert cho nguyên liệu sắp hết */}
                {inventories.filter(inv => inv.current_stock <= inv.min_stock_level).length > 0 && (
                    <div className="alert alert-warning">
                        <strong>Cảnh báo:</strong> {inventories.filter(inv => inv.current_stock <= inv.min_stock_level).length} nguyên liệu sắp hết hàng
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="filters-section">
                <div className="filter-group">
                    <input
                        type="text"
                        placeholder="Tìm kiếm nguyên liệu..."
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                    
                    <select
                        value={filters.category}
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                    >
                        <option value="">Tất cả danh mục</option>
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                    
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={filters.low_stock}
                            onChange={(e) => setFilters({...filters, low_stock: e.target.checked})}
                        />
                        Chỉ hiện sắp hết
                    </label>
                </div>
                
                <button 
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    Thêm nguyên liệu
                </button>
            </div>

            {/* Inventory Grid */}
            {loading ? (
                <div className="loading">Đang tải...</div>
            ) : (
                <div className="inventory-grid">
                    {inventories.map(inventory => (
                        <div key={inventory._id} className="inventory-card">
                            <div className="card-header">
                                <h4>{inventory.name}</h4>
                                <span className="category-badge">{inventory.category}</span>
                            </div>
                            
                            <div className="card-body">
                                <div className="stock-info">
                                    <span className={`current-stock ${inventory.current_stock <= inventory.min_stock_level ? 'low-stock' : ''}`}>
                                        {inventory.current_stock} {inventory.unit}
                                    </span>
                                    <span className="min-stock">
                                        Tối thiểu: {inventory.min_stock_level} {inventory.unit}
                                    </span>
                                </div>
                                
                                <div className="price-info">
                                    {inventory.cost_per_unit.toLocaleString()} VND/{inventory.unit}
                                </div>
                                
                                <div className="supplier-info">
                                    <small>Nhà cung cấp: {inventory.supplier}</small>
                                </div>
                                
                                <div className="status">
                                    <span className={`status ${getStatusColor(inventory)}`}>
                                        {getStatusText(inventory)}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="card-actions">
                                <button className="btn btn-outline">Chi tiết</button>
                                <button 
                                    className="btn btn-success"
                                    onClick={() => openImportModal(inventory)}
                                >
                                    Nhập kho
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {showAddModal && (
                <AddInventoryModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddInventory}
                    categories={categories}
                />
            )}

            {showImportModal && selectedInventory && (
                <ImportStockModal
                    isOpen={showImportModal}
                    onClose={() => {
                        setShowImportModal(false);
                        setSelectedInventory(null);
                    }}
                    onSubmit={handleImportStock}
                    inventory={selectedInventory}
                />
            )}
        </div>
    );
};

export default InventoryManagement;
