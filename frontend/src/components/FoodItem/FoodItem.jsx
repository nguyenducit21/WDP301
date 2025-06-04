import React, { useContext } from "react";
import "./FoodItem.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";

const FoodItem = ({ id, name, price, description, image }) => {
  const { cartItems, addToCart, removeFromCart } = useContext(StoreContext);

  return (
    <div className="food-item">
      <div className="food-item-top">
        <img src={image} alt={name} className="food-item-img" />
        <div className="food-item-text">
          <p className="food-item-name">{name}</p>
          <p className="food-item-price">{price.toLocaleString("vi-VN")} ₫</p>
        </div>
      </div>

      <div className="food-item-bottom">
        {!cartItems[id] ? (
          <img
            src={assets.add_icon_white}
            alt="add"
            className="add-button"
            onClick={() => addToCart(id)}
          />
        ) : (
          <div className="food-item-counter">
            <img
              src={assets.remove_icon_red}
              alt="remove"
              onClick={() => removeFromCart(id)}
            />
            <p>{cartItems[id]}</p>
            <img
              src={assets.add_icon_green}
              alt="add"
              onClick={() => addToCart(id)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodItem;
