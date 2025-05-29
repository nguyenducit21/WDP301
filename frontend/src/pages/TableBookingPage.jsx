import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import TableSelector from "../components/TableSelector";

const AREA_LIST = [
    { id: 1, name: "Sảnh chính" },
    { id: 2, name: "Sân ngoài" },
];

const TABLES = [
    { id: 1, number: 1, status: "reserved" },
    { id: 2, number: 2, status: "available" },
    { id: 3, number: 3, status: "available" },
    { id: 4, number: 4, status: "available" },
    { id: 5, number: 5, status: "available" },
];

export default function TableBookingPage() {
    const [selectedArea, setSelectedArea] = useState(1);
    const [selectedTable, setSelectedTable] = useState(null);

    const handleSelectTable = (tableId) => setSelectedTable(tableId);

    return (
        <div style={{ display: "flex", height: "100vh", background: "#f7fafd" }}>
            <Sidebar />
            <div style={{ flex: 1 }}>
                {/* Header */}
                <div style={{
                    background: "#fff", display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "20px 32px 12px 32px", borderBottom: "1px solid #f0f0f0"
                }}>
                    <h2 style={{ fontWeight: 600, margin: 0, color: "#234", fontSize: 20 }}>Chọn bàn cho 3 người</h2>
                    <div>
                        <input placeholder="Search" style={{ padding: "8px", borderRadius: 8, border: "1px solid #ddd", marginRight: 24 }} />
                        <span style={{ fontWeight: 600, color: "#444" }}>Hồ Anh Hòa</span>
                        <img src="https://i.pravatar.cc/30" alt="avatar" style={{ borderRadius: "50%", marginLeft: 8, width: 30 }} />
                    </div>
                </div>
                {/* Main content */}
                <div style={{
                    display: "flex", gap: 48, padding: "36px 48px", minHeight: "calc(100vh - 80px)"
                }}>
                    {/* Area Selector */}
                    <div style={{
                        minWidth: 180, background: "#fff", borderRadius: 12, boxShadow: "0 1px 8px #edf1f7", padding: 24,
                        display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch"
                    }}>
                        {AREA_LIST.map(area => (
                            <button
                                key={area.id}
                                style={{
                                    padding: "12px", border: 0, borderRadius: 8,
                                    background: selectedArea === area.id ? "#1890ff" : "#f0f6fa",
                                    color: selectedArea === area.id ? "#fff" : "#222",
                                    fontWeight: 500, cursor: "pointer", marginBottom: 8
                                }}
                                onClick={() => setSelectedArea(area.id)}
                            >
                                <span style={{ marginRight: 8 }}>📍</span>{area.name}
                            </button>
                        ))}
                    </div>
                    {/* Table Selector */}
                    <div style={{ flex: 1 }}>
                        <TableSelector
                            tables={TABLES}
                            selectedTable={selectedTable}
                            onSelectTable={handleSelectTable}
                        />
                        <button style={{
                            marginTop: 32, padding: "8px 28px", background: "#eee",
                            color: "#222", border: 0, borderRadius: 8, cursor: "pointer"
                        }}>
                            &lt;&lt; Quay lại
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
