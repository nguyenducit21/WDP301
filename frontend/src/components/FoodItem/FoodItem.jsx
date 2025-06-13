import React from "react";
import "./FoodItem.css";

const FoodItem = ({ name, price, description, image }) => {
  return (
    <div className="food-item">
      <img
        src={`http://localhost:3000/uploads/${image}`} 
        alt={name}
        className="food-item-img"
      />
      <div className="food-item-info">
        <div className="food-item-title">{name}</div>
        <div className="food-item-price">
          {price.toLocaleString("vi-VN")} <span className="vnd">đ</span>
        </div>
        <div className="food-item-desc">{description}</div>
      </div>
    </div>
  );
};

export default FoodItem;
