import React, { useEffect, useState } from 'react';
import customFetch from '../../utils/axios.customize';
import './PromotionManagement.css';

const defaultPromotionForm = {
  code: '',
  type: 'percent',
  value: '',
  minOrderValue: '',
  maxDiscount: '',
  startDate: '',
  endDate: '',
  usageLimit: '',
  isActive: true,
  description: '',
};

const PromotionManagement = () => {
  const [listPromotions, setListPromotions] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [currentForm, setCurrentForm] = useState(defaultPromotionForm);
  const [currentEditId, setCurrentEditId] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadPromotions = async () => {
    setLoadingData(true);
    try {
      const response = await customFetch.get('/promotions');
      setListPromotions(response.data.data || []);
    } catch {
      setErrorMsg('Không thể tải danh sách khuyến mại!');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const updateFormField = (e) => {
    const { name, type, value, checked } = e.target;
    setCurrentForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setCurrentForm(defaultPromotionForm);
    setCurrentEditId(null);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (currentEditId) {
        await customFetch.put(`/promotions/${currentEditId}`, currentForm);
        setSuccessMsg('Cập nhật khuyến mại thành công!');
      } else {
        await customFetch.post('/promotions', currentForm);
        setSuccessMsg('Tạo khuyến mại mới thành công!');
      }
      resetForm();
      loadPromotions();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Lỗi khi lưu khuyến mại');
    }
  };

  const startEditing = (promotion) => {
    setCurrentForm({
      ...promotion,
      startDate: promotion.startDate?.slice(0, 10) || '',
      endDate: promotion.endDate?.slice(0, 10) || '',
    });
    setCurrentEditId(promotion._id);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const confirmAndRemove = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa khuyến mại này?')) return;
    try {
      await customFetch.delete(`/promotions/${id}`);
      setSuccessMsg('Xóa khuyến mại thành công!');
      loadPromotions();
    } catch {
      setErrorMsg('Lỗi khi xóa khuyến mại!');
    }
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  return (
    <div className="promo-manage-wrapper">
      <h2>Quản lý Khuyến mại</h2>

      <form className="promo-form" onSubmit={submitForm}>
        <div className="input-group">
          <input
            type="text"
            name="code"
            placeholder="Mã khuyến mại"
            value={currentForm.code}
            onChange={updateFormField}
            required
          />

          <select name="type" value={currentForm.type} onChange={updateFormField}>
            <option value="percent">Giảm %</option>
            <option value="fixed">Giảm số tiền</option>
            <option value="first_order">Đơn hàng đầu</option>
          </select>

          <input
            type="number"
            name="value"
            min={0}
            placeholder="Giá trị"
            value={currentForm.value}
            onChange={updateFormField}
            required
          />

          <input
            type="number"
            name="minOrderValue"
            min={0}
            placeholder="Đơn hàng tối thiểu"
            value={currentForm.minOrderValue}
            onChange={updateFormField}
          />

          <input
            type="number"
            name="maxDiscount"
            min={0}
            placeholder="Giảm tối đa"
            value={currentForm.maxDiscount}
            onChange={updateFormField}
          />

          <input
            type="number"
            name="usageLimit"
            min={0}
            placeholder="Số lượt sử dụng"
            value={currentForm.usageLimit}
            onChange={updateFormField}
          />

          <input
            type="date"
            name="startDate"
            value={currentForm.startDate}
            onChange={updateFormField}
            required
          />

          <input
            type="date"
            name="endDate"
            value={currentForm.endDate}
            onChange={updateFormField}
            required
          />

          <input
            type="text"
            name="description"
            placeholder="Mô tả"
            value={currentForm.description}
            onChange={updateFormField}
          />

          <label>
            <input
              type="checkbox"
              name="isActive"
              checked={currentForm.isActive}
              onChange={updateFormField}
            />{' '}
            Kích hoạt
          </label>
        </div>

        <div className="btn-group">
          <button type="submit" disabled={loadingData}>
            {currentEditId ? 'Cập nhật' : 'Thêm mới'}
          </button>
          {currentEditId && (
            <button type="button" onClick={resetForm} className="btn-cancel">
              Hủy
            </button>
          )}
        </div>

        {errorMsg && <p className="message error">{errorMsg}</p>}
        {successMsg && <p className="message success">{successMsg}</p>}
      </form>

      <table className="promo-table">
        <thead>
          <tr>
            <th>Mã</th>
            <th>Loại</th>
            <th>Giá trị</th>
            <th>Đơn tối thiểu</th>
            <th>Giảm tối đa</th>
            <th>Số lượt</th>
            <th>Đã dùng</th>
            <th>Ngày bắt đầu</th>
            <th>Ngày kết thúc</th>
            <th>Kích hoạt</th>
            <th>Mô tả</th>
            <th>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {listPromotions.map((promotion) => (
            <tr
              key={promotion._id}
              className={promotion.isActive ? 'row-active' : 'row-inactive'}
            >
              <td>{promotion.code}</td>
              <td>{promotion.type}</td>
              <td>{promotion.value}</td>
              <td>{promotion.minOrderValue ?? '-'}</td>
              <td>{promotion.maxDiscount ?? '-'}</td>
              <td>{promotion.usageLimit ?? '-'}</td>
              <td>{promotion.usedCount ?? 0}</td>
              <td>{formatDateString(promotion.startDate)}</td>
              <td>{formatDateString(promotion.endDate)}</td>
              <td>{promotion.isActive ? '✔️' : '❌'}</td>
              <td>{promotion.description || '-'}</td>
              <td>
                <button
                  className="btn-edit"
                  onClick={() => startEditing(promotion)}
                  title="Sửa khuyến mại"
                >
                  Sửa
                </button>
                <button
                  className="btn-delete"
                  onClick={() => confirmAndRemove(promotion._id)}
                  title="Xóa khuyến mại"
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}

          {listPromotions.length === 0 && (
            <tr>
              <td colSpan="12" style={{ textAlign: 'center', padding: 16 }}>
                Không có khuyến mại nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PromotionManagement;
