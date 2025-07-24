import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaTrash, FaSave } from 'react-icons/fa';
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
  const location = useLocation();

  useEffect(() => {
    fetchInventoryList();
  }, []);

  // ✅ SỬA: Chỉ handle prefilled sau khi có inventoryList
  useEffect(() => {
    if (inventoryList.length > 0) {
      handlePrefilledData();
    }
  }, [inventoryList]);

  const handlePrefilledData = () => {
    const { prefilledItem, prefilledItems } = location.state || {};

    if (prefilledItem) {
      // ✅ TÌM INVENTORY ĐỂ LẤY SUPPLIER
      const inventory = inventoryList.find(inv => inv._id === prefilledItem.inventory_id);
      
      setItems([{
        inventory_id: prefilledItem.inventory_id,
        supplier: inventory?.supplier || '', // ✅ LẤY SUPPLIER TỪ INVENTORY
        unit: prefilledItem.unit,
        quantity: prefilledItem.suggestedQuantity,
        unit_price: 0
      }]);
      setContent(`Nhập hàng đề xuất: ${prefilledItem.name}`);
    } else if (prefilledItems && prefilledItems.length > 0) {
      const prefilledItemsWithSupplier = prefilledItems.map(item => {
        // ✅ TÌM INVENTORY ĐỂ LẤY SUPPLIER CHO TỪNG ITEM
        const inventory = inventoryList.find(inv => inv._id === item.inventory_id);
        return {
          inventory_id: item.inventory_id,
          supplier: inventory?.supplier || '', // ✅ LẤY SUPPLIER TỪ INVENTORY
          unit: item.unit,
          quantity: item.suggestedQuantity,
          unit_price: 0
        };
      });
      
      setItems(prefilledItemsWithSupplier);
      setContent(`Nhập hàng đề xuất: ${prefilledItems.length} nguyên liệu`);
    }
  };

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
        supplier: selected?.supplier || newItems[index].supplier // ✅ GIỮ SUPPLIER CŨ NẾU KHÔNG CÓ MỚI
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung phiếu nhập');
      return;
    }

    const validItems = items.filter(item => 
      item.inventory_id && item.supplier && item.quantity > 0 && item.unit_price > 0
    );

    if (validItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất một nguyên liệu hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/import-receipt/create', {
        content: content.trim(),
        items: validItems
      }, { withCredentials: true });

      if (response.data.success) {
        toast.success('Tạo phiếu nhập thành công!');
        navigate('/chef/import-receipts');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi tạo phiếu nhập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-container">
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/chef/import-receipts')}>
          <FaArrowLeft /> Quay lại
        </button>
        <h1>Tạo Phiếu Nhập Hàng</h1>
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        <div className="section">
          <h3>Thông tin cơ bản</h3>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập nội dung ghi chú..."
            rows="3"
            required
          />
        </div>

        <div className="section">
          <div className="section-header">
            <h3>Danh sách nguyên liệu</h3>
            <button type="button" className="btn-add-row" onClick={addRow}>
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
                  <tr key={index} className={item.inventory_id && location.state ? 'prefilled-row' : ''}>
                    <td>{index + 1}</td>
                    <td>
                      <select 
                        value={item.inventory_id} 
                        onChange={(e) => handleItemChange(index, 'inventory_id', e.target.value)}
                        required
                      >
                        <option value="">-- Chọn nguyên liệu --</option>
                        {inventoryList.map(inv => (
                          <option key={inv._id} value={inv._id}>{inv.name}</option>
                        ))}
                      </select>
                      {item.inventory_id && location.state && (
                        <span className="suggested-badge">Đề xuất</span>
                      )}
                    </td>
                    <td>
                      <input 
                        type="text"
                        value={item.supplier} // ✅ QUAN TRỌNG: PHẢI CÓ VALUE
                        onChange={(e) => handleItemChange(index, 'supplier', e.target.value)}
                        placeholder="Nhà cung cấp"
                        required
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
                        className={location.state ? 'suggested-value' : ''}
                        required
                      />
                    </td>
                    <td>
                      <input 
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        min="0"
                        step="1000"
                        placeholder="Nhập giá"
                        className={item.unit_price === 0 && location.state ? 'required-field' : ''}
                        required
                      />
                    </td>
                    <td className="amount">
                      {(item.quantity * item.unit_price).toLocaleString('vi-VN')} VND
                    </td>
                    <td>
                      <button 
                        type="button"
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

        <div className="section">
          <div className="total-section">
            <h3>Tổng cộng: {calculateTotal().toLocaleString('vi-VN')} VND</h3>
          </div>
          
          <div className="actions">
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={() => navigate('/chef/import-receipts')}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              <FaSave /> {loading ? 'Đang lưu...' : 'Tạo phiếu nhập'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ImportReceiptCreate;
