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
import CategoryProductManagement from "./pages/Chef/Cateogry/CategoryManagement";
import { ToastContainer } from "react-toastify"; // Thêm ToastContainer
import "react-toastify/dist/ReactToastify.css"; // Thêm CSS của react-toastify
import Login from "../src/pages/Login/Login"
import Register from "../src/pages/Register/Register"
import MenuItemManagement from "./pages/Chef/Food/MenuItemManagement";
import DeletedMenuItems from "./pages/Chef/Food/DeletedMenuItems";

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
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/chef" element={<ChefLayout />}>
            {/* Thêm các route con */}
            <Route path="dashboard" element={<h2>Đây là màn hình: <span style={{ color: "#f4a70b" }}>Dashboard</span></h2>} />
            <Route path="manage-categories" element={<CategoryProductManagement />} />
            <Route path="products" element={<MenuItemManagement/>} />
            <Route path="deleted-menu-items" element={<DeletedMenuItems/>} />
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