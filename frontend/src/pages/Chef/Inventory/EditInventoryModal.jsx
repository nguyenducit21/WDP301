// pages/Chef/Inventory/EditInventoryModal.jsx - CÓ THÊM STORAGETYPE
import React, { useState, useEffect } from 'react';
import './Modal.css';

const EditInventoryModal = ({ isOpen, onClose, onSubmit, inventory }) => {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    costperunit: '',
    supplier: '',
    minstocklevel: '',
    storageType: 'perishable' // ✅ THÊM STORAGETYPE
  });

  const units = ['kg', 'g', 'lít', 'ml', 'cái', 'gói', 'lon', 'hộp', 'thùng'];
  
  // ✅ THÊM DANH SÁCH LOẠI BẢO QUẢN
  const storageTypes = [
    { value: 'perishable', label: '🥬 Tươi sống (2 ngày)', description: 'Rau củ tươi, bánh phở, thực phẩm dễ hỏng' },
    { value: 'semi_perishable', label: '🥩 Bán tươi (4 ngày)', description: 'Thịt, cá, hải sản tươi' },
    { value: 'dry', label: '🌾 Khô/đông lạnh (7 ngày)', description: 'Gia vị, ngũ cốc, đồ khô, đông lạnh' }
  ];

  useEffect(() => {
    if (inventory) {
      setFormData({
        name: inventory.name,
        unit: inventory.unit,
        costperunit: inventory.costperunit.toString(),
        supplier: inventory.supplier,
        minstocklevel: inventory.minstocklevel.toString(),
        storageType: inventory.storageType || 'perishable' // ✅ THÊM STORAGETYPE VỚI FALLBACK
      });
    }
  }, [inventory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.unit || !formData.costperunit || !formData.supplier || !formData.storageType) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    const submitData = {
      name: formData.name,
      unit: formData.unit,
      costperunit: parseFloat(formData.costperunit),
      supplier: formData.supplier,
      minstocklevel: parseInt(formData.minstocklevel),
      storageType: formData.storageType // ✅ THÊM STORAGETYPE
    };

    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Chỉnh Sửa Nguyên Liệu</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="info-note">
            <p><strong>Lưu ý:</strong> Không thể sửa số lượng tồn kho trực tiếp. 
            Để thay đổi số lượng, sử dụng chức năng "Nhập hàng" hoặc "Kiểm kho".</p>
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
              <label>Giá/Đơn vị (VND) *</label>
              <input
                type="number"
                name="costperunit"
                value={formData.costperunit}
                onChange={handleChange}
                placeholder="Nhập giá"
                min="0"
                step="0.01"
                required
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
            <label>Mức tối thiểu (cần mua khi dưới mức này)</label>
            <input
              type="number"
              name="minstocklevel"
              value={formData.minstocklevel}
              onChange={handleChange}
              placeholder="10"
              min="0"
            />
            <small>Khi số lượng tồn kho dưới mức này, hệ thống sẽ cảnh báo cần mua thêm.</small>
          </div>

          <div className="current-stock-info">
            <p><strong>Số lượng hiện tại:</strong> {inventory?.currentstock} {inventory?.unit}</p>
            <p><strong>Loại bảo quản hiện tại:</strong> {storageTypes.find(t => t.value === inventory?.storageType)?.label || 'Chưa xác định'}</p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Cập Nhật
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditInventoryModal;
