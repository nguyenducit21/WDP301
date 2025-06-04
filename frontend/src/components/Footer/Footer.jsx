import React from "react";
import "./Footer.css";
import { assets } from "../../assets/assets"; // Đảm bảo đường dẫn đúng

const Footer = () => {
  return (
    <footer className="hs-footer" id="footer">
      <div className="hs-footer-row">
        <div className="hs-footer-col hs-footer-logo-col">
          <img src={assets.logo} alt="Logo Hương Sen" className="hs-footer-logo" />
          <div>
            <h3>Về nhà hàng <span /></h3>
            <ul>
              <li><i className="fa fa-angle-right"></i> Về Chúng Tôi </li>
              <li><i className="fa fa-angle-right"></i> Liên Hệ </li>
              <li><i className="fa fa-angle-right"></i> Dịch Vụ </li>
              <li><i className="fa fa-angle-right"></i> Chính Sách Hoạt Động </li>
              <li><i className="fa fa-angle-right"></i> Hướng Dẫn Đặt Bàn </li>
            </ul>
          </div>
        </div>
        <div className="hs-footer-col">
          <h3>Thông tin liên lạc <span /></h3>
          <ul className="hs-contact-info">
            <li><i className="fa fa-map-marker" /> Số 82, đường Lê Bình, Quận Ninh Kiều, TP.Cần Thơ</li>
            <li><i className="fa fa-phone" /> 078.546.8567</li>
            <li><i className="fa fa-envelope" /> contact.huongsen@gmail.com</li>
            <li className="hs-footer-social">
              <a href="#"><i className="fa fa-facebook-f" /></a>
              <a href="#"><i className="fa fa-twitter" /></a>
              <a href="#"><i className="fa fa-youtube-play" /></a>
            </li>
          </ul>
        </div>
        <div className="hs-footer-col">
          <h3>Giờ mở cửa <span /></h3>
          <div className="hs-opening">
            <div>
              <b>Thứ Hai - Thứ Sáu</b>
              <br />8:00 - 22:00
            </div>
            <div>
              <b>Thứ Bảy - Chủ Nhật</b>
              <br />10:00 - 23:00
            </div>
          </div>
        </div>
        <div className="hs-footer-col">
          <h3>Liên hệ nhanh <span /></h3>
          <div className="hs-fast-contact">
            <p>Nếu có thắc mắc hoặc muốn nhận thêm ưu đãi hãy liên hệ ngay với chúng tôi.</p>
            <div className="hs-footer-email-row">
              <input type="email" placeholder="Điền email tại đây" />
              <button>GỬI</button>
            </div>
          </div>
        </div>
      </div>
      <div className="hs-footer-bottom">
        © Hương Sen Restaurant, All Rights Reserved.
      </div>
    </footer>
  );
};

export default Footer;
