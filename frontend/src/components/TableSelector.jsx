import React from "react";
import TableCard from "./TableCard";

export default function TableSelector({ tables, selectedTable, onSelectTable }) {
    return (
        <div style={{ display: "flex", gap: 32 }}>
            {tables.map(table =>
                <TableCard
                    key={table.id}
                    table={table}
                    selected={selectedTable === table.id}
                    onSelect={onSelectTable}
                />
            )}
        </div>
    );
}
