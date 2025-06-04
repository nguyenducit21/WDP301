import React, { useState, useEffect } from "react";
import "./Menu.css";
import axios from "axios";
import FoodItem from "../../components/FoodItem/FoodItem";

const Menu = () => {
    const [foodList, setFoodList] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMenu = async () => {
            setLoading(true);
            try {
                const res = await axios.get("/api/menuitems");
                setFoodList(res.data);
            } catch (err) {
                alert("Lỗi khi tải thực đơn!");
            }
            setLoading(false);
        };
        fetchMenu();
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get("/api/categories");
                setCategories(res.data);
            } catch (err) {
                alert("Lỗi khi tải danh mục!");
            }
        };
        fetchCategories();
    }, []);

    // Lấy tên category đang chọn
    const currentCategoryName =
        selectedCategory === "All"
            ? "Thực đơn"
            : categories.find((c) => c._id === selectedCategory)?.name || "";

    return (
        <div className="menu-page">
            <div className="menu-container">
                <aside className="menu-sidebar">
                    <div className="menu-sidebar-title">
                        <span className="decor">—</span>
                        <span>THỰC ĐƠN</span>
                        <span className="decor">—</span>
                    </div>
                    <ul className="sidebar-list">
                        <li
                            className={selectedCategory === "All" ? "active" : ""}
                            onClick={() => setSelectedCategory("All")}
                        >
                            Xem tất cả
                        </li>
                        {categories.map((cat) => (
                            <li
                                key={cat._id}
                                className={selectedCategory === cat._id ? "active" : ""}
                                onClick={() => setSelectedCategory(cat._id)}
                            >
                                {cat.name}
                            </li>
                        ))}
                    </ul>
                </aside>
                <main className="menu-content">
                    <div className="menu-heading">
                        <span className="sub-title">Nhà Hàng Hương Sen</span>
                        <h1>{currentCategoryName}</h1>
                    </div>
                    {loading ? (
                        <div>Đang tải...</div>
                    ) : (
                        <div className="menu-items-grid">
                            {foodList
                                .filter(
                                    (item) =>
                                        selectedCategory === "All" ||
                                        item.category_id === selectedCategory ||
                                        (item.category_id?._id && item.category_id._id === selectedCategory)
                                )
                                .map((item) => (
                                    <FoodItem
                                        key={item._id}
                                        name={item.name}
                                        description={item.description}
                                        price={item.price}
                                        image={item.image}
                                    />
                                ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Menu;
