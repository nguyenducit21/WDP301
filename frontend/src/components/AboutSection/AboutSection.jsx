import React from "react";
import "./AboutSection.css";
import logo from "../../assets/logo.png";
import { assets } from "../../assets/assets";

const AboutSection = () => {
  return (
    <section id="about-section" className="about-section">
  <div className="about-images">
    <div className="img-large img-1" style={{ backgroundImage: `url(${assets.anh1})` }}></div>
    <div className="img-small img-2" style={{ backgroundImage: `url(${assets.anh2})` }}></div>
    <div className="img-small img-3" style={{ backgroundImage: `url(${assets.anh3})` }}></div>
    <div className="img-large img-4" style={{ backgroundImage: `url(${assets.anh4})` }}></div>
  </div>

      <div className="about-text">
        <h5>Giới thiệu</h5>
        <h2>CHÀO MỪNG ĐẾN VỚI</h2>
        <div className="logo-text">
          <img src={logo} alt="Hương Sen Logo" />
          <span>Hương Sen</span>
        </div>

        <p>
          Nhà hàng Hương Sen - Hương vị ẩm thực Việt Nam đích thực
          <br />
          Với hơn 5 năm kinh nghiệm trong lĩnh vực ẩm thực, Hương Sen tự hào mang
          đến cho thực khách những món ăn ngon, độc đáo và chất lượng. Đội ngũ
          đầu bếp tài năng của chúng tôi luôn không ngừng sáng tạo để mang đến
          những trải nghiệm ẩm thực mới lạ. Không gian nhà hàng ấm cúng, sang
          trọng, cùng với phong cách phục vụ chuyên nghiệp sẽ khiến quý khách
          hài lòng.
        </p>

        <div className="about-stats">
          <div className="stat-item">
            <span className="stat-number">5</span>
            <span className="stat-label">
              Năm <br /> KINH NGHIỆM
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-number">20</span>
            <span className="stat-label">
              Đầu Bếp <br /> NHIỀU NĂM KINH NGHIỆM
            </span>
          </div>
        </div>

        <button className="btn-see-more">XEM THÊM TẠI ĐÂY</button>
      </div>
    </section>
  );
};

export default AboutSection;
