// pages/Chef/Recipe/RecipeManagement.jsx - GIAO DIỆN HIỆN ĐẠI
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaSearch, 
  FaFilter, 
  FaRedo, 
  FaEye,
  FaEdit,
  FaPlus,
  FaUtensils,
  FaClipboardList
} from 'react-icons/fa';
import axios from '../../../utils/axios.customize';
import { toast } from 'react-toastify';
import RecipeModal from './RecipeModal';
import './RecipeManagement.css';

const RecipeManagement = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [inventories, setInventories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [selectedMenuItem, setSelectedMenuItem] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        hasRecipe: '',
        entriesPerPage: 5,
        showFilter: false
    });
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();

    const recipeStatuses = [
        { value: '', label: 'Tất cả món ăn', icon: '🍽️' },
        { value: 'has-recipe', label: 'Đã có định lượng', icon: '✅' },
        { value: 'no-recipe', label: 'Chưa có định lượng', icon: '❌' }
    ];

    useEffect(() => {
        fetchMenuItems();
        fetchInventories();
    }, [filters.search, filters.hasRecipe]);

    const fetchMenuItems = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/menu-items', { withCredentials: true });
            let filteredData = res.data.data || res.data;
            
            // ✅ FILTER THEO TRẠNG THÁI ĐỊNH LƯỢNG
            if (filters.hasRecipe) {
                filteredData = filteredData.filter(item => {
                    const hasRecipe = item.total_ingredient_cost > 0;
                    return filters.hasRecipe === 'has-recipe' ? hasRecipe : !hasRecipe;
                });
            }
            
            setMenuItems(filteredData);
        } catch (error) {
            toast.error('Không thể tải danh sách món ăn');
        }
        setLoading(false);
    };

    const fetchInventories = async () => {
        try {
            const res = await axios.get('/inventory', { withCredentials: true });
            setInventories(res.data.data || []);
        } catch (error) {
            console.error('Error fetching inventories:', error);
        }
    };

    const openRecipeModal = (menuItem) => {
        setSelectedMenuItem(menuItem);
        setShowRecipeModal(true);
    };

    const closeRecipeModal = () => {
        setShowRecipeModal(false);
        setSelectedMenuItem(null);
    };

    const handleSaveRecipe = async (recipeData) => {
        try {
            const res = await axios.post(`/recipes/menu-items/${selectedMenuItem._id}`, {
                ingredients: recipeData
            }, { withCredentials: true });

            if (res.data.success) {
                toast.success('Lưu định lượng thành công!');
                closeRecipeModal();
                fetchMenuItems();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi lưu định lượng');
        }
    };

    const checkAvailability = async (menuItemId) => {
        try {
            const res = await axios.get(`/recipes/menu-items/${menuItemId}/check`, { withCredentials: true });
            
            if (res.data.success) {
                const { can_prepare, availability } = res.data;
                
                if (availability.length === 0) {
                    toast.warning('Món này chưa có định lượng nguyên liệu!');
                    return;
                }
                
                const message = can_prepare 
                    ? '✅ Có thể chế biến món này!' 
                    : `❌ Không đủ nguyên liệu: ${availability.filter(a => !a.sufficient).map(a => a.ingredient_name).join(', ')}`;
                
                const detailMessage = availability.map(item => 
                    `${item.ingredient_name}: Cần ${item.needed_quantity} ${item.unit}, Có ${item.available_quantity} ${item.unit} ${item.sufficient ? '✅' : '❌'}`
                ).join('\n');
                
                toast.info(message + '\n\nChi tiết:\n' + detailMessage, {
                    autoClose: 8000
                });
            }
        } catch (error) {
            console.error('Error checking availability:', error);
            toast.error('Lỗi khi kiểm tra tình trạng: ' + (error.response?.data?.message || error.message));
        }
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

    const resetFilters = () => {
        setFilters({
            search: '',
            hasRecipe: '',
            entriesPerPage: 5,
            showFilter: false
        });
        setCurrentPage(1);
    };

    const toggleFilter = () => {
        setFilters(prev => ({ ...prev, showFilter: !prev.showFilter }));
    };

    // Phân trang
    const filteredMenuItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(filters.search.toLowerCase())
    );
    
    const totalPages = Math.ceil(filteredMenuItems.length / filters.entriesPerPage);
    const startIndex = (currentPage - 1) * filters.entriesPerPage;
    const endIndex = startIndex + filters.entriesPerPage;
    const currentMenuItems = filteredMenuItems.slice(startIndex, endIndex);

    // Stats
    const stats = {
        total: menuItems.length,
        hasRecipe: menuItems.filter(item => item.total_ingredient_cost > 0).length,
        noRecipe: menuItems.filter(item => item.total_ingredient_cost === 0).length
    };

    return (
        <div className="recipe-management-container">
            {/* Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1 className="page-title">📊 Định Lượng Món Ăn</h1>
                    <p className="page-subtitle">Thiết lập định mức nguyên liệu cho từng món ăn</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-outline" onClick={toggleFilter}>
                        <FaFilter /> Lọc
                    </button>
                    <button className="btn btn-outline" onClick={resetFilters}>
                        <FaRedo /> Reset
                    </button>
                </div>
            </div>
            {/* Filter Panel */}
            {filters.showFilter && (
                <div className="filter-panel">
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Trạng thái định lượng:</label>
                            <select
                                value={filters.hasRecipe}
                                onChange={(e) => handleFilterChange('hasRecipe', e.target.value)}
                                className="filter-input"
                            >
                                {recipeStatuses.map(status => (
                                    <option key={status.value} value={status.value}>
                                        {status.icon} {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Controls */}
            <div className="table-controls">
                <div className="entries-control">
                    <span>Hiển thị</span>
                    <select
                        value={filters.entriesPerPage}
                        onChange={(e) => handleEntriesChange(e.target.value)}
                        className="entries-select"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                    </select>
                    <span>món</span>
                </div>

                <div className="search-control">
                    <span>Tìm kiếm:</span>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="search-input"
                        placeholder="Nhập tên món ăn..."
                    />
                </div>
            </div>

            {/* Menu Items Grid */}
            <div className="menu-items-wrapper">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <div className="menu-items-grid">
                        {currentMenuItems.length === 0 ? (
                            <div className="empty-state">
                                <FaUtensils size={48} />
                                <p>Không có món ăn nào</p>
                                {filters.hasRecipe && (
                                    <small>Không có món ăn nào với trạng thái "{recipeStatuses.find(s => s.value === filters.hasRecipe)?.label}"</small>
                                )}
                            </div>
                        ) : currentMenuItems.map(item => (
                            <div key={item._id} className="menu-item-card">
                                <div className="card-image">
                                    <img 
                                        src={item.image?.startsWith('http') ? item.image : `/uploads/${item.image}`} 
                                        alt={item.name} 
                                        onError={(e) => {
                                            e.target.src = '/default-food.png';
                                        }}
                                    />
                                </div>
                                
                                <div className="card-content">
                                    <h4>{item.name}</h4>
                                    <p className="price">{item.price.toLocaleString()} VND</p>
                                    
                                    <div className="card-actions">
                                        <button 
                                            className="action-btn primary-btn"
                                            onClick={() => openRecipeModal(item)}
                                            title={item.total_ingredient_cost > 0 ? 'Sửa định lượng' : 'Tạo định lượng'}
                                        >
                                            <FaEdit />
                                        </button>
                                        
                                        {item.total_ingredient_cost > 0 && (
                                            <button 
                                                className="action-btn secondary-btn"
                                                onClick={() => checkAvailability(item._id)}
                                                title="Kiểm tra nguyên liệu"
                                            >
                                                <FaClipboardList />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="table-footer">
                <div className="table-info">
                    <span>
                        Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredMenuItems.length)} 
                        trong tổng số {filteredMenuItems.length} món ăn
                        {filters.hasRecipe && (
                            <span className="filter-info">
                                {' '}(Lọc: {recipeStatuses.find(s => s.value === filters.hasRecipe)?.label})
                            </span>
                        )}
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

            {/* Recipe Modal */}
            {showRecipeModal && selectedMenuItem && (
                <RecipeModal
                    isOpen={showRecipeModal}
                    onClose={closeRecipeModal}
                    onSave={handleSaveRecipe}
                    menuItem={selectedMenuItem}
                    inventories={inventories}
                />
            )}
        </div>
    );
};

export default RecipeManagement;
