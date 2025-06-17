// pages/Chef/Inventory/ImportStockModal.jsx
import React, { useState } from 'react';

const ImportStockModal = ({ isOpen, onClose, onSubmit, inventory }) => {
    const [formData, setFormData] = useState({
        quantity: '',
        cost_per_unit: inventory?.cost_per_unit || ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.quantity || formData.quantity <= 0) {
            alert('Vui lòng nhập số lượng hợp lệ');
            return;
        }

        const submitData = {
            quantity: parseFloat(formData.quantity),
            cost_per_unit: parseFloat(formData.cost_per_unit) || inventory.cost_per_unit
        };

        onSubmit(submitData);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Nhập kho: {inventory.name}</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="inventory-info">
                        <p><strong>Tồn kho hiện tại:</strong> {inventory.current_stock} {inventory.unit}</p>
                        <p><strong>Giá hiện tại:</strong> {inventory.cost_per_unit.toLocaleString()} VND/{inventory.unit}</p>
                    </div>

                    <div className="form-group">
                        <label>Số lượng nhập *</label>
                        <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleChange}
                            placeholder={`Nhập số lượng (${inventory.unit})`}
                            min="0.01"
                            step="0.01"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Giá/đơn vị (VND)</label>
                        <input
                            type="number"
                            name="cost_per_unit"
                            value={formData.cost_per_unit}
                            onChange={handleChange}
                            placeholder="Giá mới (nếu thay đổi)"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    {formData.quantity && (
                        <div className="calculation-info">
                            <p><strong>Tồn kho sau nhập:</strong> {(inventory.current_stock + parseFloat(formData.quantity || 0)).toFixed(2)} {inventory.unit}</p>
                            <p><strong>Tổng giá trị nhập:</strong> {((parseFloat(formData.quantity || 0)) * (parseFloat(formData.cost_per_unit) || inventory.cost_per_unit)).toLocaleString()} VND</p>
                        </div>
                    )}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className="btn btn-success">
                            Nhập kho
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ImportStockModal;
