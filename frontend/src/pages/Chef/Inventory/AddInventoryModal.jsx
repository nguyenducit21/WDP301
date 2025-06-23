// pages/Chef/Inventory/AddInventoryModal.jsx - CÓ THÊM STORAGETYPE
import React, { useState } from 'react';
import './Modal.css';

const AddInventoryModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    supplier: '',
    minstocklevel: '10',
    storageType: 'perishable' // ✅ THÊM STORAGETYPE MẶC ĐỊNH
  });

  const units = ['kg', 'g', 'lít', 'ml', 'cái', 'gói', 'lon', 'hộp', 'thùng'];
  
  // ✅ THÊM DANH SÁCH LOẠI BẢO QUẢN
  const storageTypes = [
    { value: 'perishable', label: '🥬 Tươi sống (2 ngày)', description: 'Rau củ tươi, bánh phở, thực phẩm dễ hỏng' },
    { value: 'semi_perishable', label: '🥩 Bán tươi (4 ngày)', description: 'Thịt, cá, hải sản tươi' },
    { value: 'dry', label: '🌾 Khô/đông lạnh (7 ngày)', description: 'Gia vị, ngũ cốc, đồ khô, đông lạnh' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.unit || !formData.supplier || !formData.storageType) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      unit: formData.unit,
      supplier: formData.supplier.trim(),
      minstocklevel: parseInt(formData.minstocklevel) || 10,
      storageType: formData.storageType, // ✅ THÊM STORAGETYPE
      costperunit: 0,
      currentstock: 0
    };

    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Thêm Nguyên Liệu Mới</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="info-note">
            <p><strong>Lưu ý:</strong> Nguyên liệu mới sẽ có số lượng = 0 và giá = 0. 
            Giá và số lượng sẽ được cập nhật khi bạn nhập hàng lần đầu tiên.</p>
          </div>

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

          {/* ✅ THÊM TRƯỜNG LOẠI BẢO QUẢN */}
          <div className="form-group">
            <label>Loại bảo quản *</label>
            <select
              name="storageType"
              value={formData.storageType}
              onChange={handleChange}
              required
              className="storage-type-select"
            >
              {storageTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <small className="storage-description">
              {storageTypes.find(t => t.value === formData.storageType)?.description}
            </small>
          </div>

          <div className="form-row">
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

            <div className="form-group">
              <label>Mức tối thiểu</label>
              <input
                type="number"
                name="minstocklevel"
                value={formData.minstocklevel}
                onChange={handleChange}
                placeholder="10"
                min="0"
              />
              <small>Cảnh báo khi số lượng dưới mức này</small>
            </div>
          </div>

          <div className="form-group">
            <label>Nhà cung cấp mặc định *</label>
            <input
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              placeholder="Tên nhà cung cấp"
              required
            />
            <small>Có thể thay đổi khi nhập hàng</small>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Thêm Nguyên Liệu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInventoryModal;
