import React from "react";
import "./Header.css";
import { assets } from "../../assets/assets";

const Header = () => {
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
          <a href="/table-booking">
            <button onClick={() => navigate("/table-booking")}>ĐẶT BÀN NGAY</button>
          </a>
        </div>
        <div className="header-image">
          <img src={assets.mamcom} alt="header_img" />
        </div>
      </div>
    </header>
  );
};

export default Header;