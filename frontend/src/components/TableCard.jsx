import React from "react";

const statusColor = {
    "reserved": "#ffc107",
    "available": "#e6f7e6",
    "occupied": "#f56767"
};
const statusText = {
    "reserved": "Đã đặt trước",
    "available": "Bàn trống",
    "occupied": "Đang phục vụ"
};

export default function TableCard({ table, selected, onSelect }) {
    return (
        <div
            onClick={() => table.status === "available" && onSelect(table.id)}
            style={{
                width: 110,
                background: "#fff",
                border: selected ? "2px solid #1890ff" : "1px solid #f0f0f0",
                borderRadius: 12,
                boxShadow: selected ? "0 2px 10px #d2e4fb" : "0 1px 6px #f6f7f9",
                padding: 18,
                textAlign: "center",
                cursor: table.status === "available" ? "pointer" : "not-allowed",
                opacity: table.status === "available" ? 1 : 0.6,
                marginBottom: 16
            }}
        >
            <div style={{
                fontWeight: 700,
                fontSize: 30,
                background: "#ffe3b3",
                color: "#234",
                width: 42,
                height: 42,
                margin: "0 auto 12px",
                borderRadius: 8,
                lineHeight: "42px"
            }}>
                {table.number}
            </div>
            <div style={{
                color: "#555",
                fontWeight: 500,
                marginTop: 6,
                fontSize: 16
            }}>
                {statusText[table.status] || table.status}
            </div>
        </div>
    );
}
