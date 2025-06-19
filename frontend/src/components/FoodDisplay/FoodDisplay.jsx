import React, { useEffect, useState } from "react";
import "./FoodDisplay.css";
import FoodItem from "../FoodItem/FoodItem";
import { useNavigate } from "react-router-dom";
import axios from "../../utils/axios.customize";

const FoodDisplay = ({ category }) => {
  const [foodList, setFoodList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/menu-items");
        let data = res.data.data;
        // Lọc các món ăn có is_featured là true
        data = data.filter((item) => item.is_featured === true);
        // Lọc theo category nếu có
        if (category && category !== "All") {
          data = data.filter(
            (item) =>
              item.category_id === category ||
              (item.category && item.category === category)
          );
        }
        // Sắp xếp theo created_at (mới nhất trước) và giới hạn 10 món
        data = data
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10);

        setFoodList(data);
      } catch (err) {
        alert("Lỗi khi tải thực đơn món ăn!");
      }
      setLoading(false);
    };
    fetchData();
  }, [category]);

  return (
    <div className="food-display" id="food-display">
      <h2>
        <span className="section-subtitle">— Nhà Hàng Hương Sen —</span>
        <br />
        Món ăn mới
      </h2>
      <div className="food-display-grid">
        {loading ? (
          <div>Đang tải...</div>
        ) : (
          foodList.map((item) => (
            <FoodItem
              key={item._id}
              id={item._id}
              name={item.name}
              price={item.price}
              image={item.image}
              description={item.description}
            />
          ))
        )}
      </div>
      {/* Nút Xem chi tiết duy nhất ở cuối */}
      <div style={{ textAlign: "center", marginTop: 36 }}>
        <button
          className="food-see-more-btn"
          onClick={() => navigate("/menu")}
        >
          Xem chi tiết
        </button>
      </div>
    </div>
  );
};

export default FoodDisplay;