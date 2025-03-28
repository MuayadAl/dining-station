import React, { useEffect, useState } from "react";
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
import Loader from "../components/Loader";
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
  const [restaurantStatus, setRestaurantStatus] = useState("Open");

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
            userRestaurantId = docSnap.id;

            // ✅ Fetch current restaurant status
            const restaurantData = docSnap.data();
            if (restaurantData.status) {
              setRestaurantStatus(restaurantData.status);
            }
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

  const handleStatusChange = async (newStatus) => {
    try {
      const restaurantRef = doc(db, "restaurants", restaurantId);
      await updateDoc(restaurantRef, { status: newStatus });
      setRestaurantStatus(newStatus);
    } catch (error) {
      console.error("Failed to update restaurant status:", error);
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
    const orderDate = timestamp instanceof Date
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
              <p>
                <strong>Total:</strong> RM{order.total || "0.00"}
              </p>
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
              <div className="d-flex justify-content-between align-items-center">
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

  if (loading) return Loader("Loading...");

  return (
    <div className="container">
      <div className="w-100 row justify-content-center align-items-center  p-3 my-4 bg-body rounded-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2>
            <FontAwesomeIcon icon={faKitchenSet} className="me-2" />
            Restaurant Orders
          </h2>

          {/* Restaurant Status */}
          <div className="dropdown">
            <button
              className={`btn dropdown-toggle ${
                restaurantStatus === "open"
                  ? "btn-success"
                  : restaurantStatus === "busy"
                  ? "btn-warning"
                  : "btn-danger"
              }`}
              type="button"
              id="statusDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Status: {restaurantStatus}
            </button>
            <ul className="dropdown-menu" aria-labelledby="statusDropdown">
              {["open", "busy", "closed"].map((status) => (
                <li key={status}>
                  <button
                    className="dropdown-item"
                    onClick={() => handleStatusChange(status)}
                  >
                    {status}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tabs */}
        <ul className="nav nav-pills mb-4 overflow-auto flex-nowrap">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "new" ? "active" : ""}`}
              onClick={() => setActiveTab("new")}
            >
              🆕 New Orders{" "}
              <span className="badge bg-light text-dark ms-1">{newCount}</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "active" ? "active" : ""}`}
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
              className={`nav-link ${
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
              <div className="row g-3 shadow p-3 rounded-3 pt-2">
                {orders
                  .filter((order) => order.status === "Placed")
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
    </div>
  );
}

export default RestaurantOrderManager;
