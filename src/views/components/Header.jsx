import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { handleLogout } from "../../controllers/authController";
import { auth, db } from "../../models/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import logo from "../../assets/dining-station-logo.png";

import "../style/headerStyling.css"

function Header() {
  const [restaurantId, setRestaurantId] = useState(null);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastOrderId, setLastOrderId] = useState(null);
  const navigate = useNavigate();
  const offcanvasRef = useRef(null);
  const bootstrap = window.bootstrap;

  // Close offcanvas when a link is clicked
  const closeOffcanvas = () => {
    try {
      if (window._offcanvasCloseBtn) {
        window._offcanvasCloseBtn.click(); // 🧠 This triggers proper Bootstrap hide
      }
    } catch (error) {
      console.error("Error closing offcanvas via simulated click:", error);
    }
  };

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Add this to prevent event bubbling
    const dropdownMenu = e.currentTarget.nextElementSibling;
    if (dropdownMenu) {
      // Close all other dropdowns first
      document.querySelectorAll(".dropdown-menu").forEach((menu) => {
        if (menu !== dropdownMenu) menu.classList.remove("show");
      });
      // Toggle current dropdown
      dropdownMenu.classList.toggle("show");
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If clicking outside of navbar toggler or offcanvas
      if (
        !event.target.closest(".navbar-toggler") &&
        !event.target.closest(".offcanvas")
      ) {
        closeOffcanvas();
      }

      // Only close dropdowns inside the offcanvas (Header dropdowns)
      const isHeaderDropdown = event.target.closest(
        ".offcanvas .dropdown-toggle"
      );
      if (!isHeaderDropdown) {
        document
          .querySelectorAll(".offcanvas .dropdown-menu")
          .forEach((menu) => menu.classList.remove("show"));
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch the latest order ID
  useEffect(() => {
    const fetchLatestOrder = async () => {
      if (user) {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const latestOrder = querySnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.time) - new Date(a.time))[0];
          setLastOrderId(latestOrder.id);
        } else {
          setLastOrderId(null);
        }
      }
    };
    fetchLatestOrder();
  }, [user]);

  // Fetch user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        setUser(authUser);
        setLoading(true);
        try {
          const userRef = doc(db, "users", authUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserName(data.name);
            setUserRole(data.userRole);

            if (data.userRole === "restaurant-owner") {
              const q = query(
                collection(db, "restaurants"),
                where("userId", "==", authUser.uid)
              );
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                const restaurantDoc = snapshot.docs[0];
                setRestaurantId(restaurantDoc.id);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setUserName("");
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUserLogout = async () => {
    try {
      await handleLogout();
      setUser(null);
      setUserName("");
      setUserRole(null);
      // navigate("/login");
      window.location.href = "/login"; // this is used instead of navigate to ensure the local storage is cleared for the restaurantId.
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <header className="app-header">
      <nav className="navbar navbar-expand-lg">
        <div className="container">
          <NavLink className="navbar-brand" to="/landing">
            <img src={logo} alt="Logo" className="logo" />
          </NavLink>
  
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#offcanvasNavbar"
            aria-controls="offcanvasNavbar"
            aria-label="Toggle navigation"
          >
            <span className="toggler-icon"></span>
          </button>
  
          <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasNavbar"
            aria-labelledby="offcanvasNavbarLabel"
            ref={offcanvasRef}
          >
            <div className="offcanvas-header">
              <h5 className="offcanvas-title" id="offcanvasNavbarLabel">
                <i className="fas fa-utensils me-2"></i>Menu
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="offcanvas"
                aria-label="Close"
                ref={(el) => (window._offcanvasCloseBtn = el)}
              ></button>
            </div>
            <div className="offcanvas-body text-center">
              <ul className="navbar-nav">
                <li className="nav-item">
                  <NavLink
                    className="nav-link"
                    style={{color:"#f8f9fa", padding:"0.75rem 1.25rem"}}
                    to="/landing"
                    onClick={(e) => {
                      e.preventDefault();
                      closeOffcanvas();
                      navigate("/landing");
                    }}
                  >
                    <i className="fas fa-home me-2"></i>Home
                  </NavLink>
                </li>
  
                {!loading &&
                  user &&
                  (userRole === "customer" || userRole === "admin") && (
                    <li className="nav-item">
                      <NavLink
                        className="nav-link"
                        style={{color:"#f8f9fa", padding:"0.75rem 1.25rem"}}
                        to="/restaurants"
                        onClick={closeOffcanvas}
                      >
                        <i className="fas fa-store me-2"></i>Restaurants
                      </NavLink>
                    </li>
                  )}
  
                {!loading && user && userRole === "restaurant-staff" && (
                  <li className="nav-item">
                    <NavLink
                      className="nav-link" style={{color:"#f8f9fa", padding:"0.75rem 1.25rem"}}
                      to="/my-restaurant/orders"
                      onClick={closeOffcanvas}
                    >
                      <i className="fas fa-receipt me-2"></i>Manage Orders
                    </NavLink>
                  </li>
                )}
  
                {!loading && user && userRole === "admin" && (
                  <li className="nav-item dropdown">
                    <button
                      className="nav-link dropdown-toggle" style={{color:"#f8f9fa", padding:"0.75rem 1.25rem"}}
                      onClick={toggleDropdown}
                    >
                      <i className="fas fa-microscope me-2"></i>Management
                    </button>
                    <ul className="dropdown-menu">
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/signup"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-user-plus me-2"></i>Register new user
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/admin/user-management"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-users me-2"></i>View & Manage Users
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/admin/restaurants-requests"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-store me-2"></i>Restaurants opening requests
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/admin-messages"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-comments me-2"></i>Customer Messages
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/admin/report"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-chart-bar me-2"></i>Reports
                        </NavLink>
                      </li>
                    </ul>
                  </li>
                )}
  
                {!loading && user && userRole === "restaurant-owner" && (
                  <li className="nav-item dropdown">
                    <button
                      className="nav-link dropdown-toggle" style={{color:"#f8f9fa", padding:"0.75rem 1.25rem"}}
                      onClick={toggleDropdown}
                    >
                      <i className="fas fa-store me-2"></i>My Restaurant
                    </button>
                    <ul className="dropdown-menu">
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/my-restaurant/orders"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-receipt me-2"></i>Manage Orders
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to={`/user/menu-page/${restaurantId}`}
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-burger me-2"></i>Manage Menu Item
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/my-restaurant-add-menu"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-plus me-2"></i>Add Menu Item
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/my-restaurant/register-staff"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-user-plus me-2"></i>Register Staff
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/admin/user-management"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-users me-2"></i>Manage Staff Users
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/my-restaurant/edit"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-pen-to-square me-2"></i>Edit Restaurant
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/my-restaurant/add"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-envelope me-2"></i>Request opening new restaurant
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/my-restaurant/status-report"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-chart-bar me-2"></i>Restaurant Status & Report
                        </NavLink>
                      </li>
                    </ul>
                  </li>
                )}
  
                {userRole === "customer" && (
                  <li className="nav-item">
                    <NavLink
                      className="nav-link" style={{color:"#f8f9fa", padding:"0.75rem 1.25rem"}}
                      to="/cart"
                      onClick={closeOffcanvas}
                    >
                      <i className="fas fa-shopping-cart me-2"></i>Cart
                    </NavLink>
                  </li>
                )}
  
                <li className="nav-item">
                  <NavLink
                    className="nav-link" style={{color:"#f8f9fa", padding:"0.75rem 1.25rem"}}
                    to="/about"
                    onClick={(e) => {
                      e.preventDefault();
                      closeOffcanvas();
                      navigate("/about");
                    }}
                  >
                    <i className="fas fa-info-circle me-2"></i>About
                  </NavLink>
                </li>
  
                <li className="nav-item">
                  <NavLink
                    className="nav-link" style={{color:"#f8f9fa", padding:"0.75rem 1.25rem"}}
                    to="/contact"
                    onClick={closeOffcanvas}
                  >
                    <i className="fas fa-phone me-2"></i>Contact
                  </NavLink>
                </li>
              </ul>
  
              <div className="user-section my-auto">
                {user ? (
                  <div className="nav-item dropdown">
                    <button
                      className="nav-link dropdown-toggle user-profile" style={{color:"#f8f9fa", padding:"0.75rem 1.25rem"}}
                      onClick={toggleDropdown}
                    >
                      <i className="fas fa-user-circle me-2"></i>
                      {userName}
                    </button>
                    <ul className="dropdown-menu">
                      {!loading && user && userRole === "customer" && (
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to={
                              lastOrderId
                                ? `/order/${lastOrderId}`
                                : "/orders"
                            }
                            onClick={closeOffcanvas}
                          >
                            <i className="fas fa-receipt me-2"></i>My Orders
                          </NavLink>
                        </li>
                      )}
                      <li>
                        <NavLink
                          className="dropdown-item"
                          to="/profile"
                          onClick={closeOffcanvas}
                        >
                          <i className="fas fa-user me-2"></i>Profile
                        </NavLink>
                      </li>
                      <li>
                        <hr className="dropdown-divider" />
                      </li>
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            handleUserLogout();
                            closeOffcanvas();
                          }}
                          
                        >
                          <i className="fas fa-sign-out-alt me-2"></i>Logout
                        </button>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="nav-item">
                    <NavLink
                      className="nav-link login-btn" style={{color:"#f8f9fa", padding:"0.75rem 1.25rem"}}
                      to="/login"
                      onClick={closeOffcanvas}
                    >
                      <i className="fas fa-sign-in-alt me-2"></i>Login
                    </NavLink>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header;
