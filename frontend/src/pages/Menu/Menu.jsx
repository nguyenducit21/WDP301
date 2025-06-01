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
                </div>

                <div className="menu-content">
                    <h1>Our Menu</h1>
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