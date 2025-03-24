import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
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

  useEffect(() => {
    const auth = getAuth();

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) return;

      try {
        // Fetch the restaurantId from the restaurants collection
        const q = query(
          collection(db, "restaurants"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.warn("No restaurant found for this user.");
          setLoading(false);
          return;
        }

        const fetchedRestaurantId = querySnapshot.docs[0].data().restaurantId;
        setRestaurantId(fetchedRestaurantId);

        // Now fetch orders using that restaurantId
        const orderQuery = query(
          collection(db, "orders"),
          where("restaurantId", "==", fetchedRestaurantId)
        );

        const unsubscribeOrders = onSnapshot(orderQuery, (snapshot) => {
          const orderList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setOrders(orderList);
          setLoading(false);
        });

        // Clean up Firestore listener on unmount
        return () => unsubscribeOrders();
      } catch (error) {
        console.error("Failed to fetch restaurant orders:", error);
        setLoading(false);
      }
    });

    // Clean up Auth listener
    return () => unsubscribeAuth();
  }, []);

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

  if (loading) return Loader("Loading...");

  const isToday = (timestamp) => {
    const orderDate = new Date(timestamp);
    const today = new Date();

    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    );
  };

  // Count per tab
  const newCount = orders.filter((o) => o.status === "Placed").length;
  const kitchenCount = orders.filter((o) => o.status === "In Kitchen").length;
  const readyCount = orders.filter(
    (o) => o.status === "Ready to Pick Up"
  ).length;
  const completedCount = orders.filter(
    (o) => o.status === "Picked Up" && isToday(o.time)
  ).length;

  // Filtered orders based on selected tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "new") return order.status === "Placed";
    if (activeTab === "accepted") return order.status === "In Kitchen";
    if (activeTab === "ready") return order.status === "Ready to Pick Up";
    if (activeTab === "completed")
      return order.status === "Picked Up" && isToday(order.time);
    return false;
  });

  return (
    <div className="container py-4">
      <h2 className="mb-4">
        <FontAwesomeIcon icon={faKitchenSet} className="me-2" />
        Restaurant Orders
      </h2>

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
            className={`nav-link ${activeTab === "accepted" ? "active" : ""}`}
            onClick={() => setActiveTab("accepted")}
          >
            <FontAwesomeIcon icon={faFireBurner} /> In Kitchen{" "}
            <span className="badge bg-light text-dark ms-1">
              {kitchenCount}
            </span>
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "ready" ? "active" : ""}`}
            onClick={() => setActiveTab("ready")}
          >
            <FontAwesomeIcon icon={faCheck} /> Ready to Pick Up{" "}
            <span className="badge bg-light text-dark ms-1">{readyCount}</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "completed" ? "active" : ""}`}
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
      {filteredOrders.length === 0 ? (
        <p className="text-muted">
          {activeTab === "new"
            ? "Great! No new orders at the moment."
            : "No orders in this category."}
        </p>
      ) : (
        <div className="row g-3">
          {filteredOrders.map((order, index) => {
            const nextStatus = getNextStatus(order.status);

            return (
              <div key={order.id} className="col-lg-12 col-md-12">
                <div className="card shadow bg-body">
                  {/* Collapsible Header */}
                  <div
                    className="card-header d-flex justify-content-between align-items-center"
                    data-bs-toggle="collapse"
                    data-bs-target={`#order-${index}`}
                    aria-expanded="false"
                    style={{ cursor: "pointer" }}
                  >
                    <div>
                      <strong>Order ID:</strong> {order.id}
                    </div>
                    <div>
                      <span className="badge bg-dark me-2">
                        {order.items?.length || 0} item(s)
                      </span>
                      <FontAwesomeIcon icon={faClockRotateLeft} />
                    </div>
                  </div>

                  {/* Collapsible Body */}
                  <div id={`order-${index}`} className="collapse">
                    <div className="card-body">
                      <p>
                        <strong>Customer:</strong> {order.userName}
                      </p>
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
                          className={`badge ${getStatusBadgeClass(
                            order.status
                          )} p-2`}
                        >
                          {order.status}
                        </span>

                        {order.status === "Placed" ? (
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-success"
                              onClick={() =>
                                handleNextStatus(order.id, order.status)
                              }
                            >
                              <i class="fa-solid fa-circle-check"></i> Confirm Order
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              <i class="fa-solid fa-xmark"></i> Cancel
                            </button>
                          </div>
                        ) : (
                          nextStatus && (
                            <button
                              className="btn btn-outline-primary"
                              onClick={() =>
                                handleNextStatus(order.id, order.status)
                              }
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
          })}
        </div>
      )}
    </div>
  );
}

export default RestaurantOrderManager;
