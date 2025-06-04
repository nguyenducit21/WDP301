import React from "react";
import "./AboutSection.css";
import logo from "../../assets/logo.png";
import { assets } from "../../assets/assets";
import { FaUserTie, FaUtensils, FaChair, FaHeadset } from "react-icons/fa";
import { Link } from "react-router-dom";

const AboutSection = () => {
  const features = [
    {
      icon: <FaUserTie size={32} />,
      title: "Đầu bếp nhiều năm kinh nghiệm",
      desc: "Đầu bếp của chúng tôi với hơn 5 năm kinh nghiệm, luôn mang đến những món ăn hảo hạng và đậm chất Việt Nam.",
    },
    {
      icon: <FaUtensils size={32} />,
      title: "Nguyên liệu tươi ngon nhất",
      desc: "Món ăn đều được chế biến từ những nguyên liệu tươi ngon nhất, đảm bảo hương vị và chất lượng.",
    },
    {
      icon: <FaChair size={32} />,
      title: "Đặt bàn dễ dàng, nhanh chóng",
      desc: "Đặt bàn chỉ với vài cú click. Món ăn sẽ được phục vụ nhanh chóng khi khách hàng đến nơi.",
    },
    {
      icon: <FaHeadset size={32} />,
      title: "Phục vụ tận tình, xuyên suốt 24/7",
      desc: "Chúng tôi luôn sẵn sàng hỗ trợ 24/7. Liên hệ ngay để được tư vấn và đặt bàn nhanh chóng.",
    },
  ];

  return (
    <>
      <div className="about-features">
        {features.map((item, index) => (
          <div className="about-feature-card" key={index}>
            <div className="icon">{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>

      <section id="about-section" className="about-section">
        <div className="about-images">
          <div
            className="img-large img-1"
            style={{ backgroundImage: `url(${assets.anh1})` }}
          ></div>
          <div
            className="img-small img-2"
            style={{ backgroundImage: `url(${assets.anh2})` }}
          ></div>
          <div
            className="img-small img-3"
            style={{ backgroundImage: `url(${assets.anh3})` }}
          ></div>
          <div
            className="img-large img-4"
            style={{ backgroundImage: `url(${assets.anh4})` }}
          ></div>
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
            Với hơn 5 năm kinh nghiệm trong lĩnh vực ẩm thực, Hương Sen tự hào
            mang đến cho thực khách những món ăn ngon, độc đáo và chất lượng...
          </p>

          <div className="about-stats">
            <div className="stat-item">
            <span className="stat-number">&gt; 5 năm</span>
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

        <Link to="/about" className="btn-see-more">XEM THÊM TẠI ĐÂY</Link>
        </div>
      </section>
    </>
  );
};

export default AboutSection;
