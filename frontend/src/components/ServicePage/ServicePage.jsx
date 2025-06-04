// src/pages/ServicePage/ServicePage.jsx
import React from "react";
import "./ServicePage.css";
import { FaUserTie, FaUtensils, FaChair, FaHeadphones, FaShieldAlt, FaTruck, FaHandsHelping, FaGem } from "react-icons/fa";

const services = [
  {
    icon: <FaUserTie />,
    title: "Đầu bếp hàng đầu",
    desc: "Các đầu bếp giàu kinh nghiệm, mang đến những món ăn hấp dẫn.",
  },
  {
    icon: <FaUtensils />,
    title: "Thức ăn chất lượng",
    desc: "Sử dụng nguyên liệu tươi ngon nhất, chế biến đảm bảo chất lượng cao.",
  },
  {
    icon: <FaChair />,
    title: "Đặt bàn trực tuyến",
    desc: "Dễ dàng đặt món ăn yêu thích của bạn thông qua hệ thống trực tuyến, nhanh chóng và tiện lợi.",
  },
  {
    icon: <FaHeadphones />,
    title: "Dịch vụ 24/7",
    desc: "Sẵn sàng phục vụ bạn mọi lúc, hỗ trợ trực tuyến 24/7.",
  },
  {
    icon: <FaShieldAlt />,
    title: "An toàn và bảo mật",
    desc: "Chúng tôi cam kết cung cấp trải nghiệm an toàn, bảo mật thông tin khách hàng.",
  },
  {
    icon: <FaTruck />,
    title: "Giao hàng nhanh chóng",
    desc: "Giao hàng đúng giờ, đảm bảo món ăn đến tay bạn luôn tươi ngon.",
  },
  {
    icon: <FaHandsHelping />,
    title: "Hỗ trợ tận tình",
    desc: "Đội ngũ hỗ trợ luôn sẵn sàng tư vấn, giải đáp mọi thắc mắc.",
  },
  {
    icon: <FaGem />,
    title: "Dịch vụ cao cấp",
    desc: "Không gian sang trọng, dịch vụ chuẩn 5 sao.",
  },
];

const ServicePage = () => {
  return (
    <div className="service-page">
      <div className="service-header">
        <h4>Dịch vụ của chúng tôi</h4>
        <h1>Khám phá các dịch vụ của chúng tôi</h1>
      </div>
      <div className="service-grid">
        {services.map((s, i) => (
          <div className="service-card" key={i}>
            <div className="service-icon">{s.icon}</div>
            <div className="service-title">{s.title}</div>
            <div className="service-desc">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicePage;
