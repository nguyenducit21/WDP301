// pages/Chef/Recipe/RecipeModal.jsx
import React, { useState, useEffect } from 'react';
import axios from '../../../utils/axios.customize';
import { toast } from 'react-toastify';

const RecipeModal = ({ isOpen, onClose, onSave, menuItem, inventories }) => {
    const [recipe, setRecipe] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalCost, setTotalCost] = useState(0);

    useEffect(() => {
        if (isOpen && menuItem) {
            fetchExistingRecipe();
        }
    }, [isOpen, menuItem]);

    useEffect(() => {
        calculateTotalCost();
    }, [recipe]);

    // Trong fetchExistingRecipe function
const fetchExistingRecipe = async () => {
    setLoading(true);
    try {
        console.log('Fetching recipe for:', menuItem._id); // Debug
        
        // Sửa endpoint này
        const res = await axios.get(`/recipes/menu-items/${menuItem._id}`, { withCredentials: true });
        console.log('Recipe response:', res.data); // Debug
        
        if (res.data.success && res.data.data.length > 0) {
            const existingRecipe = res.data.data.map(item => ({
                inventory_id: item.inventory_id._id,
                inventory_name: item.inventory_id.name,
                quantity_needed: item.quantity_needed,
                unit: item.unit,
                cost_per_serving: item.cost_per_serving,
                is_main_ingredient: item.is_main_ingredient
            }));
            setRecipe(existingRecipe);
        } else {
            console.log('No existing recipe found');
            setRecipe([]);
        }
    } catch (error) {
        console.error('Error fetching recipe:', error);
        console.error('Error details:', error.response?.data); // Debug chi tiết
        setRecipe([]);
    }
    setLoading(false);
};


    const calculateTotalCost = () => {
        const total = recipe.reduce((sum, ingredient) => {
            const inventory = inventories.find(inv => inv._id === ingredient.inventory_id);
            if (inventory) {
                return sum + (ingredient.quantity_needed * inventory.cost_per_unit);
            }
            return sum;
        }, 0);
        setTotalCost(total);
    };

    const addIngredient = () => {
        setRecipe([...recipe, {
            inventory_id: '',
            inventory_name: '',
            quantity_needed: 0,
            unit: '',
            cost_per_serving: 0,
            is_main_ingredient: false
        }]);
    };

    const updateIngredient = (index, field, value) => {
        const updatedRecipe = [...recipe];
        updatedRecipe[index][field] = value;

        // Nếu thay đổi nguyên liệu, cập nhật tên và đơn vị
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
        
        // Validation
        const validRecipe = recipe.filter(ingredient => 
            ingredient.inventory_id && ingredient.quantity_needed > 0
        );

        if (validRecipe.length === 0) {
            toast.error('Vui lòng thêm ít nhất một nguyên liệu');
            return;
        }

        onSave(validRecipe);
    };

    const getInventoryStock = (inventoryId) => {
        const inventory = inventories.find(inv => inv._id === inventoryId);
        return inventory ? inventory.current_stock : 0;
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content recipe-modal">
                <div className="modal-header">
                    <h3>Công thức: {menuItem.name}</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="loading">Đang tải công thức...</div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="menu-item-info">
                                <img 
                                    src={menuItem.image?.startsWith('http') ? menuItem.image : `/uploads/${menuItem.image}`} 
                                    alt={menuItem.name}
                                    className="menu-item-image"
                                />
                                <div className="menu-item-details">
                                    <h4>{menuItem.name}</h4>
                                    <p>Giá bán: {menuItem.price.toLocaleString()} VND</p>
                                    <p>Chi phí NL dự kiến: {totalCost.toLocaleString()} VND</p>
                                    <p>Tỷ lệ chi phí: {menuItem.price > 0 ? (totalCost / menuItem.price * 100).toFixed(1) : 0}%</p>
                                </div>
                            </div>

                            <div className="ingredients-section">
                                <div className="section-header">
                                    <h4>Nguyên liệu cần thiết</h4>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={addIngredient}
                                    >
                                        Thêm nguyên liệu
                                    </button>
                                </div>

                                {recipe.length === 0 ? (
                                    <p className="no-ingredients">Chưa có nguyên liệu nào. Hãy thêm nguyên liệu đầu tiên!</p>
                                ) : (
                                    <div className="ingredients-list">
                                        {recipe.map((ingredient, index) => (
                                            <div key={index} className="ingredient-row">
                                                <div className="ingredient-select">
                                                    <select
                                                        value={ingredient.inventory_id}
                                                        onChange={(e) => updateIngredient(index, 'inventory_id', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Chọn nguyên liệu</option>
                                                        {inventories.map(inv => (
                                                            <option key={inv._id} value={inv._id}>
                                                                {inv.name} (Tồn: {inv.current_stock} {inv.unit})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="quantity-input">
                                                    <input
                                                        type="number"
                                                        placeholder="Số lượng"
                                                        value={ingredient.quantity_needed}
                                                        onChange={(e) => updateIngredient(index, 'quantity_needed', parseFloat(e.target.value) || 0)}
                                                        min="0"
                                                        step="0.01"
                                                        required
                                                    />
                                                    <span className="unit-label">{ingredient.unit}</span>
                                                </div>

                                                <div className="ingredient-cost">
                                                    {ingredient.inventory_id && ingredient.quantity_needed > 0 && (
                                                        <span>
                                                            {(ingredient.quantity_needed * 
                                                              (inventories.find(inv => inv._id === ingredient.inventory_id)?.cost_per_unit || 0)
                                                            ).toLocaleString()} VND
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="ingredient-options">
                                                    <label className="checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={ingredient.is_main_ingredient}
                                                            onChange={(e) => updateIngredient(index, 'is_main_ingredient', e.target.checked)}
                                                        />
                                                        Nguyên liệu chính
                                                    </label>
                                                </div>

                                                <button 
                                                    type="button"
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => removeIngredient(index)}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Lưu công thức
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
