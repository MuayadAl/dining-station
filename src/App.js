import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import "font-awesome/css/font-awesome.min.css";
import { CartProvider } from "./contexts/CartContext";

// Protected route
import ProtectedRoute from "./routes/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";

// Pages Imports
import LandingPage from "./views/pages/LandingPage";
import Header from "./views/components/Header";
import Footer from "./views/components/Footer";
import Login from "./views/pages/Login";
import SignUp from "./views/pages/SignUp";
import AboutPage from "./views/pages/AboutPage";
import RestaurantsPage from "./views/pages/RestaurantsPage";
import Contact from "./views/pages/Contact";
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
import Forbidden403 from "./views/pages/Forbidden403";

// Stripe pages
import Cancel from "./views/pages/Cancel";
import OrderPage from "./views/pages/orderPage";

function App() {
  const { currentUser } = useAuth();

  return (
    <CartProvider>
      <Router>
        <Header />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/landing" />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/cancel" element={<Cancel />} />
          <Route path="/403" element={<Forbidden403 />} />

          {/* Shared Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute
                element={<Profile />}
                allowedRoles={[
                  "customer",
                  "restaurant-owner",
                  "restaurant-staff",
                  "admin",
                ]}
              />
            }
          />
          <Route
            path="/restaurants"
            element={
              <ProtectedRoute
                element={<RestaurantsPage />}
                allowedRoles={["customer", "admin"]}
              />
            }
          />

          <Route
            path="/user/menu-page/:restaurantId"
            element={
              <ProtectedRoute
                element={<MenuPage />}
                allowedRoles={["customer", "restaurant-owner", "admin"]}
              />
            }
          />
          <Route
            path="/admin/user-management"
            element={
              <ProtectedRoute
                element={<AdminManageUsers />}
                allowedRoles={["admin", "restaurant-owner"]}
              />
            }
          />

          {/* Customer Routes */}
          <Route
            path="/order/:orderId"
            element={
              <ProtectedRoute
                element={<OrderPage />}
                allowedRoles={["customer"]}
              />
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute
                element={<CartPage />}
                allowedRoles={["customer"]}
              />
            }
          />
          <Route
            path="/checkout/:restaurantId"
            element={
              <ProtectedRoute
                element={<CheckoutPage />}
                allowedRoles={["customer"]}
              />
            }
          />

          {/* Restaurant Routes */}
          <Route
            path="/my-restaurant/add"
            element={
              <ProtectedRoute
                element={<AddRestaurant />}
                allowedRoles={["restaurant-owner"]}
              />
            }
          />
          <Route
            path="/my-restaurant/edit"
            element={
              <ProtectedRoute
                element={<EditRestaurant />}
                allowedRoles={["restaurant-owner"]}
              />
            }
          />
          <Route
            path="/my-restaurant/status-report"
            element={
              <ProtectedRoute
                element={<RestaurantStatusReports />}
                allowedRoles={["restaurant-owner"]}
              />
            }
          />
          <Route
            path="/my-restaurant-add-menu"
            element={
              <ProtectedRoute
                element={<AddMenuItem />}
                allowedRoles={["restaurant-owner"]}
              />
            }
          />
          <Route
            path="/my-restaurant/orders"
            element={
              <ProtectedRoute
                element={<RestaurantOrderManager />}
                allowedRoles={["restaurant-owner", "restaurant-staff"]}
              />
            }
          />
          <Route
            path="/my-restaurant/register-staff"
            element={
              <ProtectedRoute
                element={<SignUp isStaffRegistration />}
                allowedRoles={["restaurant-owner"]}
              />
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/restaurants-requests"
            element={
              <ProtectedRoute
                element={<AdminRestaurantApprovalPage />}
                allowedRoles={["admin"]}
              />
            }
          />
          <Route
            path="/admin-messages"
            element={
              <ProtectedRoute
                element={<AdminMessages />}
                allowedRoles={["admin"]}
              />
            }
          />
          <Route
            path="/admin/report"
            element={
              <ProtectedRoute
                element={<AdminReportPage />}
                allowedRoles={["admin"]}
              />
            }
          />
        </Routes>
        <Footer />
      </Router>
    </CartProvider>
  );
}

export default App;
