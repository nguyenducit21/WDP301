// pages/Chef/Recipe/RecipeManagement.jsx
import React, { useState, useEffect } from 'react';
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
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMenuItems();
        fetchInventories();
    }, []);

    const fetchMenuItems = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/menu-items', { withCredentials: true });
            setMenuItems(res.data.data || res.data);
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
                toast.success('Lưu công thức thành công!');
                closeRecipeModal();
                // Cập nhật lại danh sách món ăn để hiển thị thông tin cost mới
                fetchMenuItems();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi lưu công thức');
        }
    };

    // RecipeManagement.jsx - Sửa function checkAvailability
const checkAvailability = async (menuItemId) => {
    try {
        console.log('Checking availability for:', menuItemId); // Debug
        
        const res = await axios.get(`/recipes/menu-items/${menuItemId}/check`, { withCredentials: true });
        console.log('Availability response:', res.data); // Debug
        
        if (res.data.success) {
            const { can_prepare, availability } = res.data;
            
            if (availability.length === 0) {
                toast.warning('Món này chưa có công thức!');
                return;
            }
            
            const message = can_prepare 
                ? '✅ Có thể chế biến món này!' 
                : `❌ Không đủ nguyên liệu: ${availability.filter(a => !a.sufficient).map(a => a.ingredient_name).join(', ')}`;
            
            // Hiển thị chi tiết hơn
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


    const filteredMenuItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="recipe-management">
            <div className="header-section">
                <h2>Quản lý công thức món ăn</h2>
                <p>Thiết lập định mức nguyên liệu cho từng món ăn</p>
            </div>

            {/* Search */}
            <div className="search-section">
                <input
                    type="text"
                    placeholder="Tìm kiếm món ăn..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {loading ? (
                <div className="loading">Đang tải...</div>
            ) : (
                <div className="menu-items-grid">
                    {filteredMenuItems.map(item => (
                        <div key={item._id} className="menu-item-card">
                            <div className="card-image">
                                <img 
                                    src={item.image?.startsWith('http') ? item.image : `/uploads/${item.image}`} 
                                    alt={item.name} 
                                    onError={(e) => {
                                        e.target.src = '/default-food.png';
                                    }}
                                />
                                {item.total_ingredient_cost > 0 && (
                                    <div className="cost-badge">
                                        {item.food_cost_percentage?.toFixed(1)}% cost
                                    </div>
                                )}
                            </div>
                            
                            <div className="card-content">
                                <h4>{item.name}</h4>
                                <p className="price">{item.price.toLocaleString()} VND</p>
                                
                                {item.total_ingredient_cost > 0 && (
                                    <div className="cost-info">
                                        <small>Chi phí NL: {item.total_ingredient_cost.toLocaleString()} VND</small>
                                    </div>
                                )}
                                
                                <div className="card-actions">
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => openRecipeModal(item)}
                                    >
                                        {item.total_ingredient_cost > 0 ? 'Sửa công thức' : 'Tạo công thức'}
                                    </button>
                                    
                                    {item.total_ingredient_cost > 0 && (
                                        <button 
                                            className="btn btn-outline"
                                            onClick={() => checkAvailability(item._id)}
                                        >
                                            Kiểm tra NL
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
