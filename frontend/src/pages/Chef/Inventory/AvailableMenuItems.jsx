import React, { useState, useEffect } from 'react';
import axios from '../../../utils/axios.customize';
import { toast } from 'react-toastify';
import './AvailableMenuItems.css';

const AvailableMenuItems = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [includeInactive, setIncludeInactive] = useState(true);
    const [expandedItems, setExpandedItems] = useState(new Set());

    useEffect(() => {
        fetchAvailableMenuItems(false);
    }, [includeInactive]);

    const fetchAvailableMenuItems = async (autoSync = false) => {
        setLoading(true);
        try {
            const response = await axios.get('/recipes/available-menu-items', {
                params: {
                    includeUnavailable: 'true',
                    includeInactive: includeInactive.toString(),
                    autoSync: autoSync.toString()
                },
                withCredentials: true
            });

            if (response.data.success) {
                setMenuItems(response.data.data);
                setSummary(response.data.summary);
                if (response.data.sync_updates && response.data.sync_updates.length > 0) {
                    const syncedItems = response.data.sync_updates.map(item =>
                        `${item.menu_item_name}: ${item.old_status ? 'Có' : 'Không'} → ${item.new_status ? 'Có' : 'Không'}`
                    ).join('\n');
                    toast.success(`Đã đồng bộ ${response.data.sync_updates.length} món ăn!\n${syncedItems}`, {
                        autoClose: 8000
                    });
                }
            } else {
                toast.error('Không thể tải danh sách món ăn');
            }
        } catch (error) {
            toast.error('Lỗi khi tải danh sách món ăn');
        } finally {
            setLoading(false);
        }
    };

    const manualSync = async () => {
        try {
            setLoading(true);
            const response = await axios.post('/recipes/sync-availability', {}, {
                withCredentials: true
            });
            if (response.data.success) {
                const { items_updated, update_details } = response.data.data;
                if (items_updated > 0) {
                    const syncedItems = update_details.map(item =>
                        `${item.menu_item_name}: ${item.old_status ? 'Có' : 'Không'} → ${item.new_status ? 'Có' : 'Không'} (${item.reason})`
                    ).join('\n');
                    toast.success(`Đã đồng bộ ${items_updated} món ăn!\n${syncedItems}`, {
                        autoClose: 8000
                    });
                    fetchAvailableMenuItems();
                } else {
                    toast.info('Tất cả món ăn đã được đồng bộ, không cần cập nhật.');
                }
            } else {
                toast.error('Không thể đồng bộ trạng thái món ăn');
            }
        } catch (error) {
            toast.error('Lỗi khi đồng bộ trạng thái món ăn');
        } finally {
            setLoading(false);
        }
    };

    const toggleItemDetails = (itemId) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(itemId)) {
            newExpanded.delete(itemId);
        } else {
            newExpanded.add(itemId);
        }
        setExpandedItems(newExpanded);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    if (loading) {
        return (
            <div className="available-menu-items-container">
                <div className="loading">Đang tải danh sách món ăn...</div>
            </div>
        );
    }

    return (
        <div className="available-menu-items-container">
            {/* Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1 className="page-title">Món Ăn Có Thể Chế Biến</h1>
                </div>
                <div className="header-actions">
                    <button
                        className="btn"
                        onClick={() => setIncludeInactive(!includeInactive)}
                    >
                        {includeInactive ? 'Bao gồm món tạm ngưng' : 'Chỉ món đang phục vụ'}
                    </button>
                    <button
                        className="btn"
                        onClick={() => fetchAvailableMenuItems(true)}
                        disabled={loading}
                    >
                        Làm mới + Auto Sync
                    </button>
                    <button
                        className="btn"
                        onClick={manualSync}
                        disabled={loading}
                    >
                        Manual Sync
                    </button>
                </div>
            </div>

            {/* Summary Statistics */}
            <div className="summary-stats">
                <div className="stat-card available">
                    <h3>{summary.available_items || 0}</h3>
                    <p>Món có thể nấu</p>
                </div>
                <div className="stat-card unavailable">
                    <h3>{summary.unavailable_items || 0}</h3>
                    <p>Món thiếu nguyên liệu</p>
                </div>
                {summary.inactive_menu_items > 0 && (
                    <div className="stat-card inactive">
                        <h3>{summary.inactive_menu_items || 0}</h3>
                        <p>Món tạm ngưng</p>
                    </div>
                )}
                <div className="stat-card total">
                    <h3>{summary.total_menu_items || 0}</h3>
                    <p>Tổng số món</p>
                </div>
                <div className="stat-card rate">
                    <h3>{summary.availability_rate || 0}%</h3>
                    <p>Tỷ lệ sẵn sàng</p>
                </div>
            </div>

            {/* Menu Items List */}
            <div className="menu-items-grid">
                {menuItems.map((item) => (
                    <div
                        key={item.menu_item_id}
                        className={`menu-item-card ${item.status}${!item.menu_item_active ? ' inactive' : ''}`}
                    >
                        <div className="card-header">
                            <div className="item-info">
                                <h3 className="item-name">
                                    {item.menu_item_name}
                                    {!item.menu_item_active && (
                                        <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.95rem', marginLeft: 8 }}>
                                            (Tạm ngưng)
                                        </span>
                                    )}
                                </h3>
                                <p className="item-price">{formatPrice(item.menu_item_price)}</p>
                                <img src={item.menu_item_image} alt={item.menu_item_name}
                                    style={{ maxWidth: '100px', maxHeight: '100px', minWidth: '100px', minHeight: '100px', objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                            </div>
                            <div className="item-status">
                                <span className={`status-badge ${item.status}${!item.menu_item_active ? ' inactive' : ''}`}>
                                    {item.status === 'available' ? 'Có thể nấu' : (item.status === 'unavailable' ? 'Thiếu nguyên liệu' : 'Tạm ngưng')}
                                </span>
                                {item.can_prepare && (
                                    <div className="max-servings">
                                        Tối đa: <strong>{item.max_servings}</strong> suất
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="card-content">
                            <div className="ingredients-summary">
                                <span>{item.ingredient_count} nguyên liệu</span>
                                <button
                                    className="toggle-details-btn"
                                    onClick={() => toggleItemDetails(item.menu_item_id)}
                                >
                                    {expandedItems.has(item.menu_item_id) ? 'Thu gọn' : 'Chi tiết'}
                                </button>
                            </div>
                            {expandedItems.has(item.menu_item_id) && (
                                <div className="ingredients-details">
                                    <div className="ingredients-list">
                                        {item.ingredients_status.map((ingredient, index) => (
                                            <div
                                                key={index}
                                                className="ingredient-item"
                                            >
                                                <div className="ingredient-name">
                                                    {ingredient.ingredient_name}
                                                </div>
                                                <div className="ingredient-quantities">
                                                    <span>Cần: {ingredient.needed_quantity} {ingredient.unit}</span>
                                                    <span>Có: {ingredient.available_quantity} {ingredient.unit}</span>
                                                    <span>Có thể làm: {ingredient.possible_servings} suất</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {item.missing_ingredients.length > 0 && (
                                        <div className="missing-ingredients">
                                            <h5>Nguyên liệu thiếu:</h5>
                                            {item.missing_ingredients.map((missing, index) => (
                                                <div key={index} className="missing-item">
                                                    <strong>{missing.name}</strong>:
                                                    {missing.reason === 'Món ăn đã bị tạm ngưng phục vụ' ? (
                                                        <span className="inactive-reason">Món ăn đã bị tạm ngưng phục vụ</span>
                                                    ) : missing.reason === 'Nguyên liệu không hoạt động' ? (
                                                        <span className="inactive-reason">Nguyên liệu không có sẵn</span>
                                                    ) : (
                                                        <>
                                                            Thiếu {missing.shortage} {missing.unit}
                                                            (Có {missing.available}/{missing.needed} {missing.unit})
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {menuItems.length === 0 && (
                <div className="empty-state">
                    <h3>Không có món ăn nào {true ? '' : 'có thể chế biến'}</h3>
                    <p>
                        {'Chưa có công thức món ăn nào được tạo'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default AvailableMenuItems; 