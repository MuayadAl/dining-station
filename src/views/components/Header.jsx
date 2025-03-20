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

  const closeNavbar = () => setIsOpen(false);

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
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        setUser(authUser);
        setLoading(true);

        try {
          // Fetch user details
          const userRef = doc(db, "users", authUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            setUserName(userDoc.data().name);
            setUserRole(userDoc.data().userRole);

            // If the user is a restaurant owner, fetch their restaurant document
            if (userDoc.data().userRole === "restaurant-owner") {
              const restaurantsQuery = collection(db, "restaurants");
              const querySnapshot = await getDocs(
                query(restaurantsQuery, where("userId", "==", authUser.uid))
              );

              if (!querySnapshot.empty) {
                const restaurantDoc = querySnapshot.docs[0]; // Assuming one restaurant per owner
                setRestaurantId(restaurantDoc.id);
              } else {
                console.log("No restaurant found for this owner.");
                setRestaurantId(null);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user or restaurant data: ", error);
          setUserName("");
          setUserRole(null);
          setRestaurantId(null);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setUserName("");
        setUserRole(null);
        setRestaurantId(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
      className="header_section header_bg navbar-light"
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
              className="offcanvas offcanvas-end text-bg-dark w-75"
              tabIndex="-1"
              id="offcanvasNavbar"
              aria-labelledby="offcanvasNavbarLabel"
            >
              <div className="offcanvas-header">
                <h5
                  className="offcanvas-title text-white"
                  id="offcanvasNavbarLabel"
                >
                  Menu
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  data-bs-dismiss="offcanvas"
                  aria-label="Close"
                ></button>
              </div>
              <div className="offcanvas-body">
                {/* ✅ Navbar Links */}
                <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                  <li className="nav-item">
                    <NavLink className="nav-link text-white" to="/landing">
                      Home
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link text-white" to="/restaurants">
                      Restaurants
                    </NavLink>
                  </li>

                  {/* Admin Drop down menu */}
                  {!loading && user && userRole === "admin" && (
                    <li className="nav-item dropdown">
                      <button
                        className="nav-link dropdown-toggle text-white"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        Management
                      </button>
                      <ul className="dropdown-menu dropdown-menu-dark">
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/admin/restaurants-requests"
                          >
                            Restaurants opening requests
                          </NavLink>
                        </li>

                        <li className="nav-item">
                          <NavLink
                            className="dropdown-item"
                            to="/messagesadmin"
                          >
                            Customer Messages
                          </NavLink>
                        </li>
                      </ul>
                    </li>
                  )}
                  <li className="nav-item">
                    <NavLink className="nav-link text-white" to="/about">
                      About
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link text-white" to="/contact">
                      Contact
                    </NavLink>
                  </li>

                  {/* My Restaurant */}
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
                            to="/my-restaurant/add"
                          >
                            Request opening new restaurant
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/edit"
                          >
                            Edit Restaurant
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to={`/user/menu-page/${restaurantId}`}
                          >
                            Manage Menu Item
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant-add-menu"
                          >
                            Add Menu Item
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/my-restaurant/status-report"
                          >
                            Restaurant Status & Report
                          </NavLink>
                        </li>
                      </ul>
                    </li>
                  )}
                </ul>

                {/* Login & Logout Section */}
                <div className="login_bt mt-1">
                  {user ? (
                    <>
                      <li>
                        <NavLink
                          to={`/order/${
                            localStorage.getItem("lastOrderId") || ""
                          }`}
                          onClick={closeNavbar}
                        >
                          <span className="user_icon"></span>
                          My Orders
                        </NavLink>
                      </li>

                      <li>
                        <NavLink to="/cart" onClick={closeNavbar}>
                          <span className="user_icon"></span>
                          <i class="fa-solid fa-cart-shopping"></i>
                        </NavLink>
                      </li>
                      <li>
                        <NavLink to="/profile" onClick={closeNavbar}>
                          <span className="user_icon"></span>
                          <i class="fa-solid fa-user"></i> Profile
                        </NavLink>
                      </li>
                      <li className="text-white lato-regular ">
                        <span className="">
                          <i
                            className="fa fa-face-smile text-white me-2"
                            aria-hidden="true"
                          ></i>
                          Welcome, {userName}
                        </span>
                      </li>
                      <li>
                        <button
                          className="text-white bg-transparent logout_icon_transition "
                          onClick={handleUserLogout}
                        >
                          <i className="fa fa-sign-out" aria-hidden="true">
                            {" "}
                          </i>{" "}
                          Logout
                        </button>
                      </li>
                    </>
                  ) : (
                    <li>
                      <NavLink to="/login">
                        <span className="user_icon">
                          <i className="fa fa-user" aria-hidden="true"></i>
                        </span>
                        Login
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
