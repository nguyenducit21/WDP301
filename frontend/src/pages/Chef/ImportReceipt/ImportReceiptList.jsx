// pages/Chef/ImportReceipt/ImportReceiptList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaFilePdf, FaFilter, FaRedo, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from '../../../utils/axios.customize';
import './ImportReceiptList.css';

const ImportReceiptList = () => {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        from: '',
        to: '',
        staff: '',
        entriesPerPage: 10,
        showFilter: false
    });
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();

    useEffect(() => {
        fetchReceipts();
    }, [filters.search, filters.from, filters.to, filters.staff]);

    const fetchReceipts = async () => {
        setLoading(true);
        try {
            const params = {};
            
            if (filters.search) params.search = filters.search;
            if (filters.from) params.from = filters.from;
            if (filters.to) params.to = filters.to;
            if (filters.staff) params.staff = filters.staff;

            const response = await axios.get('/import-receipt', { 
                params,
                withCredentials: true 
            });

            if (response.data.success) {
                setReceipts(response.data.data || []);
            } else {
                toast.error('Không thể tải danh sách phiếu nhập');
            }
        } catch (error) {
            console.error('Fetch receipts error:', error);
            if (error.response?.status === 401) {
                toast.error('Bạn cần đăng nhập để xem danh sách');
                navigate('/login');
            } else {
                toast.error('Lỗi khi tải danh sách phiếu nhập');
            }
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ✅ Hiển thị receipt_code format PN202506001
    const getReceiptCode = (receipt) => {
        return receipt.receipt_code || 'N/A';
    };

    const handleSearch = (value) => {
        setFilters(prev => ({ ...prev, search: value }));
        setCurrentPage(1);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleEntriesChange = (value) => {
        setFilters(prev => ({ ...prev, entriesPerPage: parseInt(value) }));
        setCurrentPage(1);
    };

    const resetFilters = () => {
        setFilters({
            search: '',
            from: '',
            to: '',
            staff: '',
            entriesPerPage: 10,
            showFilter: false
        });
        setCurrentPage(1);
    };

    const toggleFilter = () => {
        setFilters(prev => ({ ...prev, showFilter: !prev.showFilter }));
    };

    const handleExportPDF = async (receipt) => {
        try {
            toast.info('Đang tạo file PDF...');
            
            const response = await axios.get(`/import-receipt/${receipt._id}/export-pdf`, {
                responseType: 'blob',
                withCredentials: true
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            // ✅ Sử dụng receipt_code cho tên file
            link.setAttribute('download', `${receipt.receipt_code}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Xuất PDF thành công!');
        } catch (error) {
            console.error('Export PDF error:', error);
            toast.error('Không thể xuất PDF. Vui lòng thử lại sau.');
        }
    };

    // Phân trang
    const totalPages = Math.ceil(receipts.length / filters.entriesPerPage);
    const startIndex = (currentPage - 1) * filters.entriesPerPage;
    const endIndex = startIndex + filters.entriesPerPage;
    const currentReceipts = receipts.slice(startIndex, endIndex);

    return (
        <div className="import-receipt-container">
            {/* Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1 className="page-title">Quản Lý Phiếu Nhập Hàng</h1>
                    <p className="page-subtitle">Danh sách phiếu nhập hàng</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-outline" onClick={toggleFilter}>
                        <FaFilter /> Lọc
                    </button>
                    <button className="btn btn-outline" onClick={resetFilters}>
                        <FaRedo /> Reset
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={() => navigate('/chef/import-receipts/create')}
                    >
                        <FaPlus /> Thêm Phiếu Nhập
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {filters.showFilter && (
                <div className="filter-panel">
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Từ ngày:</label>
                            <input 
                                type="date" 
                                value={filters.from}
                                onChange={(e) => handleFilterChange('from', e.target.value)}
                                className="filter-input" 
                            />
                        </div>
                        <div className="filter-group">
                            <label>Đến ngày:</label>
                            <input 
                                type="date" 
                                value={filters.to}
                                onChange={(e) => handleFilterChange('to', e.target.value)}
                                className="filter-input" 
                            />
                        </div>
                        <div className="filter-group">
                            <label>Nhân viên:</label>
                            <input 
                                type="text" 
                                placeholder="Tìm theo tên nhân viên" 
                                value={filters.staff}
                                onChange={(e) => handleFilterChange('staff', e.target.value)}
                                className="filter-input" 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Table Controls */}
            <div className="table-controls">
                <div className="entries-control">
                    <span>Hiển thị</span>
                    <select 
                        value={filters.entriesPerPage}
                        onChange={(e) => handleEntriesChange(e.target.value)}
                        className="entries-select"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span>mục</span>
                </div>

                <div className="search-control">
                    <span>Tìm kiếm:</span>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="search-input"
                        placeholder="Nhập mã phiếu hoặc nội dung..."
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <table className="receipt-table">
                        <thead>
                            <tr>
                                <th>Mã Phiếu</th>
                                <th>Nhân Viên</th>
                                <th>Tổng Tiền</th>
                                <th>Ngày Lập</th>
                                <th>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="no-data">
                                        <div className="empty-state">
                                            <p>Không có phiếu nhập nào</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentReceipts.map((receipt) => (
                                <tr key={receipt._id}>
                                    <td>
                                        {/* ✅ Hiển thị mã phiếu PN202506001 */}
                                        <span className="receipt-number">
                                            {getReceiptCode(receipt)}
                                        </span>
                                    </td>
                                    <td>{receipt.staff_id?.full_name || 'N/A'}</td>
                                    <td className="amount">{formatCurrency(receipt.total_amount)}</td>
                                    <td>{formatDate(receipt.created_at)}</td>
                                    <td className="actions">
                                        <button 
                                            className="action-btn view-btn"
                                            onClick={() => navigate(`/chef/import-receipts/${receipt._id}`)}
                                            title="Xem chi tiết"
                                        >
                                            <FaEye />
                                        </button>
                                        <button 
                                            className="action-btn pdf-btn"
                                            onClick={() => handleExportPDF(receipt)}
                                            title="Xuất PDF"
                                        >
                                            <FaFilePdf />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer */}
            <div className="table-footer">
                <div className="table-info">
                    <span>
                        Hiển thị {startIndex + 1} - {Math.min(endIndex, receipts.length)} 
                        trong tổng số {receipts.length} phiếu nhập
                    </span>
                </div>
                
                {totalPages > 1 && (
                    <div className="pagination">
                        <button 
                            className="page-btn"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            ← Trước
                        </button>
                        
                        {[...Array(totalPages)].map((_, index) => {
                            const pageNum = index + 1;
                            if (
                                pageNum === 1 || 
                                pageNum === totalPages || 
                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={pageNum}
                                        className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            } else if (
                                pageNum === currentPage - 2 || 
                                pageNum === currentPage + 2
                            ) {
                                return <span key={pageNum} className="page-dots">...</span>;
                            }
                            return null;
                        })}
                        
                        <button 
                            className="page-btn"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Sau →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportReceiptList;
