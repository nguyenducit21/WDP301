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
import ImportDashboard from "./pages/Dashboard-Inventory/Dashboard";
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
import AvailableMenuItems from './pages/Chef/Inventory/AvailableMenuItems';
import MenuDashboard from "./pages/Chef/Menu-Dashboard/MenuDashboard";
import ChefDashboard from "./pages/Chef/Dashboard/ChefDashboard";
import EmployeeManagement from './pages/EmployeeManagement/EmployeeManagement';
import PermissionManagement from './pages/PermissionManagement/PermissionManagement';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from "react-toastify";
import AreaManagement from "./pages/TableManagement/AreaManagement";
import Profile from "./pages/Profile/Profile"
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import Orders from "./pages/Chef/Orders/Orders";
import TableLayout from "./pages/TableManagement/TableLayout";
import ReservationManagement from "./pages/TableManagement/ReservationManagement";
import WaiterLayout from "./pages/Waiter/WaiterLayout";
import WaiterDashboard from "./pages/Dashboard/WaiterDashboard";
import WaiterProducts from "./pages/Waiter/WaiterProducts";
import Schedule from "./pages/Waiter/Schedule/Schedule";
import PromotionManagement from './pages/PromotionManagement';
import ManagerDashboard from "./pages/Dashboard/ManagerDashboard";
import ManagerLayout from "./pages/Manager/ManagerLayout";
import AdminLayout from "./pages/Admin/AdminLayout";
import TableWaiter from "./pages/Waiter/Table/TableWaiter";
import ScheduleManagement from "./pages/Manager/ScheduleManagement";
import OrderAssignmentsPage from "./pages/OrderAssignmentsPage";

const App = () => {
  const location = useLocation();
  const isChefPage = location.pathname.includes("/chef");
  const isTableBooking = location.pathname.includes("/table-booking");
  const isMenuPage = location.pathname.includes("/menu");
  const isDashboardPage = location.pathname.includes("/dashboard");
  const isWaiterPage = location.pathname.includes("/waiter");
  const isManagerPage = location.pathname.includes("/manager");

  return (
    <>
      <div className="app">
        {!isChefPage && !isDashboardPage && !isWaiterPage && !isManagerPage && <Navbar isPositionUnset={isTableBooking || isMenuPage} />}
        <Routes>
          <Route path="/order-assignments" element={<OrderAssignmentsPage />} />
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/tables" element={<TableManagement />} />
          <Route path="/dashboard/permissions" element={<PermissionManagement />} />
          <Route path="/table-booking" element={<Reservation />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="employees" element={<EmployeeManagement />} />
          </Route>


          {/* Manager */}
          <Route path="/manager" element={<ManagerLayout />}>
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="promotion-management" element={<PromotionManagement />} />
            <Route path="products" element={<MenuItemManagement />} />
            <Route path="table-layout" element={<TableLayout />} />
            <Route path="reservation-management" element={<ReservationManagement />} />
            <Route path="areas" element={<AreaManagement />} />
            <Route path="dish/dashboard" element={<MenuDashboard />} />
            <Route path="menu/management" element={<MenuItemManagement />} />
            <Route path="menu/category" element={<CategoryManagement />} />
            <Route path="deleted-menu-items" element={<DeletedMenuItems />} />
            <Route path="employees" element={<EmployeeManagement />} />
            <Route path="schedule" element={<ScheduleManagement />} />
          </Route>


          {/* Chef */}
          <Route path="/chef" element={<ChefLayout />}>
            <Route path="orders" element={<Orders />} />
            <Route path="dashboard" element={<ChefDashboard />} />
            <Route path="inventory/analytics" element={<ImportDashboard />} />
            <Route path="menu/dashboard" element={<MenuDashboard />} />
            <Route path="products" element={<MenuItemManagement />} />
            <Route path="manage-categories" element={<CategoryManagement />} />
            <Route path="deleted-menu-items" element={<DeletedMenuItems />} />
            <Route path="recipes" element={<RecipeManagement />} />
            <Route path="import-receipts" element={<ImportReceiptList />} />
            <Route path="import-receipts/create" element={<ImportReceiptCreate />} />
            <Route path="import-receipts/:id" element={<ImportReceiptDetail />} />
            <Route path="inventory-list" element={<InventoryList />} />
            <Route path="available-menu-items" element={<AvailableMenuItems />} />
            <Route path="stock-check" element={<StockCheck />} />
            <Route path="inventory/:id" element={<InventoryDetail />} />
          </Route>

          <Route path="/profile" element={<Profile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Waiter */}
          <Route path="/waiter" element={<WaiterLayout />}>
            <Route index element={<WaiterDashboard />} />
            <Route path="table-layout" element={<TableWaiter />} />
            <Route path="reservation-management" element={<ReservationManagement />} />
            <Route path="areas" element={<AreaManagement />} />
            <Route path="products" element={<WaiterProducts />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="order-assignments" element={<OrderAssignmentsPage />} />
            <Route path="menu" element={<Menu />} />

          </Route>

        </Routes>
        {!isChefPage && <ScrollToTopButton />}
        {!isChefPage && !isDashboardPage && !isWaiterPage && !isManagerPage && <Footer />}
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
