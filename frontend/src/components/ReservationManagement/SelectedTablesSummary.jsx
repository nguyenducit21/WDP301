import React from 'react';

const SelectedTablesSummary = ({
    selectedTables,
    guestCount,
    getTotalCapacity,
    onRemoveTable
}) => {
    if (selectedTables.length === 0) return null;

    const totalCapacity = getTotalCapacity();
    const isCapacityValid = totalCapacity >= guestCount;

    return (
        <div className="selected-tables-summary">
            <div className="summary-header">
                <h5>✅ Bàn đã chọn ({selectedTables.length} bàn)</h5>
                <div className={`capacity-status ${isCapacityValid ? 'valid' : 'invalid'}`}>
                    {isCapacityValid ? '✓' : '⚠️'} Sức chứa: {totalCapacity}/{guestCount} người
                </div>
            </div>

            <div className="selected-tables-list">
                {selectedTables.map(table => (
                    <div key={table._id} className="selected-table-item">
                        <div className="table-info">
                            <span className="table-name">{table.name}</span>
                            <span className="table-capacity">({table.capacity} người)</span>
                            <span className="table-area">
                                {table.area_id?.name || 'N/A'}
                            </span>
                        </div>
                        <button
                            className="remove-table-btn"
                            onClick={() => onRemoveTable(table)}
                            title="Bỏ chọn bàn này"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {!isCapacityValid && (
                <div className="capacity-warning">
                    ⚠️ Sức chứa hiện tại ({totalCapacity} người) không đủ cho {guestCount} khách. 
                    Vui lòng chọn thêm bàn hoặc giảm số lượng khách.
                </div>
            )}

            {totalCapacity > guestCount * 1.5 && (
                <div className="capacity-info">
                    💡 Sức chứa hiện tại ({totalCapacity} người) khá lớn so với số khách ({guestCount} người). 
                    Bạn có thể chọn bàn nhỏ hơn để tối ưu không gian.
                </div>
            )}
        </div>
    );
};

export default SelectedTablesSummary;
