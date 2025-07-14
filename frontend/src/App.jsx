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
import CategoryManagement from "./pages/Chef/Cateogry/CategoryManagement";
import RecipeManagement from "./pages/Chef/Recipe/RecipeManagement";
import ImportReceiptList from "./pages/Chef/ImportReceipt/ImportReceiptList";
import ImportReceiptCreate from "./pages/Chef/ImportReceipt/ImportReceiptCreate";
import ImportReceiptDetail from "./pages/Chef/ImportReceipt/ImportReceiptDetail";
import InventoryList from "./pages/Chef/Inventory/InventoryList";
import StockCheck from './pages/Chef/Inventory/StockCheck';
import InventoryDetail from './pages/Chef/Inventory/InventoryDetail';
import EmployeeManagement from './pages/EmployeeManagement/EmployeeManagement';
import PermissionManagement from './pages/PermissionManagement/PermissionManagement';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from "react-toastify";
import AreaManagement from "./pages/TableManagement/AreaManagement";
import Profile from "./pages/Profile/Profile"
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";

const App = () => {
  const location = useLocation();
  const isChefPage = location.pathname.includes("/chef");
  const isTableBooking = location.pathname.includes("/table-booking");
  const isMenuPage = location.pathname.includes("/menu");

  return (
    <>
      <div className="app">
        {!isChefPage && <Navbar isPositionUnset={isTableBooking || isMenuPage} />}
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
          <Route path="/dashboard/employees" element={<EmployeeManagement />} />
          <Route path="/dashboard/permissions" element={<PermissionManagement />} />
          <Route path="/table-booking" element={<Reservation />} />
          <Route path="/chef" element={<ChefLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<MenuItemManagement />} />
            <Route path="manage-categories" element={<CategoryManagement />} />
            <Route path="deleted-menu-items" element={<DeletedMenuItems />} />
            <Route path="recipes" element={<RecipeManagement />} />
            <Route path="import-receipts" element={<ImportReceiptList />} />
            <Route path="import-receipts/create" element={<ImportReceiptCreate />} />
            <Route path="import-receipts/:id" element={<ImportReceiptDetail />} />
            <Route path="inventory-list" element={<InventoryList />} />
            <Route path="stock-check" element={<StockCheck />} />
            <Route path="inventory/:id" element={<InventoryDetail />} />
          </Route>
          <Route path="/dashboard/areas" element={<AreaManagement />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

        </Routes>
        {!isChefPage && <ScrollToTopButton />}
        {!isChefPage && <Footer />}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </>
  );
};

export default App;
