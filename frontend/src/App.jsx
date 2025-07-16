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
import Dashboard from "./pages/Dashboard-Inventory/Dashboard";
import TableManagement from "./pages/Manager/TableManagement/TableManagement";
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
import MenuDashboard from "./pages/Chef/Menu-Dashboard/MenuDashboard";
import ChefDashboard from "./pages/Chef/Dashboard/ChefDashboard";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from "react-toastify";
import AreaManagement from "./pages/Manager/AreaManagement/AreaManagement";
import Profile from "./pages/Profile/Profile"
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import Orders from "./pages/Chef/Orders/Orders";
import WaiterLayout from "./pages/Waiter/WaiterLayout";
import WaiterDashboard from "./pages/Waiter/Dashboard/WaiterDashboard";
import WaiterReservations from "./pages/Waiter/Reservations/WaiterReservations";
import WaiterOrders from "./pages/Waiter/Orders/WaiterOrders";
import AdminDashboard from "./pages/Admin/Dashboard/Dashboard";
import AdminLayout from "./pages/Admin/AdminLayout";
import ManagerLayout from "./pages/Manager/ManagerLayout";
import ManagerDashboard from "./pages/Manager/Dashboard/Dashboard";
import ReservationManagement from "./pages/Manager/ReservationManagement/ReservationManagement";

const App = () => {
  const location = useLocation();
  const isChefPage = location.pathname.includes("/chef");
  const isTableBooking = location.pathname.includes("/table-booking");
  const isMenuPage = location.pathname.includes("/menu");
  const isManagerPage = location.pathname.includes("/manager");
  const isWaiterPage = location.pathname.includes("/waiter");
  const isAdminPage = location.pathname.includes("/admin");
  return (
    <>
      <div className="app">
        {!isChefPage && !isManagerPage && !isWaiterPage && !isAdminPage && <Navbar isPositionUnset={isTableBooking || isMenuPage} />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Manager Routes */}
          <Route path="/manager" element={<ManagerLayout />}>
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="tables" element={<TableManagement />} />
            <Route path="areas" element={<AreaManagement />} />
            <Route path="reservations" element={<ReservationManagement />} />
          </Route>

          {/* Customer Routes */}
          <Route path="/table-booking" element={<Reservation />} />

          {/* Chef Routes */}
          <Route path="/chef" element={<ChefLayout />}>
            <Route path="orders" element={<Orders />} />
            <Route path="dashboard" element={<ChefDashboard />} />
            <Route path="inventory/analytics" element={<Dashboard />} />
            <Route path="menu/dashboard" element={<MenuDashboard />} />
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

          {/* Waiter Routes */}
          <Route path="/waiter" element={<WaiterLayout />}>
            <Route path="dashboard" element={<WaiterDashboard />} />
            <Route path="reservations" element={<WaiterReservations />} />
            <Route path="orders" element={<WaiterOrders />} />
            {/* <Route path="tables" element={<TableManagement />} />
            <Route path="checkout" element={<Checkout />} /> */}
          </Route>

          {/* Other Routes */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

        </Routes>
        {!isChefPage && <ScrollToTopButton />}
        {!isChefPage && !isManagerPage && !isWaiterPage && !isAdminPage && <Footer />}
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
