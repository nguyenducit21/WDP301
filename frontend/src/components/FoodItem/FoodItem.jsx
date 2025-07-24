import React from "react";
import "./FoodItem.css";

const FoodItem = ({ name, price, description, image }) => {
  // Hàm xử lý URL ảnh - tự động detect cloud URL hoặc local path
  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/default-image.png'; // Ảnh mặc định khi không có ảnh

    // Nếu là URL cloud (bắt đầu bằng http/https)
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // Nếu là đường dẫn local
    return `http://localhost:3000/uploads/${imagePath}`;
  };

  return (
    <div className="food-item">
      <img
        src={getImageUrl(image)}
        alt={name}
        className="food-item-img"
        onError={(e) => {
          // Fallback khi ảnh lỗi
          e.target.src = '/default-image.png';
        }}
        onLoad={() => {
          // Debug log để kiểm tra URL ảnh
          console.log('Image loaded:', getImageUrl(image));
        }}
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
