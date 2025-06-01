import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";
import { assets } from "../../assets/assets";

const Navbar = ({ setShowLogin }) => {
  return (
    <nav className="navbar">
      <Link to="/" className="logo-container">
        <img src={assets.logo} alt="Logo Hương Sen" className="logo-img" />
      </Link>

      <ul className="navbar-menu">
        <li>
          <Link to="/" className="menu-item">
            TRANG CHỦ
          </Link>
        </li>
        <li>
          <a href="#menu" className="menu-item">
            THỰC ĐƠN
          </a>
        </li>
        <li>
          <a href="#service" className="menu-item">
            DỊCH VỤ
          </a>
        </li>
        <li>
          <a href="#news" className="menu-item">
            TIN TỨC & MẸO HAY
          </a>
        </li>
        <li className="dropdown">
          <span className="menu-item">
            KHÁC <span className="dropdown-arrow">▼</span>
          </span>
        </li>
      </ul>

      <div className="navbar-buttons">
        <button className="btn-book">ĐẶT BÀN</button>
        <button
          className="btn-login"
          onClick={() => setShowLogin && setShowLogin(true)}
        >
          Đăng nhập
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
