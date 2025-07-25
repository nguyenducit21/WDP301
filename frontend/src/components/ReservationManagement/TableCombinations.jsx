import React from 'react';

const TableCombinations = ({
    combinations,
    onTableSelect,
    onCombinationSelect,
    isTableSelected,
    isCombinationSelected
}) => {
    console.log('TableCombinations received combinations:', combinations); // Debug log

    if (!combinations || combinations.length === 0) {
        console.log('TableCombinations: No combinations to display'); // Debug log
        return null;
    }

    return (
        <div className="table-combinations">
            <h5>Gợi ý chọn bàn:</h5>
            {combinations.map((combination, index) => (
                <div key={index} className="combination-group">
                    <h6>{combination.description}</h6>
                    <div className="combination-options">
                        {combination.tables.map((tableOption, tableIndex) => {
                            if (Array.isArray(tableOption)) {
                                // Multiple table combination
                                const totalCapacity = tableOption.reduce((sum, t) => sum + t.capacity, 0);
                                const isSelected = isCombinationSelected(tableOption);
                                return (
                                    <div
                                        key={tableIndex}
                                        className={`combination-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => onCombinationSelect(tableOption)}
                                    >
                                        <div className="combination-tables">
                                            {tableOption.map((table, idx) => (
                                                <span key={table._id} className="table-name">
                                                    {table.name}
                                                    {idx < tableOption.length - 1 && ' + '}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="combination-capacity">
                                            Tổng: {totalCapacity} người
                                        </div>
                                        <div className="combination-areas">
                                            Khu vực: {tableOption.map(t => t.area_id?.name || 'N/A').join(', ')}
                                        </div>
                                    </div>
                                );
                            } else {
                                // Single table
                                return (
                                    <div
                                        key={tableOption._id}
                                        className={`table-card ${isTableSelected(tableOption) ? "selected" : ""}`}
                                        onClick={() => onTableSelect(tableOption)}
                                    >
                                        <div className="table-name">{tableOption.name}</div>
                                        <div className="table-capacity">Sức chứa: {tableOption.capacity} người</div>
                                        <div className="table-area">
                                            Khu vực: {tableOption.area_id?.name || 'N/A'}
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TableCombinations;
