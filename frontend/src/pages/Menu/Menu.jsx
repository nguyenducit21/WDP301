import React, { useState, useContext } from "react";
import "./Menu.css";
import { StoreContext } from "../../context/StoreContext";
import FoodItem from "../../components/FoodItem/FoodItem";
import { menu_list } from "../../assets/assets";

const Menu = () => {
    const { food_list } = useContext(StoreContext);
    const [selectedCategory, setSelectedCategory] = useState("All");

    return (
        <div className="menu-page">
            <div className="menu-container">
                <div className="menu-nav">
                    <h2>Categories</h2>
                    {/* Category list for larger screens */}
                    <ul className="category-list">
                        <li
                            className={selectedCategory === "All" ? "active" : ""}
                            onClick={() => setSelectedCategory("All")}
                        >
                            All Items
                        </li>
                        {menu_list.map((item, index) => (
                            <li
                                key={index}
                                className={selectedCategory === item.menu_name ? "active" : ""}
                                onClick={() => setSelectedCategory(item.menu_name)}
                            >
                                {item.menu_name}
                            </li>
                        ))}
                    </ul>
                    {/* Dropdown for smaller screens */}
                    <select
                        className="category-dropdown"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="All">All Items</option>
                        {menu_list.map((item, index) => (
                            <option key={index} value={item.menu_name}>
                                {item.menu_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="menu-content">
                    <h1>Thực đơn</h1>
                    <div className="menu-items-grid">
                        {food_list.map((item, index) => {
                            if (selectedCategory === "All" || selectedCategory === item.category) {
                                return (
                                    <FoodItem
                                        key={index}
                                        id={item._id}
                                        name={item.name}
                                        description={item.description}
                                        price={item.price}
                                        image={item.image}
                                    />
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Menu;