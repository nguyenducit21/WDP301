// pages/Chef/Recipe/RecipeModal.jsx - SỬ DỤNG CSS RIÊNG
import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import axios from '../../../utils/axios.customize';
import { toast } from 'react-toastify';
import './RecipeModal.css'; // ✅ IMPORT CSS RIÊNG

const RecipeModal = ({ isOpen, onClose, onSave, menuItem, inventories }) => {
    const [recipe, setRecipe] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && menuItem) {
            fetchExistingRecipe();
        }
    }, [isOpen, menuItem]);

    // pages/Chef/Recipe/RecipeModal.jsx - XỬ LÝ DATA MỚI
const fetchExistingRecipe = async () => {
    setLoading(true);
    try {
        const res = await axios.get(`/recipes/menu-items/${menuItem._id}`, { withCredentials: true });
        
        if (res.data.success && res.data.data.length > 0) {
            // ✅ DATA GIỜ LÀ ARRAY TRỰC TIẾP
            const existingRecipe = res.data.data.map(item => ({
                inventory_id: item.inventory_id._id,
                inventory_name: item.inventory_id.name,
                quantity_needed: item.quantity_needed,
                unit: item.unit
            }));
            setRecipe(existingRecipe);
        } else {
            setRecipe([]);
        }
    } catch (error) {
        console.error('Error fetching recipe:', error);
        setRecipe([]);
    }
    setLoading(false);
};


    const addIngredient = () => {
        setRecipe([...recipe, {
            inventory_id: '',
            inventory_name: '',
            quantity_needed: '',
            unit: ''
        }]);
    };

    const updateIngredient = (index, field, value) => {
        const updatedRecipe = [...recipe];
        updatedRecipe[index][field] = value;

        if (field === 'inventory_id') {
            const selectedInventory = inventories.find(inv => inv._id === value);
            if (selectedInventory) {
                updatedRecipe[index].inventory_name = selectedInventory.name;
                updatedRecipe[index].unit = selectedInventory.unit;
            }
        }

        setRecipe(updatedRecipe);
    };

    const removeIngredient = (index) => {
        const updatedRecipe = recipe.filter((_, i) => i !== index);
        setRecipe(updatedRecipe);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const validRecipe = recipe.filter(ingredient => 
            ingredient.inventory_id && 
            ingredient.quantity_needed && 
            parseFloat(ingredient.quantity_needed) > 0
        );

        if (validRecipe.length === 0) {
            toast.error('Vui lòng thêm ít nhất một nguyên liệu với số lượng hợp lệ');
            return;
        }

        const processedRecipe = validRecipe.map(ingredient => ({
            ...ingredient,
            quantity_needed: parseFloat(ingredient.quantity_needed)
        }));

        onSave(processedRecipe);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="recipe-modal-content">
                {/* Header */}
                <div className="recipe-modal-header">
                    <h3>📊 Định lượng: {menuItem.name}</h3>
                    <button className="recipe-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="recipe-modal-body">
                    {loading ? (
                        <div className="recipe-loading">
                            <div className="recipe-loading-spinner"></div>
                            <p>Đang tải định lượng...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {/* Menu Item Info */}
                            <div className="recipe-menu-item-info">
                                <img 
                                    src={menuItem.image?.startsWith('http') ? menuItem.image : `/uploads/${menuItem.image}`} 
                                    alt={menuItem.name}
                                    className="recipe-menu-item-image"
                                    onError={(e) => {
                                        e.target.src = '/default-food.png';
                                    }}
                                />
                                <div className="recipe-menu-item-details">
                                    <h4>{menuItem.name}</h4>
                                    <p>Thiết lập định lượng nguyên liệu cho món ăn này</p>
                                </div>
                            </div>

                            {/* Ingredients Section */}
                            <div className="recipe-ingredients-section">
                                <div className="recipe-section-header">
                                    <h4>Danh sách nguyên liệu</h4>
                                    <button 
                                        type="button" 
                                        className="recipe-btn-add"
                                        onClick={addIngredient}
                                    >
                                        <FaPlus /> Thêm nguyên liệu
                                    </button>
                                </div>

                                {recipe.length === 0 ? (
                                    <div className="recipe-empty-ingredients">
                                        <h4>Chưa có nguyên liệu nào</h4>
                                        <p>Hãy thêm nguyên liệu đầu tiên cho món ăn này</p>
                                        <button 
                                            type="button" 
                                            className="recipe-btn-add-first"
                                            onClick={addIngredient}
                                        >
                                            <FaPlus /> Thêm nguyên liệu đầu tiên
                                        </button>
                                    </div>
                                ) : (
                                    <div className="recipe-ingredients-list">
                                        {recipe.map((ingredient, index) => (
                                            <div key={index} className="recipe-ingredient-row">
                                                {/* Tên nguyên liệu */}
                                                <div className="recipe-form-group">
                                                    <label className="recipe-form-label">Nguyên liệu</label>
                                                    <select
                                                        value={ingredient.inventory_id}
                                                        onChange={(e) => updateIngredient(index, 'inventory_id', e.target.value)}
                                                        className="recipe-form-select"
                                                        required
                                                    >
                                                        <option value="">-- Chọn nguyên liệu --</option>
                                                        {inventories.map(inv => (
                                                            <option key={inv._id} value={inv._id}>
                                                                {inv.name} (Tồn: {inv.currentstock} {inv.unit})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Số lượng */}
                                                <div className="recipe-form-group">
                                                    <label className="recipe-form-label">Số lượng cần</label>
                                                    <div className="recipe-quantity-input">
                                                        <input
                                                            type="number"
                                                            value={ingredient.quantity_needed}
                                                            onChange={(e) => updateIngredient(index, 'quantity_needed', e.target.value)}
                                                            className="recipe-form-input"
                                                            placeholder="Nhập số lượng"
                                                            min="0"
                                                            step="0.01"
                                                            required
                                                        />
                                                        <span className="recipe-unit-badge">
                                                            {ingredient.unit || 'Đơn vị'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Nút xóa */}
                                                <button 
                                                    type="button"
                                                    className="recipe-btn-remove"
                                                    onClick={() => removeIngredient(index)}
                                                    title="Xóa nguyên liệu"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="recipe-modal-footer">
                                <button 
                                    type="button" 
                                    className="recipe-btn-cancel"
                                    onClick={onClose}
                                >
                                    Hủy bỏ
                                </button>
                                <button 
                                    type="submit" 
                                    className="recipe-btn-save"
                                    disabled={recipe.length === 0}
                                >
                                    <FaSave /> Lưu định lượng
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecipeModal;
