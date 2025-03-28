import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import "font-awesome/css/font-awesome.min.css";
import { CartProvider } from "./contexts/CartContext";
// Pages Imports
import LandingPage from "./views/pages/LandingPage";
import Header from "./views/components/Header";
import Footer from "./views/components/Footer";
import Login from "./views/components/Login";
import SignUp from "./views/components/SignUp";
import AboutPage from "./views/pages/AboutPage";
import ResturantsPage from "./views/pages/RestaurantsPage";
import Contact from "./views/pages/Contact";
import RegisteredSuccess from "./views/pages/RegisteredSuccess";
import Profile from "./views/pages/Profile";
import AddRestaurant from "./views/pages/AddRestaurant";
import EditRestaurant from "./views/pages/EditRestaurant";
import RestaurantStatusReports from "./views/pages/RestaurantStatusReport";
import AdminMessages from "./views/pages/AdminMessages";
import AdminRestaurantApprovalPage from "./views/pages/AdminRestaurantApprovalPage";
import AddMenuItem from "./views/pages/AddMenuItem";
import MenuPage from "./views/pages/MenuPage";
import CartPage from "./views/pages/CartPage";
import CheckoutPage from "./views/pages/CheckoutPage";
import RestaurantOrderManager from "./views/pages/RestaurantOrderManager";
import AdminReportPage from "./views/pages/AdminReportPage";
import AdminManageUsers from "./views/pages/AdminManageUsers";

// Stripe pages
import Cancel from "./views/pages/Cancel";
import OrderPage from "./views/pages/orderPage";

function App() {
  return (
    <CartProvider>

    <Router>
      <Header />
      <Routes>
        {/* Logo navigation starts */}
        <Route path="/" element={<Navigate to="/landing" />} />
        {/* Logo navigation ends */}

        {/* Common navigation starts*/}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/restaurants" element={<ResturantsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/registered-success" element={<RegisteredSuccess />} />
        <Route path="/user/menu-page/:restaurantId" element={<MenuPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/cancel" element={<Cancel />} />

        {/* Common navigation ends*/}

        {/* User Dashboard */}
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout/:restaurantId" element={<CheckoutPage />} />
        <Route path="/order/:orderId" element={<OrderPage />} />

        {/* Restaurant Dashboard */}
        <Route path="/my-restaurant/add" element={<AddRestaurant />} />
        <Route path="/my-restaurant/edit" element={<EditRestaurant />} />
        <Route
          path="/my-restaurant/status-report"
          element={<RestaurantStatusReports />}
        />
        <Route path="/my-restaurant-add-menu" element={<AddMenuItem />} />
        <Route
          path="/my-restaurant/orders"
          element={<RestaurantOrderManager />}
        />
        <Route
          path="/my-restaurant/register-staff"
          element={<SignUp isStaffRegistration={true} />}
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin/restaurants-requests"
          element={<AdminRestaurantApprovalPage />}
        />
        <Route path="/messagesadmin" element={<AdminMessages />} />
        <Route path="/admin/report" element={<AdminReportPage />} />
        <Route path="/admin/user-management" element={<AdminManageUsers />} />
      </Routes>
      <Footer />
    </Router>
    </CartProvider>
  );
}

export default App;
