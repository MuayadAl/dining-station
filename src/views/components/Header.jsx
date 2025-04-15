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
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div
      className="header_section header_bg navbar-light"
      style={{ position: "sticky", top: "0", zIndex: "1000" }}
    >
      <div className="container">
        <nav className="navbar navbar-expand-lg navbar-dark">
          <div className="container-fluid">
            <NavLink className="navbar-brand" to="/landing">
              <img src={logo} alt="Logo" />
            </NavLink>

            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="offcanvas"
              data-bs-target="#offcanvasNavbar"
              aria-controls="offcanvasNavbar"
              aria-label="Toggle navigation"
            >
              <i className="fa fa-bars" style={{ color: "black" }}></i>
            </button>

            <div
              className="offcanvas offcanvas-end text-bg-dark w-75"
              tabIndex="-1"
              id="offcanvasNavbar"
              aria-labelledby="offcanvasNavbarLabel"
              ref={offcanvasRef}
            >
              <div className="offcanvas-header border-bottom">
                <h5
                  className="offcanvas-title text-white"
                  id="offcanvasNavbarLabel"
                >
                  <i className="fa-solid fa-utensils"></i> Menu
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  data-bs-dismiss="offcanvas"
                  aria-label="Close"
                  ref={(el) => (window._offcanvasCloseBtn = el)}
                ></button>
              </div>
              <div className="offcanvas-body">
                <ul className="navbar-nav flex-grow-1">
                  <li className="nav-item">
                    <NavLink
                      className="nav-link text-white"
                      to="/landing"
                      onClick={(e) => {
                        e.preventDefault();
                        closeOffcanvas();
                        navigate("/landing");
                      }}
                    >
                      <i className="fa-solid fa-house-user"></i> Home
                    </NavLink>
                  </li>

                  {!loading &&
                    user &&
                    (userRole === "customer" || userRole === "admin") && (
                      <li className="nav-item">
                        <NavLink
                          className="nav-link text-white"
                          to="/restaurants"
                          onClick={closeOffcanvas}
                        >
                          <i className="fa-solid fa-store"></i> Restaurants
                        </NavLink>
                      </li>
                    )}

                  {!loading && user && userRole === "restaurant-staff" && (
                    <li className="nav-item">
                      <NavLink
                        className="nav-link text-white"
                        to="/my-restaurant/orders"
                        onClick={closeOffcanvas}
                      >
                        <i className="fa-solid fa-receipt"></i> Manage Orders
                      </NavLink>
                    </li>
                  )}

                  {!loading && user && userRole === "admin" && (
                    <li className="nav-item dropdown">
                      <button
                        className="nav-link dropdown-toggle text-white"
                        onClick={toggleDropdown}
                      >
                        <i className="fa-solid fa-microscope"></i> Management
                      </button>
                      <ul className="dropdown-menu dropdown-menu-dark">
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/signup"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-user-plus"></i> Register
                            new user
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/admin/user-management"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-users"></i> View & Manage
                            Users
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/admin/restaurants-requests"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-store"></i> Restaurants
                            opening requests
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/admin-messages"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-comments"></i> Customer
                            Messages
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/admin/report"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-chart-bar"></i> Reports
                          </NavLink>
                        </li>
                      </ul>
                    </li>
                  )}

                  {!loading && user && userRole === "restaurant-owner" && (
                    <li className="nav-item dropdown">
                      <button
                        className="nav-link dropdown-toggle text-white"
                        onClick={toggleDropdown}
                      >
                        <i className="fa-solid fa-store"></i> My Restaurant
                      </button>
                      <ul className="dropdown-menu dropdown-menu-dark">
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/orders"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-receipt"></i> Manage
                            Orders
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to={`/user/menu-page/${restaurantId}`}
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-burger"></i> Manage Menu
                            Item
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant-add-menu"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-plus"></i> Add Menu Item
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/register-staff"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-user-plus"></i> Register
                            Staff
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/admin/user-management"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-users"></i> Manage Staff
                            Users
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/edit"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-pen-to-square"></i> Edit
                            Restaurant
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/add"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-envelope"></i> Request
                            opening new restaurant
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/status-report"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa-solid fa-chart-bar"></i> Restaurant
                            Status & Report
                          </NavLink>
                        </li>
                      </ul>
                    </li>
                  )}

                  <li className="nav-item">
                    <NavLink
                      className="nav-link text-white"
                      to="/about"
                      onClick={(e) => {
                        e.preventDefault();
                        closeOffcanvas();
                        navigate("/about");
                      }}
                    >
                      <i className="fa-solid fa-info"></i> About
                    </NavLink>
                  </li>

                  <li className="nav-item">
                    <NavLink
                      className="nav-link text-white"
                      to="/contact"
                      onClick={closeOffcanvas}
                    >
                      <i className="fa-solid fa-phone"></i> Contact
                    </NavLink>
                  </li>
                  {userRole === "customer" && (
                    <li className="nav-item">
                      <NavLink
                        className="nav-link text-white"
                        to="/cart"
                        onClick={closeOffcanvas}
                      >
                        <i className="fa-solid fa-cart-shopping"></i> Cart
                      </NavLink>
                    </li>
                  )}
                </ul>

                <div className="" style={{ paddingTop: "30px" }}>
                  {user ? (
                    <li className="nav-item dropdown">
                      <button
                        className="nav-link dropdown-toggle text-white"
                        onClick={toggleDropdown}
                      >
                        <i className="fa-solid fa-user me-2"></i>
                        {userName}
                      </button>
                      <ul className="dropdown-menu dropdown-menu-dark">
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
                              <i className="fa-solid fa-receipt"></i> My Orders
                            </NavLink>
                          </li>
                        )}
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/profile"
                            onClick={closeOffcanvas}
                          >
                            <i className="fa fa-user me-2"></i> Profile
                          </NavLink>
                        </li>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                        <li>
                          <button
                            className="dropdown-item"
                            onClick={handleUserLogout}
                          >
                            <i className="fa-solid fa-right-from-bracket"></i>{" "}
                            Logout
                          </button>
                        </li>
                      </ul>
                    </li>
                  ) : (
                    <li className="nav-item">
                      <NavLink
                        className="nav-link text-white"
                        to="/login"
                        onClick={closeOffcanvas}
                      >
                        <i className="fa fa-user me-2"></i> Login
                      </NavLink>
                    </li>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

export default Header;
