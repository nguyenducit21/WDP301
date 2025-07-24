// pages/Chef/ImportReceipt/ImportReceiptDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPrint, FaDownload, FaFileAlt } from 'react-icons/fa';
import axios from '../../../utils/axios.customize';
import { toast } from 'react-toastify';
import './ImportReceiptDetail.css';

const ImportReceiptDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReceiptDetail();
  }, [id]);

  const fetchReceiptDetail = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/import-receipt/${id}`, {
        withCredentials: true
      });

      if (response.data.success) {
        setReceipt(response.data.data);
      } else {
        toast.error('Không thể tải chi tiết phiếu nhập');
        navigate('/chef/import-receipts');
      }
    } catch (error) {
      console.error('Fetch receipt detail error:', error);
      if (error.response?.status === 401) {
        toast.error('Bạn cần đăng nhập để xem chi tiết');
        navigate('/login');
      } else if (error.response?.status === 404) {
        toast.error('Không tìm thấy phiếu nhập');
        navigate('/chef/import-receipts');
      } else {
        toast.error('Lỗi khi tải chi tiết phiếu nhập');
        navigate('/chef/import-receipts');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  const formatDate = (date) => new Date(date).toLocaleString('vi-VN');

  // ✅ Hiển thị mã phiếu thực tế từ database
  const getReceiptCode = () => {
    return receipt?.receipt_code || 'N/A';
  };

  const handlePrint = () => {
    document.body.classList.add('printing');

    const elementsToHide = [
      '.detail-header',
      '.sidebar',
      '.chef-sidebar',
      '.navbar',
      '.navigation'
    ];

    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = 'none';
      });
    });

    window.print();

    setTimeout(() => {
      document.body.classList.remove('printing');
      elementsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.style.display = '';
        });
      });
    }, 1000);
  };

  const handleDownloadDetail = async () => {
    try {
      toast.info('Đang tạo file chi tiết...');

      const response = await axios.get(`/import-receipt/${id}/download-detail`, {
        responseType: 'blob',
        withCredentials: true
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // ✅ Sử dụng mã phiếu thực tế cho tên file
      link.setAttribute('download', `chi-tiet-${getReceiptCode()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Tải file chi tiết thành công!');
    } catch (error) {
      console.error('Download detail error:', error);
      toast.error('Không thể tải file chi tiết. Vui lòng thử lại sau.');
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.info('Đang tạo file Excel...');

      const response = await axios.get(`/import-receipt/${id}/export-excel`, {
        responseType: 'blob',
        withCredentials: true
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // ✅ Sử dụng mã phiếu thực tế cho tên file
      link.setAttribute('download', `${getReceiptCode()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Xuất Excel thành công!');
    } catch (error) {
      console.error('Export Excel error:', error);
      toast.error('Không thể xuất Excel. Vui lòng thử lại sau.');
    }
  };

  if (loading) {
    return (
      <div className="import-receipt-detail">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải chi tiết phiếu nhập...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="import-receipt-detail">
        <div className="error-container">
          <h2>Không tìm thấy phiếu nhập</h2>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/chef/import-receipts')}
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="import-receipt-detail">
      {/* Header Actions */}
      <div className="detail-header">
        <button
          className="back-btn"
          onClick={() => navigate('/chef/import-receipts')}
        >
          <FaArrowLeft /> Quay lại danh sách
        </button>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={handlePrint}>
            <FaPrint /> In phiếu nhập
          </button>
        </div>
      </div>

      {/* Receipt Container */}
      <div className="receipt-container">
        {/* Receipt Header */}
        <div className="receipt-header">
          <div className="company-info">
            <h1>PHIẾU NHẬP HÀNG</h1>
            <p>Chi tiết nhập hàng - Hệ thống quản lý nhà hàng</p>
          </div>
          <div className="receipt-meta">
            {/* ✅ Hiển thị mã phiếu thực tế */}
            <div className="receipt-number">
              {getReceiptCode()}
            </div>
            <div className="receipt-date">
              {formatDate(receipt.created_at)}
            </div>
            {/* ✅ Hiển thị ObjectId riêng cho technical reference */}
            <div className="system-id">
              <small>ID: {receipt._id}</small>
            </div>
          </div>
        </div>

        {/* General Information */}
        <div className="receipt-info">
          <h3>Thông tin phiếu nhập</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Mã phiếu:</label>
              {/* ✅ Hiển thị mã phiếu thực tế */}
              <span className="receipt-display-number">{getReceiptCode()}</span>
            </div>
            <div className="info-item">
              <label>ID hệ thống:</label>
              {/* ✅ Hiển thị ObjectId cho technical reference */}
              <span className="system-id-text">{receipt._id}</span>
            </div>
            <div className="info-item">
              <label>Người lập phiếu:</label>
              <span>{receipt.staff_id?.full_name || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Ngày nhập hàng:</label>
              <span>{formatDate(receipt.created_at)}</span>
            </div>
            <div className="info-item">
              <label>Tổng số mặt hàng:</label>
              <span>{receipt.items?.length || 0} loại</span>
            </div>
          </div>

          {receipt.content && (
            <div className="info-item full-width">
              <label>Ghi chú:</label>
              <span className="content-text">{receipt.content}</span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="items-section">
          <h3>Chi tiết hàng hóa nhập kho</h3>
          <div className="table-wrapper">
            <table className="items-table">
              <thead>
                <tr>
                  <th width="5%">STT</th>
                  <th width="25%">Tên Hàng Hóa</th>
                  <th width="15%">Nhà Cung Cấp</th>
                  <th width="10%">Đơn Vị</th>
                  <th width="12%">Số Lượng</th>
                  <th width="15%">Đơn Giá</th>
                  <th width="18%">Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-center">{idx + 1}</td>
                    <td className="ingredient-name">
                      {item.inventory_id?.ingredient_name ||
                        item.inventory_id?.name ||
                        'N/A'}
                    </td>
                    <td>{item.supplier}</td>
                    <td className="text-center">{item.unit}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="text-right amount">
                      {formatCurrency(item.total_price || (item.quantity * item.unit_price))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="summary-section">
          <div className="summary-row">
            <span className="summary-label">Tổng số loại hàng:</span>
            <span className="summary-value">{receipt.items?.length || 0}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Tổng số lượng nhập:</span>
            <span className="summary-value">
              {receipt.items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0}
            </span>
          </div>
          <div className="summary-row total">
            <span className="summary-label">Tổng giá trị nhập:</span>
            <span className="summary-value">{formatCurrency(receipt.total_amount)}</span>
          </div>
        </div>

        {/* Signatures - Chỉ 1 chữ ký */}
        <div className="signatures-section">
          <div className="signature-box">
            <div className="signature-title">Người lập phiếu</div>
            <div className="signature-content">
              <div className="signature-name">{receipt.staff_id?.full_name || 'N/A'}</div>
              <div className="signature-line"></div>
              <div className="signature-label">Ký tên</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="receipt-footer">
          <p>Phiếu nhập hàng - Không phải hóa đơn bán hàng</p>
          <p>File chi tiết được tạo ngày: {new Date().toLocaleString('vi-VN')}</p>
        </div>
      </div>
    </div>
  );
};

export default ImportReceiptDetail;
