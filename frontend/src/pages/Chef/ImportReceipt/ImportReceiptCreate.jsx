import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from '../../../utils/axios.customize';
import './ImportReceiptCreate.css';

const ImportReceiptCreate = () => {
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [items, setItems] = useState([
    { inventory_id: '', supplier: '', unit: '', quantity: 1, unit_price: 0 }
  ]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInventoryList();
  }, []);

  const fetchInventoryList = async () => {
    try {
      const response = await axios.get('/inventory', { withCredentials: true });
      if (response.data.success) {
        setInventoryList(response.data.data || []);
      }
    } catch (error) {
      toast.error('Không thể tải danh sách nguyên liệu');
      if (error.response?.status === 401) navigate('/login');
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    
    if (field === 'inventory_id') {
      const selected = inventoryList.find(i => i._id === value);
      newItems[index] = {
        ...newItems[index],
        inventory_id: value,
        unit: selected?.unit || '',
        supplier: selected?.supplier || newItems[index].supplier
      };
    } else {
      newItems[index][field] = ['quantity', 'unit_price'].includes(field) 
        ? Number(value) || 0 
        : value;
    }
    setItems(newItems);
  };

  const addRow = () => {
    setItems([...items, { inventory_id: '', supplier: '', unit: '', quantity: 1, unit_price: 0 }]);
  };

  const removeRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async () => {
    const validItems = items.filter(item => 
      item.inventory_id && item.supplier.trim() && item.quantity > 0
    );

    if (validItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất một nguyên liệu hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        content: content.trim() || 'Phiếu nhập hàng',
        items: validItems.map(item => ({
          inventory_id: item.inventory_id,
          supplier: item.supplier.trim(),
          unit: item.unit,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total_price: Number(item.quantity) * Number(item.unit_price)
        }))
      };

      const response = await axios.post('/import-receipt/create', payload, { 
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data?.success) {
        toast.success('Thêm phiếu nhập thành công!');
        navigate('/chef/import-receipts');
      } else {
        toast.error(response.data?.message || 'Lỗi tạo phiếu nhập');
      }
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || 'Lỗi không xác định';
      
      if (status === 401) {
        toast.error('Phiên đăng nhập hết hạn');
        navigate('/login');
      } else {
        toast.error(`Lỗi ${status || ''}: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-container">
      {/* Header */}
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/chef/import-receipts')}>
          <FaArrowLeft /> Quay lại
        </button>
        <h1>Tạo Phiếu Nhập Hàng</h1>
      </div>

      <div className="form-container">
        {/* Basic Info */}
        <div className="section">
          <h3>Thông tin cơ bản</h3>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập nội dung ghi chú..."
            rows="3"
          />
        </div>

        {/* Items */}
        <div className="section">
          <div className="section-header">
            <h3>Danh sách nguyên liệu</h3>
            <button className="btn-add-row" onClick={addRow}>
              <FaPlus /> Thêm dòng
            </button>
          </div>
          
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên Nguyên Liệu</th>
                  <th>Nhà Cung Cấp</th>
                  <th>Đơn Vị</th>
                  <th>Số Lượng</th>
                  <th>Đơn Giá</th>
                  <th>Thành Tiền</th>
                  <th>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <select 
                        value={item.inventory_id}
                        onChange={(e) => handleItemChange(index, 'inventory_id', e.target.value)}
                      >
                        <option value="">-- Chọn nguyên liệu --</option>
                        {inventoryList.map(inv => (
                          <option key={inv._id} value={inv._id}>{inv.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input 
                        type="text"
                        value={item.supplier}
                        onChange={(e) => handleItemChange(index, 'supplier', e.target.value)}
                        placeholder="Nhà cung cấp"
                      />
                    </td>
                    <td className="unit">{item.unit}</td>
                    <td>
                      <input 
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input 
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        min="0"
                        step="1000"
                      />
                    </td>
                    <td className="amount">
                      {(item.quantity * item.unit_price).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      <button 
                        className="btn-remove"
                        onClick={() => removeRow(index)}
                        disabled={items.length === 1}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total */}
        <div className="total-section">
          <div className="total-row">
            <span>Tổng tiền nhập hàng:</span>
            <span className="total-value">{calculateTotal().toLocaleString('vi-VN')} VND</span>
          </div>
        </div>

        {/* Actions */}
        <div className="actions">
          <button 
            className="btn btn-outline"
            onClick={() => navigate('/chef/import-receipts')}
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : 'Tạo phiếu nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportReceiptCreate;
