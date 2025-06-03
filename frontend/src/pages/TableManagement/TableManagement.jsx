import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { AuthContext } from '../../context/AuthContext';
import './TableManagement.css';
import axios from '../../utils/axios.customize';

const TableManagement = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    // States
    const [activeTab, setActiveTab] = useState('tables');
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [tables, setTables] = useState([]);
    const [allTables, setAllTables] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('');
    const [formData, setFormData] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const tablesPerPage = 18;

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
            const allowedRoles = ['admin', 'waiter', 'manager', 'staff'];
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
                const validAreas = response.data.data.filter(area => area && area._id);
                setAreas(validAreas);
                if (validAreas.length > 0 && !selectedArea) {
                    setSelectedArea(validAreas[0]._id);
                }
            }
        } catch (error) {
            setError('Lỗi khi tải danh sách khu vực');
            console.error('Error loading areas:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedArea]);

    const loadAllTables = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/tables?limit=1000');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                const validTables = response.data.data.filter(table =>
                    table &&
                    table._id &&
                    table.area_id
                );
                setAllTables(validTables);
            }
        } catch (error) {
            setError('Lỗi khi tải danh sách bàn');
            console.error('Error loading tables:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadReservations = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/reservations?limit=1000&sort=-created_at');
            if (response?.data?.success && Array.isArray(response.data.data)) {
                const validReservations = response.data.data.filter(res =>
                    res &&
                    res._id &&
                    res.table_id
                );
                setReservations(validReservations);
            }
        } catch (error) {
            setError('Lỗi khi tải danh sách đặt bàn');
            console.error('Error loading reservations:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadTableDetails = useCallback(async (tableId) => {
        if (!tableId) return;

        try {
            const response = await axios.get(`/tables/${tableId}`);
            if (response?.data?.success && response.data.data?.table) {
                setSelectedTable(response.data.data.table);
            }
        } catch (error) {
            setError('Lỗi khi tải chi tiết bàn');
            console.error('Error loading table details:', error);
        }
    }, []);

    // Load initial data
    useEffect(() => {
        const initializeData = async () => {
            await Promise.all([
                loadAreas(),
                loadAllTables(),
                loadReservations()
            ]);
        };
        initializeData();
    }, [loadAreas, loadAllTables, loadReservations]);

    // Filter tables by area
    useEffect(() => {
        if (selectedArea && allTables.length > 0) {
            const filteredTables = allTables.filter(table => {
                const tableAreaId = typeof table.area_id === 'string'
                    ? table.area_id
                    : safeGet(table, 'area_id._id');
                return tableAreaId === selectedArea;
            });

            const totalPages = Math.max(1, Math.ceil(filteredTables.length / tablesPerPage));
            const startIndex = (currentPage - 1) * tablesPerPage;
            const endIndex = startIndex + tablesPerPage;
            const currentTables = filteredTables.slice(startIndex, endIndex);

            setTables(currentTables);
            setTotalPages(totalPages);

            if (currentPage > totalPages && totalPages > 0) {
                setCurrentPage(totalPages);
            }
        }
    }, [selectedArea, allTables, currentPage]);

    // Check if table has active reservations
    const hasActiveReservations = useCallback((tableId) => {
        return reservations.some(res =>
            (safeGet(res, 'table_id._id') || res.table_id) === tableId &&
            ['confirmed', 'pending'].includes(res.status)
        );
    }, [reservations]);

    // Event Handlers
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(1);
        setError('');
    };

    const handleAreaChange = (areaId) => {
        setSelectedArea(areaId);
        setCurrentPage(1);
        setSelectedTable(null);
        setError('');
    };

    const handleTableClick = async (table) => {
        if (!table || !table._id) return;
        setSelectedTable(table);

        if (['reserved', 'occupied'].includes(table.status)) {
            await loadTableDetails(table._id);
        }
    };

    const handleReservationClick = (reservation) => {
        if (!reservation || !reservation._id) return;
        setSelectedReservation(reservation);
    };

    const openModal = async (type, item = null) => {
        setModalType(type);
        setError('');

        if (type === 'add') {
            // Load tất cả bàn available để chọn
            const availableTables = allTables.filter(table =>
                table && table.status === 'available'
            );

            setFormData({
                table_id: selectedTable?._id || '',
                contact_name: '',
                contact_phone: '',
                contact_email: '',
                date: new Date().toISOString().slice(0, 10),
                time: '',
                guest_count: 1,
                status: 'pending',
                notes: '',
                availableTables: availableTables
            });
        } else if (type === 'edit' && item) {
            // FIXED: Khi edit reservation, hiển thị bàn hiện tại + những bàn available khác
            const currentTableId = safeGet(item, 'table_id._id') || item.table_id;
            const availableTablesForEdit = allTables.filter(table =>
                table && (
                    table.status === 'available' ||
                    table._id === currentTableId
                )
            );

            setFormData({
                id: item._id,
                table_id: currentTableId,
                contact_name: item.contact_name || '',
                contact_phone: item.contact_phone || '',
                contact_email: item.contact_email || '',
                date: item.date ? new Date(item.date).toISOString().slice(0, 10) : '',
                time: item.time || '',
                guest_count: item.guest_count || 1,
                status: item.status || 'pending',
                notes: item.notes || '',
                availableTables: availableTablesForEdit
            });
        } else if (type === 'move' && item) {
            const availableTables = allTables.filter(table =>
                table &&
                table.status === 'available' &&
                table._id !== (safeGet(item, 'table_id._id') || item.table_id)
            );

            setFormData({
                id: item._id,
                table_id: safeGet(item, 'table_id._id') || item.table_id,
                new_table_id: '',
                contact_name: item.contact_name || '',
                availableTables: availableTables
            });
        } else if (type === 'delete' && item) {
            setFormData({
                id: item._id,
                contact_name: item.contact_name || '',
                table_id: safeGet(item, 'table_id._id') || item.table_id,
                date: item.date,
                time: item.time
            });
        } else if (type === 'createTable') {
            setFormData({
                area_id: selectedArea || '',
                name: '',
                type: '',
                capacity: 4,
                description: ''
            });
        } else if (type === 'editTable' && item) {
            setFormData({
                id: item._id,
                name: item.name || '',
                type: item.type || '',
                capacity: item.capacity || 4,
                description: item.description || ''
            });
        } else if (type === 'deleteTable' && item) {
            setFormData({
                id: item._id,
                name: item.name || '',
                capacity: item.capacity || 0
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalType('');
        setError('');
        setFormData({});
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
                case 'add':
                    response = await axios.post('/reservations', formData);
                    alert('Đặt bàn thành công');
                    break;

                case 'edit':
                    response = await axios.put(`/reservations/${formData.id}`, formData);
                    alert('Cập nhật đặt bàn thành công');
                    break;

                case 'move':
                    response = await axios.patch(`/reservations/${formData.id}/move`, {
                        new_table_id: formData.new_table_id
                    });
                    alert('Chuyển bàn thành công');
                    break;

                case 'delete':
                    response = await axios.patch(`/reservations/${formData.id}/cancel`);
                    alert('Hủy đặt bàn thành công');
                    break;

                case 'createTable':
                    response = await axios.post('/tables', formData);
                    alert('Tạo bàn thành công');
                    break;

                case 'editTable':
                    response = await axios.put(`/tables/${formData.id}`, formData);
                    alert('Cập nhật bàn thành công');
                    break;

                case 'deleteTable':
                    response = await axios.delete(`/tables/${formData.id}`);
                    alert('Xóa bàn thành công');
                    setSelectedTable(null);
                    break;

                default:
                    break;
            }

            // Refresh data after successful operation
            await Promise.all([
                loadReservations(),
                loadAllTables()
            ]);

            closeModal();
        } catch (error) {
            console.error('Error submitting form:', error);
            setError(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    // Utility functions with null safety
    const getTableById = (id) => {
        if (!id || !Array.isArray(allTables)) return {};
        return allTables.find(table => table && table._id === id) || {};
    };

    const getTableReservations = (tableId) => {
        if (!tableId || !Array.isArray(reservations)) return [];
        return reservations.filter(res =>
            res &&
            (safeGet(res, 'table_id._id') || res.table_id) === tableId &&
            ['confirmed', 'pending'].includes(res.status)
        );
    };

    const getAreaName = (areaId) => {
        if (!areaId || !Array.isArray(areas)) return 'N/A';
        const area = areas.find(a => a && a._id === areaId);
        return area?.name || 'N/A';
    };

    // Get staff name safely
    const getStaffName = (reservation) => {
        if (!reservation) return 'N/A';

        const createdByStaff = reservation.created_by_staff;
        if (!createdByStaff) {
            return 'Khách tự đặt';
        }

        const staffName = safeGet(createdByStaff, 'full_name') ||
            safeGet(createdByStaff, 'username') ||
            'Nhân viên';

        return `Nhân viên: ${staffName}`;
    };

    if (loading && areas.length === 0) {
        return (
            <div className="table-management">
                <Sidebar />
                <div className="table-management-content">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="table-management">
            <Sidebar />
            <div className="table-management-content">
                <div className="table-management-header">
                    <h1>Quản lý đặt bàn</h1>
                    <div className="tab-navigation">
                        <button
                            className={`tab-button ${activeTab === 'tables' ? 'active' : ''}`}
                            onClick={() => handleTabChange('tables')}
                        >
                            Sơ đồ bàn
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'reservations' ? 'active' : ''}`}
                            onClick={() => handleTabChange('reservations')}
                        >
                            Danh sách đặt bàn
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError('')} className="close-error">×</button>
                    </div>
                )}

                {activeTab === 'tables' && (
                    <div className="tables-view">
                        <div className="area-selector">
                            <div className="area-selector-header">
                                <h3>Khu vực</h3>
                                <button
                                    className="action-button add-reservation"
                                    onClick={() => openModal('createTable')}
                                    disabled={loading}
                                >
                                    Tạo bàn mới
                                </button>
                            </div>
                            <div className="area-buttons">
                                {areas.map(area => (
                                    <button
                                        key={area._id}
                                        className={`area-button ${selectedArea === area._id ? 'active' : ''}`}
                                        onClick={() => handleAreaChange(area._id)}
                                    >
                                        {area.name} ({area.tableCount || 0})
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="tables-container">
                            <div className="tables-grid">
                                {tables.map(table => (
                                    <div
                                        key={table._id}
                                        className={`table-card ${table.status} ${selectedTable?._id === table._id ? 'selected' : ''}`}
                                        onClick={() => handleTableClick(table)}
                                    >
                                        <div className="table-number">
                                            {table.name.match(/\d+/)?.[0] || table.number || '?'}
                                        </div>
                                        <div className="table-name">{table.name}</div>
                                        <div className="table-info">
                                            <span className="table-capacity">{table.capacity} người</span>
                                            <span className={`table-status ${table.status}`}>
                                                {table.status === 'available' && 'Trống'}
                                                {table.status === 'reserved' && 'Đã đặt'}
                                                {table.status === 'occupied' && 'Đang phục vụ'}
                                                {table.status === 'cleaning' && 'Đang dọn'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="pagination-button"
                                    >
                                        Trước
                                    </button>
                                    {Array.from({ length: totalPages }, (_, index) => (
                                        <button
                                            key={index + 1}
                                            onClick={() => handlePageChange(index + 1)}
                                            className={`pagination-button ${currentPage === index + 1 ? 'active' : ''}`}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="pagination-button"
                                    >
                                        Sau
                                    </button>
                                </div>
                            )}
                        </div>

                        {selectedTable && (
                            <div className="table-details">
                                <h3>Chi tiết bàn: {selectedTable.name}</h3>
                                <div className="table-info-details">
                                    <p><strong>Sức chứa:</strong> {selectedTable.capacity} người</p>
                                    <p><strong>Loại:</strong> {selectedTable.type}</p>
                                    <p><strong>Khu vực:</strong> {getAreaName(safeGet(selectedTable, 'area_id._id') || selectedTable.area_id)}</p>
                                    <p><strong>Trạng thái:</strong>
                                        <span className={`status-badge ${selectedTable.status}`}>
                                            {selectedTable.status === 'available' && 'Trống'}
                                            {selectedTable.status === 'reserved' && 'Đã đặt'}
                                            {selectedTable.status === 'occupied' && 'Đang phục vụ'}
                                            {selectedTable.status === 'cleaning' && 'Đang dọn'}
                                        </span>
                                    </p>
                                    {selectedTable.description && (
                                        <p><strong>Mô tả:</strong> {selectedTable.description}</p>
                                    )}
                                </div>

                                <div className="table-actions">
                                    <button
                                        className="action-button edit"
                                        onClick={() => openModal('editTable', selectedTable)}
                                        disabled={loading || hasActiveReservations(selectedTable._id)}
                                        title={hasActiveReservations(selectedTable._id) ? 'Không thể sửa bàn đang có đặt bàn' : ''}
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        className="action-button delete"
                                        onClick={() => openModal('deleteTable', selectedTable)}
                                        disabled={loading || hasActiveReservations(selectedTable._id)}
                                        title={hasActiveReservations(selectedTable._id) ? 'Không thể xóa bàn đang có đặt bàn' : ''}
                                    >
                                        Xóa
                                    </button>
                                    {selectedTable.status === 'available' && (
                                        <button
                                            className="action-button add-reservation"
                                            onClick={() => openModal('add')}
                                            disabled={loading}
                                        >
                                            Đặt bàn mới
                                        </button>
                                    )}
                                </div>

                                {/* Warning message for tables with active reservations */}
                                {hasActiveReservations(selectedTable._id) && (
                                    <div className="warning-message">
                                        ⚠️ Bàn này đang có đặt bàn hoạt động, không thể sửa hoặc xóa
                                    </div>
                                )}

                                {(selectedTable.status === 'reserved' || selectedTable.status === 'occupied') && (
                                    <div className="table-reservations">
                                        <h4>Thông tin đặt bàn</h4>
                                        {getTableReservations(selectedTable._id).map(res => (
                                            <div key={res._id} className="reservation-item">
                                                <p><strong>Khách hàng:</strong> {res.contact_name}</p>
                                                <p><strong>SĐT:</strong> {res.contact_phone}</p>
                                                <p><strong>Thời gian:</strong> {new Date(res.date).toLocaleDateString()} {res.time}</p>
                                                <p><strong>Số khách:</strong> {res.guest_count}</p>
                                                <p><strong>Trạng thái:</strong>
                                                    <span className={`status-badge ${res.status}`}>
                                                        {res.status === 'pending' && 'Chờ xác nhận'}
                                                        {res.status === 'confirmed' && 'Đã xác nhận'}
                                                    </span>
                                                </p>
                                                <p><strong>Nguồn:</strong> {getStaffName(res)}</p>
                                                {res.notes && <p><strong>Ghi chú:</strong> {res.notes}</p>}
                                                <div className="reservation-actions">
                                                    <button
                                                        className="action-button edit"
                                                        onClick={() => openModal('edit', res)}
                                                        disabled={loading || res.status === 'cancelled'}
                                                    >
                                                        Sửa
                                                    </button>
                                                    {['pending', 'confirmed'].includes(res.status) && (
                                                        <>
                                                            <button
                                                                className="action-button move"
                                                                onClick={() => openModal('move', res)}
                                                                disabled={loading}
                                                            >
                                                                Chuyển bàn
                                                            </button>
                                                            <button
                                                                className="action-button delete"
                                                                onClick={() => openModal('delete', res)}
                                                                disabled={loading}
                                                            >
                                                                Hủy
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reservations' && (
                    <div className="reservations-view">
                        <div className="reservations-header">
                            <h3>Danh sách đặt bàn</h3>
                            <button
                                className="action-button add-reservation"
                                onClick={() => openModal('add')}
                                disabled={loading}
                            >
                                Đặt bàn mới
                            </button>
                        </div>

                        <div className="reservations-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Mã đặt bàn</th>
                                        <th>Bàn</th>
                                        <th>Khách hàng</th>
                                        <th>Liên hệ</th>
                                        <th>Ngày</th>
                                        <th>Giờ</th>
                                        <th>Số khách</th>
                                        <th>Trạng thái</th>
                                        <th>Nguồn</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reservations.map(res => (
                                        <tr
                                            key={res._id}
                                            className={selectedReservation?._id === res._id ? 'selected' : ''}
                                            onClick={() => handleReservationClick(res)}
                                        >
                                            <td>#{res._id.slice(-6)}</td>
                                            <td>{safeGet(res, 'table_id.name') || 'N/A'}</td>
                                            <td>{res.contact_name}</td>
                                            <td>{res.contact_phone}</td>
                                            <td>{new Date(res.date).toLocaleDateString()}</td>
                                            <td>{res.time}</td>
                                            <td>{res.guest_count}</td>
                                            <td>
                                                <span className={`status-badge ${res.status}`}>
                                                    {res.status === 'pending' && 'Chờ xác nhận'}
                                                    {res.status === 'confirmed' && 'Đã xác nhận'}
                                                    {res.status === 'cancelled' && 'Đã hủy'}
                                                    {res.status === 'no_show' && 'Không đến'}
                                                    {res.status === 'completed' && 'Hoàn thành'}
                                                </span>
                                            </td>
                                            <td>{getStaffName(res)}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="action-button edit"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openModal('edit', res);
                                                        }}
                                                        disabled={loading || res.status === 'cancelled'}
                                                    >
                                                        Sửa
                                                    </button>
                                                    {['pending', 'confirmed'].includes(res.status) && (
                                                        <>
                                                            <button
                                                                className="action-button move"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openModal('move', res);
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                Chuyển
                                                            </button>
                                                            <button
                                                                className="action-button delete"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openModal('delete', res);
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                Hủy
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Modal Forms */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-container">
                            <div className="modal-header">
                                <h3>
                                    {modalType === 'add' && 'Đặt bàn mới'}
                                    {modalType === 'edit' && 'Chỉnh sửa đặt bàn'}
                                    {modalType === 'move' && 'Chuyển bàn'}
                                    {modalType === 'delete' && 'Xác nhận hủy đặt bàn'}
                                    {modalType === 'createTable' && 'Tạo bàn mới'}
                                    {modalType === 'editTable' && 'Sửa bàn'}
                                    {modalType === 'deleteTable' && 'Xác nhận xóa bàn'}
                                </h3>
                                <button className="close-button" onClick={closeModal}>×</button>
                            </div>

                            {error && (
                                <div className="error-message">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                {modalType === 'add' || modalType === 'edit' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Bàn</label>
                                            <select
                                                name="table_id"
                                                value={formData.table_id || ''}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Chọn bàn</option>
                                                {(formData.availableTables || []).map(table => (
                                                    <option key={table._id} value={table._id}>
                                                        {table.name} ({table.capacity} người) - {getAreaName(safeGet(table, 'area_id._id') || table.area_id)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Tên khách hàng</label>
                                            <input
                                                type="text"
                                                name="contact_name"
                                                value={formData.contact_name || ''}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Số điện thoại</label>
                                            <input
                                                type="text"
                                                name="contact_phone"
                                                value={formData.contact_phone || ''}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Email</label>
                                            <input
                                                type="email"
                                                name="contact_email"
                                                value={formData.contact_email || ''}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Ngày</label>
                                                <input
                                                    type="date"
                                                    name="date"
                                                    value={formData.date || ''}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Giờ</label>
                                                <input
                                                    type="time"
                                                    name="time"
                                                    value={formData.time || ''}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Số khách</label>
                                                <input
                                                    type="number"
                                                    name="guest_count"
                                                    value={formData.guest_count || 1}
                                                    onChange={handleInputChange}
                                                    min="1"
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Trạng thái</label>
                                                <select
                                                    name="status"
                                                    value={formData.status || 'pending'}
                                                    onChange={handleInputChange}
                                                >
                                                    <option value="pending">Chờ xác nhận</option>
                                                    <option value="confirmed">Đã xác nhận</option>
                                                    <option value="cancelled">Đã hủy</option>
                                                    <option value="no_show">Không đến</option>
                                                    <option value="completed">Hoàn thành</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Ghi chú</label>
                                            <textarea
                                                name="notes"
                                                value={formData.notes || ''}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Ghi chú đặc biệt..."
                                            />
                                        </div>
                                    </div>
                                ) : modalType === 'move' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Bàn hiện tại</label>
                                            <input
                                                type="text"
                                                value={getTableById(formData.table_id).name || 'N/A'}
                                                disabled
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Chọn bàn mới</label>
                                            <select
                                                name="new_table_id"
                                                value={formData.new_table_id || ''}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Chọn bàn</option>
                                                {(formData.availableTables || []).map(table => (
                                                    <option key={table._id} value={table._id}>
                                                        {table.name} ({table.capacity} người) - {getAreaName(safeGet(table, 'area_id._id') || table.area_id)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ) : modalType === 'createTable' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Khu vực</label>
                                            <select
                                                name="area_id"
                                                value={formData.area_id || ''}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Chọn khu vực</option>
                                                {areas.map(area => (
                                                    <option key={area._id} value={area._id}>
                                                        {area.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Tên bàn</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name || ''}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Ví dụ: Bàn 01"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Loại bàn</label>
                                            <input
                                                type="text"
                                                name="type"
                                                value={formData.type || ''}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Ví dụ: gia đình, cặp đôi, nhóm"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Sức chứa</label>
                                            <input
                                                type="number"
                                                name="capacity"
                                                value={formData.capacity || 4}
                                                onChange={handleInputChange}
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Mô tả</label>
                                            <textarea
                                                name="description"
                                                value={formData.description || ''}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Mô tả vị trí hoặc đặc điểm của bàn"
                                            />
                                        </div>
                                    </div>
                                ) : modalType === 'editTable' ? (
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Tên bàn</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name || ''}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Loại bàn</label>
                                            <input
                                                type="text"
                                                name="type"
                                                value={formData.type || ''}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Sức chứa</label>
                                            <input
                                                type="number"
                                                name="capacity"
                                                value={formData.capacity || 4}
                                                onChange={handleInputChange}
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Mô tả</label>
                                            <textarea
                                                name="description"
                                                value={formData.description || ''}
                                                onChange={handleInputChange}
                                                rows="3"
                                            />
                                        </div>
                                    </div>
                                ) : modalType === 'delete' ? (
                                    <div className="modal-body">
                                        <p>Bạn có chắc chắn muốn hủy đặt bàn này?</p>
                                        <p><strong>Khách hàng:</strong> {formData.contact_name}</p>
                                        <p><strong>Bàn:</strong> {getTableById(formData.table_id).name}</p>
                                        <p><strong>Thời gian:</strong> {formData.date && new Date(formData.date).toLocaleDateString()} {formData.time}</p>
                                    </div>
                                ) : modalType === 'deleteTable' ? (
                                    <div className="modal-body">
                                        <p>Bạn có chắc chắn muốn xóa bàn này?</p>
                                        <p><strong>Tên bàn:</strong> {formData.name}</p>
                                        <p><strong>Sức chứa:</strong> {formData.capacity} người</p>
                                    </div>
                                ) : null}

                                <div className="modal-footer">
                                    <button type="button" className="cancel-button" onClick={closeModal}>
                                        Hủy
                                    </button>
                                    <button type="submit" className="confirm-button" disabled={loading}>
                                        {loading ? 'Đang xử lý...' : (
                                            <>
                                                {modalType === 'add' && 'Đặt bàn'}
                                                {modalType === 'edit' && 'Cập nhật'}
                                                {modalType === 'move' && 'Chuyển bàn'}
                                                {modalType === 'delete' && 'Xác nhận hủy'}
                                                {modalType === 'createTable' && 'Tạo bàn'}
                                                {modalType === 'editTable' && 'Cập nhật bàn'}
                                                {modalType === 'deleteTable' && 'Xác nhận xóa'}
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

export default TableManagement;
