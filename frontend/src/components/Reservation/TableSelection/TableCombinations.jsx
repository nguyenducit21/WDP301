import React from 'react';

const TableCombinations = ({
    combinations,
    onTableSelect,
    onCombinationSelect,
    isTableSelected,
    isCombinationSelected
}) => {
    if (combinations.length === 0) return null;

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
                                            {tableOption.map(table => (
                                                <span key={table._id} className="table-name">
                                                    {table.name}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="combination-capacity">
                                            Tổng: {totalCapacity} người
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
                                        <div>{tableOption.name}</div>
                                        <div>({tableOption.capacity} người)</div>
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