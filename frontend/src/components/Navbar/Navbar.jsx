import React, { useState, useEffect, useContext, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { assets } from "../../assets/assets";
import { AuthContext } from "../../context/AuthContext";

const Navbar = ({ setShowLogin, isPositionUnset }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const { user, logout, isAuthenticated } = useContext(AuthContext);
  const dropdownRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate("/");
    } else {
      alert(result.message);
    }
    setShowDropdown(false);
  };

  return (
    <nav className={`navbar${isScrolled ? " shrink" : ""}${isPositionUnset ? " unset-position" : ""}`}>
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
        <button onClick={() => navigate("/table-booking")} className="btn-book">ĐẶT BÀN</button>
        {isAuthenticated ? (
          <div className="user-profile" ref={dropdownRef}>
            <button
              className="user-profile-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {user?.user?.username || "Người dùng"}
              <span className="dropdown-arrow">▼</span>
            </button>
            {showDropdown && (
              <div className="user-dropdown">
                <Link to="/profile" onClick={() => setShowDropdown(false)}>
                  Thông tin cá nhân
                </Link>
                <button onClick={handleLogout}>Đăng xuất</button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn-login"
            onClick={() => setShowLogin && setShowLogin(true)}
          >
            <Link to="/login">Đăng nhập</Link>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
