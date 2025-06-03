import React, { useState } from "react";
import Navbar from "./components/Navbar/Navbar";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home/Home";
import Cart from "./pages/Cart/Cart";
import Menu from "./pages/Menu/Menu";
import Footer from "./components/Footer/Footer";
import ServicePage from "./components/ServicePage/ServicePage";
import AboutPage from "./pages/AboutPage/AboutPage";
import ScrollToTopButton from "./components/Scroll/ScrollToTopButton";
import ChefLayout from "./pages/Chef/ChefLayout";
import { useLocation } from "react-router-dom";
import CategoryProductManagement from "./pages/Chef/CategoryProductManagement";
import { ToastContainer } from "react-toastify"; // Thêm ToastContainer
import "react-toastify/dist/ReactToastify.css"; // Thêm CSS của react-toastify

const App = () => {
  const location = useLocation();
  const isChefPage = location.pathname.includes("/chef");

  return (
    <>
      <div className="app">
        {!isChefPage && <Navbar />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/chef" element={<ChefLayout />}>
            {/* Thêm các route con */}
            <Route path="dashboard" element={<h2>Đây là màn hình: <span style={{ color: "#f4a70b" }}>Dashboard</span></h2>} />
            <Route path="manage-categories" element={<CategoryProductManagement />} />
            <Route path="products" element={<h2>Đây là màn hình: <span style={{ color: "#f4a70b" }}>Sản phẩm</span></h2>} />
            <Route path="trash" element={<h2>Đây là màn hình: <span style={{ color: "#f4a70b" }}>Sản phẩm tạm xóa</span></h2>} />
          </Route>
        </Routes>
        {!isChefPage && <ScrollToTopButton />}
        {!isChefPage && <Footer />}
      </div>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default App;