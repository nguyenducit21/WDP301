import React from "react";

const SIDEBAR_ITEMS = [
    "Thống kê", "Hóa đơn", "Đặt bàn", "Mặt hàng",
    "Thực đơn", "Combo", "Nhân viên", "Khách hàng", "Hệ thống", "Thiết lập nhà hàng"
];

export default function Sidebar() {
    return (
        <div style={{
            width: 240, background: "#fff", boxShadow: "1px 0 8px #f0f4fb", minHeight: "100vh", paddingTop: 36
        }}>
            <div style={{ fontWeight: 700, fontSize: 22, paddingLeft: 32, color: "#2073c8", marginBottom: 24 }}>
                <span style={{ marginRight: 8 }}>🧑‍💻</span> Administration
            </div>
            <ul style={{ listStyle: "none", padding: 0 }}>
                {SIDEBAR_ITEMS.map(item => (
                    <li key={item}>
                        <a href="#" style={{
                            display: "block", padding: "12px 32px",
                            color: "#234", textDecoration: "none",
                            fontWeight: 500, borderRadius: 8,
                            marginBottom: 4, transition: "background 0.2s"
                        }}
                            onMouseOver={e => e.target.style.background = "#f4f9ff"}
                            onMouseOut={e => e.target.style.background = "transparent"}
                        >{item}</a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
