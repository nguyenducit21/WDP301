// pages/Chef/Inventory/AddInventoryModal.jsx
import React, { useState } from 'react';

const AddInventoryModal = ({ isOpen, onClose, onSubmit, categories }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        unit: '',
        cost_per_unit: '',
        supplier: '',
        min_stock_level: '',
        current_stock: '0'
    });

    const units = ['kg', 'g', 'lít', 'ml', 'cái', 'gói', 'lon', 'hộp', 'thùng'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.name || !formData.category || !formData.unit || !formData.cost_per_unit || !formData.supplier) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        const submitData = {
            ...formData,
            cost_per_unit: parseFloat(formData.cost_per_unit),
            min_stock_level: parseInt(formData.min_stock_level) || 10,
            current_stock: parseInt(formData.current_stock) || 0
        };

        onSubmit(submitData);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Thêm nguyên liệu mới</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label>Tên nguyên liệu *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Nhập tên nguyên liệu"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Danh mục *</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Chọn danh mục</option>
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Đơn vị *</label>
                            <select
                                name="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Chọn đơn vị</option>
                                {units.map(unit => (
                                    <option key={unit} value={unit}>{unit}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Giá/đơn vị (VND) *</label>
                            <input
                                type="number"
                                name="cost_per_unit"
                                value={formData.cost_per_unit}
                                onChange={handleChange}
                                placeholder="0"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Mức tồn kho tối thiểu</label>
                            <input
                                type="number"
                                name="min_stock_level"
                                value={formData.min_stock_level}
                                onChange={handleChange}
                                placeholder="10"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Nhà cung cấp *</label>
                        <input
                            type="text"
                            name="supplier"
                            value={formData.supplier}
                            onChange={handleChange}
                            placeholder="Tên nhà cung cấp"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Số lượng ban đầu</label>
                        <input
                            type="number"
                            name="current_stock"
                            value={formData.current_stock}
                            onChange={handleChange}
                            placeholder="0"
                            min="0"
                        />
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Thêm nguyên liệu
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddInventoryModal;
