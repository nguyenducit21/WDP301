import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import { assets } from "../../assets/assets";

const Navbar = ({ setShowLogin }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(true); // Trang khác: luôn shrink
      return;
    }
    // Nếu về Home, ép về false nếu scrollY=0
    if (window.scrollY <= 100) setIsScrolled(false);
    else setIsScrolled(true);
  
    const handleScroll = () => {
      if (window.scrollY > 50) setIsScrolled(true);
      else setIsScrolled(false);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);
  

  return (
    <nav className={`navbar ${isScrolled ? "shrink" : ""}`}>
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
          <Link to="/menu" className="menu-item">
            THỰC ĐƠN
          </Link>
        </li>
        <li>
          <a href="/about" className="menu-item">
            GIỚI THIỆU
          </a>
        </li>
        <li>
          <Link to="/service" className="menu-item">
            DỊCH VỤ
          </Link>
        </li>
        <li>
          <a href="#footer" className="menu-item">
            KHÁC <span className="dropdown-arrow">▼</span>
          </a>
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
