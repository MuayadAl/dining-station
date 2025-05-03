import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import "font-awesome/css/font-awesome.min.css";
import { CartProvider } from "./contexts/CartContext";
import { useAuth } from "./contexts/AuthContext";

// Protected Route
import ProtectedRoute from "./routes/ProtectedRoute";

// Components
import Header from "./views/components/Header";
import Footer from "./views/components/Footer";
import SpinnerFallback from "./views/components/SpinnerFallback";
import CardSkeletonFallback from "./views/components/CardSkeletonFallback";

// Lazy Loaded Pages
const LandingPage = lazy(() => import("./views/pages/LandingPage"));
const Login = lazy(() => import("./views/pages/Login"));
const SignUp = lazy(() => import("./views/pages/SignUp"));
const AboutPage = lazy(() => import("./views/pages/AboutPage"));
const RestaurantsPage = lazy(() => import("./views/pages/RestaurantsPage"));
const Contact = lazy(() => import("./views/pages/Contact"));
const Profile = lazy(() => import("./views/pages/Profile"));
const AddRestaurant = lazy(() => import("./views/pages/AddRestaurant"));
const EditRestaurant = lazy(() => import("./views/pages/EditRestaurant"));
const RestaurantStatusReports = lazy(() => import("./views/pages/RestaurantStatusReport"));
const AdminMessages = lazy(() => import("./views/pages/AdminMessages"));
const AdminRestaurantApprovalPage = lazy(() => import("./views/pages/AdminRestaurantApprovalPage"));
const AddMenuItem = lazy(() => import("./views/pages/AddMenuItem"));
const MenuPage = lazy(() => import("./views/pages/MenuPage"));
const CartPage = lazy(() => import("./views/pages/CartPage"));
const CheckoutPage = lazy(() => import("./views/pages/CheckoutPage"));
const RestaurantOrderManager = lazy(() => import("./views/pages/RestaurantOrderManager"));
const AdminReportPage = lazy(() => import("./views/pages/AdminReportPage"));
const AdminManageUsers = lazy(() => import("./views/pages/AdminManageUsers"));
const Forbidden403 = lazy(() => import("./views/pages/Forbidden403"));
const Cancel = lazy(() => import("./views/pages/Cancel"));
const OrderPage = lazy(() => import("./views/pages/OrderPage"));
const ProcessingPage = lazy(() => import("./views/pages/ProcessingPage"));

function App() {
  const { currentUser } = useAuth();

  return (
    <CartProvider>
      <Router>
        <div className="app-container">

        <Header />
        <main className="main-content">
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/landing" />} />

          <Route path="/landing" element={
            <Suspense fallback={<SpinnerFallback />}>
              <LandingPage />
            </Suspense>
          } />

          <Route path="/about" element={
            <Suspense fallback={<SpinnerFallback />}>
              <AboutPage />
            </Suspense>
          } />

          <Route path="/contact" element={
            <Suspense fallback={<SpinnerFallback />}>
              <Contact />
            </Suspense>
          } />

          <Route path="/login" element={
            <Suspense fallback={<SpinnerFallback />}>
              {currentUser ? <Navigate to="/landing" replace /> : <Login />}
            </Suspense>
          } />

          <Route path="/signup" element={
            <Suspense fallback={<SpinnerFallback />}>
              <SignUp />
            </Suspense>
          } />

          <Route path="/403" element={
            <Suspense fallback={<SpinnerFallback />}>
              <Forbidden403 />
            </Suspense>
          } />

          <Route path="/cancel" element={
            <Suspense fallback={<SpinnerFallback />}>
              <Cancel />
            </Suspense>
          } />

          <Route path="/order/processing" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProcessingPage />
            </Suspense>
          } />

          {/* Shared Routes */}
          <Route path="/profile" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<Profile />}
                allowedRoles={["customer", "restaurant-owner", "restaurant-staff", "admin"]}
              />
            </Suspense>
          } />

          <Route path="/admin/user-management" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<AdminManageUsers />}
                allowedRoles={["admin", "restaurant-owner"]}
              />
            </Suspense>
          } />

          {/* Special Skeleton Routes */}
          <Route path="/restaurants" element={
            <Suspense fallback={<CardSkeletonFallback />}>
              <ProtectedRoute
                element={<RestaurantsPage />}
                allowedRoles={["customer", "admin"]}
              />
            </Suspense>
          } />

          <Route path="/user/menu-page/:restaurantId" element={
            <Suspense fallback={<CardSkeletonFallback />}>
              <ProtectedRoute
                element={<MenuPage />}
                allowedRoles={["customer", "restaurant-owner", "admin"]}
              />
            </Suspense>
          } />

          {/* Customer Routes */}
          <Route path="/order/:orderId" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<OrderPage />}
                allowedRoles={["customer"]}
              />
            </Suspense>
          } />

          <Route path="/cart" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<CartPage />}
                allowedRoles={["customer"]}
              />
            </Suspense>
          } />

          <Route path="/checkout/:restaurantId" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<CheckoutPage />}
                allowedRoles={["customer"]}
              />
            </Suspense>
          } />

          {/* Restaurant Owner Routes */}
          <Route path="/my-restaurant/add" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<AddRestaurant />}
                allowedRoles={["restaurant-owner"]}
              />
            </Suspense>
          } />

          <Route path="/my-restaurant/edit" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<EditRestaurant />}
                allowedRoles={["restaurant-owner"]}
              />
            </Suspense>
          } />

          <Route path="/my-restaurant/status-report" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<RestaurantStatusReports />}
                allowedRoles={["restaurant-owner"]}
              />
            </Suspense>
          } />

          <Route path="/my-restaurant-add-menu" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<AddMenuItem />}
                allowedRoles={["restaurant-owner"]}
              />
            </Suspense>
          } />

          <Route path="/my-restaurant/orders" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<RestaurantOrderManager />}
                allowedRoles={["restaurant-owner", "restaurant-staff"]}
              />
            </Suspense>
          } />

          <Route path="/my-restaurant/register-staff" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<SignUp isStaffRegistration />}
                allowedRoles={["restaurant-owner"]}
              />
            </Suspense>
          } />

          {/* Admin Routes */}
          <Route path="/admin/restaurants-requests" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<AdminRestaurantApprovalPage />}
                allowedRoles={["admin"]}
              />
            </Suspense>
          } />

          <Route path="/admin-messages" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<AdminMessages />}
                allowedRoles={["admin"]}
              />
            </Suspense>
          } />

          <Route path="/admin/report" element={
            <Suspense fallback={<SpinnerFallback />}>
              <ProtectedRoute
                element={<AdminReportPage />}
                allowedRoles={["admin"]}
              />
            </Suspense>
          } />

        </Routes>
        </main>
        <Footer />
        </div>

      </Router>
    </CartProvider>
  );
}

export default App;
