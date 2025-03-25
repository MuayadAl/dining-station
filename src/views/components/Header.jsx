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
                  {/* Customer Dashboard */}
                  {!loading && user && userRole === "customer" &&(
                    <>
                    <li className="nav-item">
                      <NavLink
                        className="nav-link text-white"
                        to="/restaurants"
                      >
                        Restaurants
                      </NavLink>
                    </li>
                    </>
                    )}
                  
                  {/* Restaurant-staff Dashboard */}
                  {!loading && user && userRole=== "restaurant-staff" &&(
                      <li className="nav-item">
                      <NavLink
                        className="nav-link text-white"
                        to="/my-restaurant/orders"
                      >
                        Manage Orders
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
                        Management
                      </button>
                      <ul className="dropdown-menu dropdown-menu-dark">
                        <li>
                          <NavLink className="dropdown-item" to="/signup">
                            Register new user
                          </NavLink>
                        </li>
                        <li>
                          <NavLink className="dropdown-item" to="/admin/user-management">
                            View & Manage Users
                          </NavLink>
                        </li>
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
                        <li className="nav-item">
                          <NavLink className="dropdown-item" to="/admin/report">
                            Reports
                          </NavLink>
                        </li>
                      </ul>
                    </li>
                  )}
                
                  {!loading && user && userRole === "customer" && (
                    <>
                      <li className="nav-item">
                        <NavLink
                          className="nav-link text-white"
                          to={lastOrderId ? `/order/${lastOrderId}` : "/orders"}
                          onClick={closeNavbar}
                        >
                          My Orders
                        </NavLink>
                      </li>
                     
                    </>
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
                            Manage Orders
                          </NavLink>
                        </li>
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
                            to="/my-restaurant/register-staff"
                          >
                            Register Staff
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            className="dropdown-item"
                            to="/admin/user-management"
                          >
                            Manage Staff Users
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

                  {/* Cart for customer dashboard */}
                  {userRole === "customer" &&(
                     <li className="nav-item">
                     <NavLink className="nav-link text-white" to="/cart" onClick={closeNavbar}>
                       <i class="fa-solid fa-cart-shopping"></i>
                       <span className=""> Cart</span>
                     </NavLink>
                   </li>
                  )}
                </ul>

                {/* Login & Logout Section */}
                <div className="login_bt mt-1">
                  {user ? (
                    <>
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
