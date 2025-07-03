import React from "react";
import "./Header.css";
import { assets } from "../../assets/assets";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { ToastContext } from "../../context/StoreContext";

const Header = () => {

  const navigate = useNavigate();
  const { showToast } = useContext(ToastContext);

  const user = JSON.parse(localStorage.getItem("user"));

  const handleBookingClick = () => {
    if (user) {
      navigate("/table-booking");
    } else {
      showToast("Bạn cần đăng nhập để đặt bàn", "warning");
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    }
  };

  return (
    <header>
      <div className="header-contents">
        <div className="header-text">
          <h1>
            NHỮNG MÓN ĂN NGON
            <br />
            SẴN SÀNG PHỤC VỤ THỰC KHÁCH
          </h1>
          <p>
            Khám phá hành trình ẩm thực châu Á đầy màu sắc. Với menu phong phú,
            từ những món ăn truyền thống đến những biến tấu mới lạ, chúng tôi
            mang đến cho thực khách những trải nghiệm ẩm thực độc đáo.
          </p>
          <button onClick={handleBookingClick}>ĐẶT BÀN NGAY</button>
        </div>
        <div className="header-image">
          <img src={assets.mamcom} alt="header_img" />
        </div>
      </div>
    </header>
  );
};

export default Header;