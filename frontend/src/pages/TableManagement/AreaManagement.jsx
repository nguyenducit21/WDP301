import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { AuthContext } from '../../context/AuthContext';
import './AreaManagement.css';
import axios from '../../utils/axios.customize';

const AreaManagement = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // States
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Utility function for safe object access
    const safeGet = (obj, path, defaultValue = null) => {
        try {
            return path.split('.').reduce((o, p) => o && o[p], obj) || defaultValue;
        } catch {
            return defaultValue;
        }
    };

    // Check authorization
    useEffect(() => {
        if (user !== null && user !== undefined) {
            const userRole = safeGet(user, 'user.role') || safeGet(user, 'role');
            const allowedRoles = ['admin', 'manager', 'waiter'];
            if (!userRole || !allowedRoles.includes(userRole)) {
                console.log('Unauthorized access, redirecting to login');
                navigate('/login');
            }
        }
    }, [user, navigate]);

    // API Functions
    const loadAreas = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/areas');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                setAreas(response.data.data);
            }
        } catch (error) {
            setError('Lỗi khi tải danh sách khu vực');
            console.error('Error loading areas:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadAreaDetails = useCallback(async (areaId) => {
        try {
            const response = await axios.get(`/areas/${areaId}`);
            if (response?.data?.success) {
                setSelectedArea(response.data.data);
            }
        } catch (error) {
            setError('Lỗi khi tải chi tiết khu vực');
            console.error('Error loading area details:', error);
        }
    }, []);

    // Load initial data
    useEffect(() => {
        loadAreas();
    }, [loadAreas]);

    // Event Handlers
    const handleAreaClick = async (area) => {
        setSelectedArea(area);
        await loadAreaDetails(area._id);
    };

    const openModal = (type, item = null) => {
        setModalType(type);
        setError('');

        if (type === 'create') {
            setFormData({
                name: '',
                description: ''
            });
        } else if (type === 'edit' && item) {
            setFormData({
                id: item._id,
                name: item.name || '',
                description: item.description || ''
            });
        } else if (type === 'delete' && item) {
            setFormData({
                id: item._id,
                name: item.name || '',
                tableCount: item.tableCount || 0
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalType('');
        setError('');
        setFormData({ name: '', description: '' });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;

            switch (modalType) {
                case 'create':
                    response = await axios.post('/areas', {
                        name: formData.name,
                        description: formData.description
                    });
                    alert('Tạo khu vực thành công');
                    break;

                case 'edit':
                    response = await axios.put(`/areas/${formData.id}`, {
                        name: formData.name,
                        description: formData.description
                    });
                    alert('Cập nhật khu vực thành công');
                    break;

                case 'delete':
                    response = await axios.delete(`/areas/${formData.id}`);
                    alert('Xóa khu vực thành công');
                    setSelectedArea(null);
                    break;

                default:
                    break;
            }

            // Refresh data after successful operation
            await loadAreas();
            closeModal();
        } catch (error) {
            console.error('Error submitting form:', error);
            setError(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    // Check if user can modify areas
    const canModify = () => {
        const userRole = safeGet(user, 'user.role') || safeGet(user, 'role');
        return ['admin', 'manager'].includes(userRole);
    };

    if (loading && areas.length === 0) {
        return (
            <div className="area-management">
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
                <div className="area-management-content" style={{
                    marginLeft: sidebarCollapsed ? '80px' : '250px',
                    transition: 'margin-left 0.2s'
                }}>
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="area-management">
            <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
            <div className="area-management-content" style={{
                marginLeft: sidebarCollapsed ? '80px' : '250px',
                transition: 'margin-left 0.2s'
            }}>
                <div className="area-management-header">
                    <h1>Quản lý khu vực</h1>
                    {canModify() && (
                        <button
                            className="action-button create"
                            onClick={() => openModal('create')}
                            disabled={loading}
                        >
                            Tạo khu vực mới
                        </button>
                    )}
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError('')} className="close-error">×</button>
                    </div>
                )}

                <div className="area-main-content">
                    <div className="areas-list">
                        <div className="areas-header">
                            <h3>Danh sách khu vực</h3>
                        </div>

                        {loading ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                                <p>Đang tải khu vực...</p>
                            </div>
                        ) : (
                            <div className="areas-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Tên khu vực</th>
                                            <th>Mô tả</th>
                                            <th>Số bàn</th>
                                            <th>Ngày tạo</th>
                                            {canModify() && <th>Thao tác</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {areas.map(area => (
                                            <tr
                                                key={area._id}
                                                className={selectedArea?._id === area._id ? 'selected' : ''}
                                                onClick={() => handleAreaClick(area)}
                                            >
                                                <td>
                                                    <strong>{area.name}</strong>
                                                </td>
                                                <td>{area.description || 'Không có mô tả'}</td>
                                                <td>
                                                    <span className="table-count-badge">
                                                        {area.tableCount || 0}
                                                    </span>
                                                </td>
                                                <td>
                                                    {new Date(area.created_at).toLocaleDateString('vi-VN')}
                                                </td>
                                                {canModify() && (
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-button edit"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openModal('edit', area);
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                Sửa
                                                            </button>
                                                            <button
                                                                className="action-button delete"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openModal('delete', area);
                                                                }}
                                                                disabled={loading || (area.tableCount > 0)}
                                                                title={area.tableCount > 0 ? 'Không thể xóa khu vực có bàn' : ''}
                                                            >
                                                                Xóa
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {areas.length === 0 && (
                                    <div className="no-data">
                                        <p>Chưa có khu vực nào</p>
                                        {canModify() && (
                                            <button
                                                className="action-button create"
                                                onClick={() => openModal('create')}
                                            >
                                                Tạo khu vực đầu tiên
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedArea && (
                        <div className="area-details">
                            <h3>Chi tiết khu vực: {selectedArea.area?.name || selectedArea.name}</h3>
                            <div className="area-info">
                                <div className="info-card">
                                    <h4>Thông tin chung</h4>
                                    <p><strong>Tên:</strong> {selectedArea.area?.name || selectedArea.name}</p>
                                    <p><strong>Mô tả:</strong> {selectedArea.area?.description || selectedArea.description || 'Không có mô tả'}</p>
                                    <p><strong>Ngày tạo:</strong> {new Date(selectedArea.area?.created_at || selectedArea.created_at).toLocaleString('vi-VN')}</p>
                                    <p><strong>Cập nhật lần cuối:</strong> {new Date(selectedArea.area?.updated_at || selectedArea.updated_at).toLocaleString('vi-VN')}</p>
                                </div>

                                <div className="info-card">
                                    <h4>Thống kê bàn</h4>
                                    <p><strong>Tổng số bàn:</strong> {selectedArea.tables?.length || 0}</p>
                                    {selectedArea.tables && selectedArea.tables.length > 0 && (
                                        <div className="table-list">
                                            <h5>Danh sách bàn:</h5>
                                            <div className="table-grid">
                                                {selectedArea.tables.map(table => (
                                                    <div key={table._id} className="table-item">
                                                        <span className="table-name">{table.name}</span>
                                                        <span className={`table-status ${table.status}`}>
                                                            {table.status === 'available' && 'Trống'}
                                                            {table.status === 'reserved' && 'Đã đặt'}
                                                            {table.status === 'occupied' && 'Đang phục vụ'}
                                                            {table.status === 'cleaning' && 'Đang dọn'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {canModify() && (
                                <div className="area-actions">
                                    <button
                                        className="action-button edit"
                                        onClick={() => openModal('edit', selectedArea.area || selectedArea)}
                                        disabled={loading}
                                    >
                                        Sửa khu vực
                                    </button>
                                    <button
                                        className="action-button delete"
                                        onClick={() => openModal('delete', selectedArea.area || selectedArea)}
                                        disabled={loading || (selectedArea.tables?.length > 0)}
                                        title={selectedArea.tables?.length > 0 ? 'Không thể xóa khu vực có bàn' : ''}
                                    >
                                        Xóa khu vực
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Forms */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-container">
                            <div className="modal-header">
                                <h3>
                                    {modalType === 'create' && 'Tạo khu vực mới'}
                                    {modalType === 'edit' && 'Chỉnh sửa khu vực'}
                                    {modalType === 'delete' && 'Xác nhận xóa khu vực'}
                                </h3>
                                <button className="close-button" onClick={closeModal}>×</button>
                            </div>

                            {error && (
                                <div className="error-message">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                {modalType === 'create' || modalType === 'edit' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Tên khu vực *</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Ví dụ: Sảnh chính, Sân ngoài..."
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Mô tả</label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Mô tả về khu vực..."
                                            />
                                        </div>
                                    </div>
                                ) : modalType === 'delete' ? (
                                    <div className="modal-body">
                                        <p>Bạn có chắc chắn muốn xóa khu vực này?</p>
                                        <div className="delete-info">
                                            <p><strong>Tên khu vực:</strong> {formData.name}</p>
                                            <p><strong>Số bàn:</strong> {formData.tableCount}</p>
                                            {formData.tableCount > 0 && (
                                                <p className="warning">
                                                    ⚠️ Không thể xóa khu vực vì còn có {formData.tableCount} bàn
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : null}

                                <div className="modal-footer">
                                    <button type="button" className="cancel-button" onClick={closeModal}>
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="confirm-button"
                                        disabled={loading || (modalType === 'delete' && formData.tableCount > 0)}
                                    >
                                        {loading ? 'Đang xử lý...' : (
                                            <>
                                                {modalType === 'create' && 'Tạo khu vực'}
                                                {modalType === 'edit' && 'Cập nhật'}
                                                {modalType === 'delete' && 'Xác nhận xóa'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AreaManagement;
