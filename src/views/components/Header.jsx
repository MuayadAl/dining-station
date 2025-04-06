import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useRef, useEffect } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true); // Track loading state
  const navbarRef = useRef(null);
  const navigate = useNavigate();
  const [lastOrderId, setLastOrderId] = useState(null);

  const closeNavbar = () => setIsOpen(false);

  // Fetch the latest order ID for the logged-in user
  useEffect(() => {
    const fetchLatestOrder = async () => {
      if (user) {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Get the most recent order based on time
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

  // Close navbar if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        closeNavbar();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch user data & role from Firestore
  useEffect(() => {
    if (!user) {
      // Prevent redundant calls
      const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
        if (authUser) {
          setUser(authUser);
          setLoading(true);
          try {
            const userRef = doc(db, "users", authUser.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
              setUserName(userDoc.data().name);
              setUserRole(userDoc.data().userRole);
            }
            // Add this inside the onAuthStateChanged logic, after you set the userRole
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUserName(data.name);
              setUserRole(data.userRole);

              // If the user is a restaurant owner, get their restaurantId
              if (data.userRole === "restaurant-owner") {
                const q = query(
                  collection(db, "restaurants"),
                  where("userId", "==", authUser.uid)
                );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                  const restaurantDoc = snapshot.docs[0];
                  setRestaurantId(restaurantDoc.id); // ✅ Set the ID
                }
              }
            }
            // Add this inside the onAuthStateChanged logic, after you set the userRole
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUserName(data.name);
              setUserRole(data.userRole);

              // If the user is a restaurant owner, get their restaurantId
              if (data.userRole === "restaurant-owner") {
                const q = query(
                  collection(db, "restaurants"),
                  where("userId", "==", authUser.uid)
                );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                  const restaurantDoc = snapshot.docs[0];
                  setRestaurantId(restaurantDoc.id); // ✅ Set the ID
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
    }
  }, [user]); // Add user as dependency

  // Handle Logout
  const handleUserLogout = async () => {
    try {
      await handleLogout();
      setUser(null); // Reset user state
      setUserName(""); // Reset userName state
      setUserRole(null); // Reset userRole state
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div
      className="d-flex header_section header_bg navbar-light"
      style={{ position: "sticky", top: "0", zIndex: "1000" }}
    >
      <div className="container">
        <nav className="navbar navbar-expand-lg navbar-dark">
          <div className="container-fluid">
            {/* ✅ Brand Logo */}
            <NavLink className="navbar-brand" to="/landing">
              <img src={logo} alt="Logo" />
            </NavLink>

            {/* ✅ Offcanvas Toggle Button */}
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

            {/* ✅ Dark Offcanvas Sidebar */}
            <div
              className="offcanvas offcanvas-end text-bg-dark w-75 "
              tabIndex="-1"
              id="offcanvasNavbar"
              aria-labelledby="offcanvasNavbarLabel"
            >
              <div className="offcanvas-header border-bottom">
                <h5
                  className="offcanvas-title text-white"
                  id="offcanvasNavbarLabel"
                >
                  <i class="fa-solid fa-utensils"></i> Menu
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white "
                  data-bs-dismiss="offcanvas"
                  aria-label="Close"
                ></button>
              </div>
              <div className="offcanvas-body ">
                {/* ✅ Navbar Links */}
                <ul className="navbar-nav me-auto mb-2 mb-lg-0 ">
                  {" "}
                  {/* border-bottom*/}
                  <li className="nav-item">
                    <NavLink className="nav-link text-white" to="/landing">
                      <i class="fa-solid fa-house-user"></i> Home
                    </NavLink>
                  </li>
                  {/* Customer Dashboard */}
                  {!loading && user && userRole === "customer" && (
                    <>
                      <li className="nav-item">
                        <NavLink
                          className="nav-link text-white"
                          to="/restaurants"
                        >
                          <i class="fa-solid fa-store"></i> Restaurants
                        </NavLink>
                      </li>
                    </>
                  )}
                  {/* Restaurant-staff Dashboard */}
                  {!loading && user && userRole === "restaurant-staff" && (
                    <li className="nav-item">
                      <NavLink
                        className="nav-link text-white"
                        to="/my-restaurant/orders"
                      >
                        <i class="fa-solid fa-receipt"></i> Manage Orders
                      </NavLink>
                    </li>
                  )}
                  {/* Admin Drop down menu */}
                  {!loading && user && userRole === "admin" && (
                    <li className="nav-item dropdown">
                      <button
                        className="nav-link dropdown-toggle text-white"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <i class="fa-solid fa-microscope"></i> Management
                      </button>
                      <ul className="dropdown-menu dropdown-menu-dark">
                        <li>
                          <NavLink className="dropdown-item" to="/signup">
                            <i class="fa-solid fa-user-plus"></i> Register new
                            user
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/admin/user-management"
                          >
                            <i class="fa-solid fa-users"></i> View & Manage
                            Users
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/admin/restaurants-requests"
                          >
                            <i class="fa-solid fa-store"></i> Restaurants
                            opening requests
                          </NavLink>
                        </li>

                        <li className="nav-item">
                          <NavLink
                            className="dropdown-item"
                            to="/admin-messages"
                          >
                            <i class="fa-solid fa-comments"></i> Customer
                            Messages
                          </NavLink>
                        </li>
                        <li className="nav-item">
                          <NavLink className="dropdown-item" to="/admin/report">
                            <i class="fa-solid fa-chart-bar"></i> Reports
                          </NavLink>
                        </li>
                      </ul>
                    </li>
                  )}
                  {/*restaurant-owner Dashboard */}
                  {!loading && user && userRole === "restaurant-owner" && (
                    <li className="nav-item dropdown">
                      <button
                        className="nav-link dropdown-toggle text-white"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        My Restaurant
                      </button>
                      <ul className="dropdown-menu dropdown-menu-dark">
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/orders"
                          >
                            <i class="fa-solid fa-receipt"></i> Manage Orders
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/add"
                          >
                            <i class="fa-solid fa-envelope"></i> Request opening
                            new restaurant
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/edit"
                          >
                            <i class="fa-solid fa-pen-to-square"></i> Edit
                            Restaurant
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to={`/user/menu-page/${restaurantId}`}
                          >
                            <i class="fa-solid fa-burger"></i> Manage Menu Item
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant-add-menu"
                          >
                            <i class="fa-solid fa-plus"></i> Add Menu Item
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/register-staff"
                          >
                            <i class="fa-solid fa-user-plus"></i> Register Staff
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/admin/user-management"
                          >
                            <i class="fa-solid fa-users"></i> Manage Staff Users
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/status-report"
                          >
                            <i class="fa-solid fa-chart-bar"></i> Restaurant
                            Status & Report
                          </NavLink>
                        </li>
                      </ul>
                    </li>
                  )}
                  <li className="nav-item">
                    <NavLink className="nav-link text-white" to="/about">
                      <i class="fa-solid fa-info"></i> About
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link text-white" to="/contact">
                      <i class="fa-solid fa-phone"></i> Contact
                    </NavLink>
                  </li>
                  {/* Cart for customer dashboard */}
                  {userRole === "customer" && (
                    <li className="nav-item">
                      <NavLink
                        className="nav-link text-white"
                        to="/cart"
                        onClick={closeNavbar}
                      >
                        <i class="fa-solid fa-cart-shopping"></i>
                        <span className=""> Cart</span>
                      </NavLink>
                    </li>
                  )}
                </ul>

                {/* Profile Dropdown - aligned and styled to match nav */}
                <div className="" style={{ marginTop: "30px" }}>
                  {user ? (
                    <li className="nav-item dropdown ">
                      <button
                        className="nav-link dropdown-toggle text-white"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <i className="fa-solid fa-user me-2"></i>
                        {userName}
                      </button>
                      <ul className="dropdown-menu dropdown-menu-dark ">
                        {!loading && user && userRole === "customer" && (
                          <>
                            <li className="">
                              <NavLink
                                className="dropdown-item"
                                to={
                                  lastOrderId
                                    ? `/order/${lastOrderId}`
                                    : "/orders"
                                }
                                onClick={closeNavbar}
                              >
                                <i class="fa-solid fa-receipt"></i> My Orders
                              </NavLink>
                            </li>
                          </>
                        )}
                        <li>
                          <NavLink className="dropdown-item " to="/profile">
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
                            <i class="fa-solid fa-right-from-bracket"></i>{" "}
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
                        onClick={closeNavbar}
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
