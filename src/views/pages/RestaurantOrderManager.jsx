import "bootstrap/dist/js/bootstrap.bundle.min.js";
import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db } from "../../models/firebase";
import { getAuth } from "firebase/auth";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKitchenSet,
  faClockRotateLeft,
  faFireBurner,
  faCheckDouble,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";

const statusSteps = ["Placed", "In Kitchen", "Ready to Pick Up", "Picked Up"];

function RestaurantOrderManager() {
  const [orders, setOrders] = useState([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("new");
  const [restaurantStatus, setRestaurantStatus] = useState("open");
  const [manualStatus, setManualStatus] = useState("open");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [openingHours, setOpeningHours] = useState({});
  const [prevAutoStatus, setPrevAutoStatus] = useState(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const dropdownWrapperRef = useRef(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) return;

      try {
        let userRestaurantId = null;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.restaurantId) {
            userRestaurantId = userData.restaurantId;
          }
        }

        if (!userRestaurantId) {
          const restaurantQuery = query(
            collection(db, "restaurants"),
            where("userId", "==", user.uid)
          );
          const restaurantQuerySnapshot = await getDocs(restaurantQuery);

          if (!restaurantQuerySnapshot.empty) {
            const docSnap = restaurantQuerySnapshot.docs[0];
            const restaurantData = docSnap.data();
            userRestaurantId = docSnap.id;

            setOpeningHours(restaurantData.openingHours || {});
            setManualStatus(restaurantData.status || "open");

            const computedStatus = getRestaurantStatus(
              restaurantData.openingHours,
              restaurantData.status
            );
            setRestaurantStatus(computedStatus);
          } else {
            console.warn("Restaurant document does not exist for this user.");
          }
        }

        if (!userRestaurantId) {
          setLoading(false);
          return;
        }

        setRestaurantId(userRestaurantId);

        const orderQuery = query(
          collection(db, "orders"),
          where("restaurantId", "==", userRestaurantId)
        );

        const unsubscribeOrders = onSnapshot(orderQuery, (snapshot) => {
          const orderList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setOrders(orderList);
          setLoading(false);
        });

        return () => unsubscribeOrders();
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownWrapperRef.current &&
        !dropdownWrapperRef.current.contains(e.target)
      ) {
        setIsStatusDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (manualStatus !== "auto") return;

    const interval = setInterval(() => {
      const updated = getRestaurantStatus(openingHours, manualStatus);

      setRestaurantStatus((prev) => {
        if (prev !== updated) {
          setToastMessage(
            `Status changed automatically to "${updated.toUpperCase()}"`
          );
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }
        return updated;
      });

      setPrevAutoStatus(updated);
    }, 60000);

    return () => clearInterval(interval);
  }, [openingHours, manualStatus]);

  const getRestaurantStatus = (openingHours, manualStatus) => {
    if (manualStatus === "closed") return "closed";
    if (manualStatus === "busy") return "busy";
    if (manualStatus === "open") return "open"; // ✅ this is the fix

    // If manualStatus is "auto", evaluate time
    if (manualStatus !== "auto") return "closed";
    if (!openingHours) return "closed";

    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" });
    const currentTime = now.toLocaleTimeString("en-US", { hour12: false });

    const todayHours = openingHours[currentDay];
    if (!todayHours || !todayHours.enabled) return "closed";

    return currentTime >= todayHours.open && currentTime <= todayHours.close
      ? "open"
      : "closed";
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const restaurantRef = doc(db, "restaurants", restaurantId);
      await updateDoc(restaurantRef, { status: newStatus });

      setManualStatus(newStatus);
      const combined = getRestaurantStatus(openingHours, newStatus);
      setRestaurantStatus(combined);

      // Show success toast
      setToastMessage(
        `Restaurant status updated to "${combined.toUpperCase()}"`
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Failed to update restaurant status:", error);
      setToastMessage("Failed to update restaurant status.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const getNextStatus = (currentStatus) => {
    const index = statusSteps.indexOf(currentStatus);
    return index >= 0 && index < statusSteps.length - 1
      ? statusSteps[index + 1]
      : null;
  };

  const handleNextStatus = async (orderId, currentStatus) => {
    const next = getNextStatus(currentStatus);
    if (!next) return;

    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: next });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: "Cancelled" });
    } catch (error) {
      console.error("Error cancelling order:", error);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Placed":
        return "bg-secondary";
      case "In Kitchen":
        return "bg-warning";
      case "Ready to Pick Up":
        return "bg-info";
      case "Picked Up":
        return "bg-success";
      default:
        return "bg-dark";
    }
  };

  const isToday = (timestamp) => {
    const orderDate =
      timestamp instanceof Date
        ? timestamp
        : timestamp?.toDate?.() || new Date(timestamp);

    const today = new Date();
    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    );
  };

  const newCount = orders.filter((o) => o.status === "Placed").length;
  const kitchenCount = orders.filter((o) => o.status === "In Kitchen").length;
  const readyCount = orders.filter(
    (o) => o.status === "Ready to Pick Up"
  ).length;
  const completedCount = orders.filter(
    (o) => o.status === "Picked Up" && isToday(o.time)
  ).length;

  const renderOrderCard = (order) => {
    const nextStatus = getNextStatus(order.status);
    return (
      <div key={order.id} className="col-lg-12 col-md-12">
        <div className="card shadow bg-body">
          <div
            className="card-header d-flex justify-content-between align-items-center"
            data-bs-toggle="collapse"
            data-bs-target={`#order-${order.id}`}
            aria-expanded="false"
            style={{ cursor: "pointer" }}
          >
            <div>
              <strong>Order ID:</strong> <p className="m-0">{order.id}</p>
              <strong> Customer:</strong> {order.userName}
            </div>
            <div>
              <span className="badge bg-dark me-2">
                {order.items?.length || 0} item(s)
              </span>
              <FontAwesomeIcon icon={faClockRotateLeft} />
            </div>
          </div>
          <div id={`order-${order.id}`} className="collapse">
            <div className="card-body">
              <p>
                <strong>Time:</strong>{" "}
                {new Date(order.time).toLocaleTimeString()}
              </p>
              <div
                className="d-flex align-items-center"
                style={{ marginLeft: "21px" }}
              >
                <span className="fw-Semibold ">
                  Total: RM{order.total || "0.00"}
                </span>
                <span
                  className={`badge ms-2 px-3 py-1   ${
                    order.paymentMethod === "Stripe"
                      ? "bg-success"
                      : "bg-danger"
                  }`}
                  style={{ fontSize: "0.8rem", borderRadius: "0.75rem" }}
                >
                  {order.paymentMethod === "Stripe" ? "Paid" : "Unpaid"}
                </span>
              </div>
              <div className="mb-3">
                <strong>Items:</strong>
                <ul className="list-group list-group-flush">
                  {order.items?.map((item, idx) => (
                    <li key={idx} className="list-group-item">
                      {item.name} x {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="d-flex justify-content-between align-items-center gap-2">
                <span
                  className={`badge ${getStatusBadgeClass(order.status)} p-2`}
                >
                  {order.status}
                </span>
                {order.status === "Placed" ? (
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-success"
                      onClick={() => handleNextStatus(order.id, order.status)}
                    >
                      Confirm Order
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleCancelOrder(order.id)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  nextStatus && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleNextStatus(order.id, order.status)}
                    >
                      {nextStatus}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="w-100 row justify-content-center align-items-center  p-3 bg-body rounded-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2>
            <FontAwesomeIcon icon={faKitchenSet} className="me-2" />
            Restaurant Orders
          </h2>

          {/* Restaurant Status */}
          <div className="dropdown position-relative" ref={dropdownWrapperRef}>
            <button
              className={`btn dropdown-toggle ${
                restaurantStatus === "open"
                  ? "btn-success"
                  : restaurantStatus === "busy"
                  ? "btn-warning"
                  : "btn-danger"
              }`}
              type="button"
              onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
            >
              Status: {restaurantStatus}
            </button>

            <ul
              className={`dropdown-menu custom-dropdown-menu ${
                isStatusDropdownOpen ? "show" : ""
              }`}
              style={{
                display: isStatusDropdownOpen ? "block" : "none",
                position: "absolute",
                zIndex: 1000,
              }}
            >
              {["open", "busy", "closed", "auto"].map((status) => (
                <li key={status}>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      handleStatusChange(status);
                      setIsStatusDropdownOpen(false);
                    }}
                  >
                    {status}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tabs */}
        <ul className="nav nav-pills mb-4 overflow-auto flex-nowrap justify-content-center align-items-center">
          <li className="nav-item ">
            <button
              className={`nav-link tab-button ${
                activeTab === "new" ? "active" : ""
              }`}
              onClick={() => setActiveTab("new")}
            >
              🆕New Orders{" "}
              <span className="badge bg-light text-dark ms-1">{newCount}</span>
            </button>
          </li>
          <li className="nav-item ">
            <button
              className={`nav-link tab-button ${
                activeTab === "active" ? "active" : ""
              }`}
              onClick={() => setActiveTab("active")}
            >
              <FontAwesomeIcon icon={faFireBurner} /> Active Orders{" "}
              <span className="badge bg-light text-dark ms-1">
                {kitchenCount + readyCount}
              </span>
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link tab-button ${
                activeTab === "completed" ? "active" : ""
              }`}
              onClick={() => setActiveTab("completed")}
            >
              <FontAwesomeIcon icon={faCheckDouble} /> Completed{" "}
              <span className="badge bg-light text-dark ms-1">
                {completedCount}
              </span>
            </button>
          </li>
        </ul>

        {/* Orders Display */}
        {activeTab === "new" && (
          <>
            {newCount === 0 ? (
              <p className="text-muted">Great! No new orders at the moment.</p>
            ) : (
              <div className="row g-3 shadow p-3 rounded-3 pt-2 ">
                {orders
                  .filter((order) => order.status === "Placed")
                  .sort((a, b) => new Date(a.time) - new Date(b.time))
                  .map(renderOrderCard)}
              </div>
            )}
          </>
        )}

        {activeTab === "active" && (
          <div className="row g-4  ">
            {/* In Kitchen Section */}
            <div className="col-md-6">
              <div className="card shadow-sm border-0 bg-secondary-subtle">
                <div className="card-header bg-warning text-dark d-flex align-items-center justify-content-center">
                  <FontAwesomeIcon icon={faFireBurner} className="me-2" />
                  <h5 className="mb-0">In Kitchen</h5>
                </div>
                <div className="card-body">
                  {kitchenCount === 0 ? (
                    <p className="text-muted">
                      No orders currently in the kitchen.
                    </p>
                  ) : (
                    <div className="row g-3">
                      {orders
                        .filter((order) => order.status === "In Kitchen")
                        .sort((a, b) => new Date(a.time) - new Date(b.time))
                        .map(renderOrderCard)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ready to Pick Up Section */}
            <div className="col-md-6">
              <div className="card shadow-sm border-0 bg-success-subtle">
                <div className="card-header bg-info text-dark d-flex align-items-center justify-content-center">
                  <FontAwesomeIcon icon={faCheck} className="me-2" />
                  <h5 className="mb-0">Ready to Pick Up</h5>
                </div>
                <div className="card-body">
                  {readyCount === 0 ? (
                    <p className="text-muted">No orders ready for pickup.</p>
                  ) : (
                    <div className="row g-3">
                      {orders
                        .filter((order) => order.status === "Ready to Pick Up")
                        .sort((a, b) => new Date(a.time) - new Date(b.time))
                        .map(renderOrderCard)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "completed" && (
          <>
            {completedCount === 0 ? (
              <p className="text-muted">No completed orders today.</p>
            ) : (
              <div className="row g-3">
                {orders
                  .filter(
                    (order) =>
                      order.status === "Picked Up" && isToday(order.time)
                  )
                  .map(renderOrderCard)}
              </div>
            )}
          </>
        )}
      </div>
      {/* Toast Notification */}
      <div
        className="toast-container position-fixed bottom-0 end-0 p-3"
        style={{ zIndex: 9999 }}
      >
        <div
          className={`toast align-items-center text-white bg-success border-0 ${
            showToast ? "show" : ""
          }`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="d-flex">
            <div className="toast-body">{toastMessage}</div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              aria-label="Close"
              onClick={() => setShowToast(false)}
            ></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestaurantOrderManager;
