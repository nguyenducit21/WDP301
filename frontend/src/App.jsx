import React, { useState } from "react";
import Navbar from "./components/Navbar/Navbar";
import { Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home/Home";
import Cart from "./pages/Cart/Cart"
import Menu from "./pages/Menu/Menu"
import Footer from "./components/Footer/Footer";
import ServicePage from "./components/ServicePage/ServicePage";
import AboutPage from "./pages/AboutPage/AboutPage";
import ScrollToTopButton from "./components/Scroll/ScrollToTopButton";
import Login from "../src/pages/Login/Login"
import Register from "../src/pages/Register/Register"
import Dashboard from "./pages/Dashboard/Dashboard";
import TableManagement from "./pages/TableManagement/TableManagement";
import Reservation from "./pages/Reservation";
import ChefLayout from "./pages/Chef/ChefLayout";
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/tables" element={<TableManagement />} />
          <Route path="/table-booking" element={<Reservation />} />
          <Route path="/chef" element={<ChefLayout />}>
            {/* Thêm các route con */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<MenuItemManagement/>} />
            <Route path="deleted-menu-items" element={<DeletedMenuItems/>} />
          </Route>
        </Routes>
        {!isChefPage && <ScrollToTopButton />}
        {!isChefPage && <Footer />}
       
      </div>
    </>
  );
};

export default App;
