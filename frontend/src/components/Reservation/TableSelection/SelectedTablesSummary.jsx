import React from 'react';

const SelectedTablesSummary = ({
    selectedTables,
    guestCount,
    getTotalCapacity,
    onRemoveTable
}) => {
    if (selectedTables.length === 0) return null;

    const totalCapacity = getTotalCapacity();

    return (
        <div className="selected-tables-summary">
            <h5>✅ Bàn đã chọn ({selectedTables.length} bàn):</h5>

            <div className="selected-tables-list">
                {selectedTables.map(table => (
                    <div key={table._id} className="selected-table-item">
                        <span>{table.name} ({table.capacity} người)</span>
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

            {parseInt(guestCount) > 0 && (
                <div className="capacity-info">
                    Tổng sức chứa: <strong>{totalCapacity}</strong> người
                    {totalCapacity < guestCount && (
                        <span className="capacity-warning">
                            ⚠️ Cần thêm bàn để đủ {guestCount} người
                        </span>
                    )}
                    {totalCapacity >= guestCount && (
                        <span className="capacity-ok">
                            ✅ Đủ chỗ cho {guestCount} người
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default SelectedTablesSummary; 