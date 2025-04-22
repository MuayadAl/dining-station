import { useLocation } from "react-router-dom";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../../models/firebase";
import useAlert from "../../hooks/userAlert";
import Loader from "../components/Loader";
import { clearCart } from "../../controllers/cartController";

import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const OrderPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previousOrders, setPreviousOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cartCleared, setCartCleared] = useState(false);
  const prevStatusRef = useRef(null);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const notificationSound = new Audio("/notifications/ping.mp3");

  const navigate = useNavigate();
  const { confirmAction, showSuccess, showError } = useAlert();

  useEffect(() => {
    return () => {
      if (orderId) {
        localStorage.removeItem(`payment-toast-shown-${orderId}`);
      }
    };
  }, [orderId]);

  // Notification request
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const currentUser = await new Promise((resolve, reject) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
              resolve(user);
              unsubscribe();
            } else {
              reject("User not logged in");
            }
          });
        });

        if (!currentUser) {
          showError("You need to be logged in.");
          navigate("/login");
          return;
        }

        const orderRef = doc(db, "orders", orderId);
        const unsubscribeOrder = onSnapshot(orderRef, async (docSnapshot) => {
          if (!docSnapshot.exists()) {
            // showError("Order not found.");
            navigate(`/order/${orderId}`);
            setLoading(false);
            return;
          }

          const fetchedOrder = { id: docSnapshot.id, ...docSnapshot.data() };
          setOrder(fetchedOrder);

          const justPaid =
            new URLSearchParams(location.search).get("justPaid") === "true";

          if (fetchedOrder.status === "Placed" && justPaid && !cartCleared) {
            await clearCart();
            setCartCleared(true);

            const toastKey = `payment-toast-shown-${fetchedOrder.id}`;
            const alreadyShown = localStorage.getItem(toastKey);

            if (!alreadyShown) {
              showSuccess("Payment successful!");
              localStorage.setItem(toastKey, "true");
            }
          }

          if (
            fetchedOrder.status !== prevStatusRef.current &&
            prevStatusRef.current !== null &&
            Notification.permission === "granted"
          ) {
            new Notification("Order Update", {
              body: `Your order is now: ${fetchedOrder.status}`,
              icon: "/icons/icon-192x192.png",
            });

            try {
              notificationSound
                .play()
                .catch((err) => console.error("Audio play error:", err));
            } catch (err) {
              console.error("Sound error:", err);
            }

            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          }

          prevStatusRef.current = fetchedOrder.status;
          setLoading(false);
        });

        return () => unsubscribeOrder();
      } catch (err) {
        console.error("🔐 Auth error or Firestore issue:", err);
        showError("Authentication or order retrieval error.");
        navigate("/login");
      }
    };

    if (orderId) fetchOrder();
  }, [orderId, cartCleared]);

  const fetchPreviousOrders = async () => {
    setLoadingOrders(true);
    try {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("userId", "==", order?.userId));
      const querySnapshot = await getDocs(q);

      const orders = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((o) => o.id !== orderId)
        .sort((a, b) => new Date(b.time) - new Date(a.time)); // ✅ Newest first

      setPreviousOrders(orders);
      setOrdersLoaded(true);
    } catch (error) {
      showError("Error fetching previous orders.");
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCancelOrder = async (targetOrderId) => {
    const isConfirmed = await confirmAction(
      "Are you sure?",
      "This action cannot be undone. Do you want to cancel this order?",
      "Yes, cancel it"
    );

    if (!isConfirmed) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showError("You need to be logged in to cancel an order.");
        return;
      }

      if (order.userId !== currentUser.uid) {
        showError("Unauthorized action.");
        return;
      }

      // await deleteDoc(doc(db, "orders", orderId));
      const orderRef = doc(db, "orders", targetOrderId);

      await updateDoc(orderRef, { status: "Cancelled" });

      showSuccess(
        "Order canceled successfully!. Amount will be refunded to your payment method (if any)."
      );

      await fetchPreviousOrders();
    if (selectedOrder?.id === targetOrderId) {
      setSelectedOrder((prev) => ({ ...prev, status: "Cancelled" }));
    }

    } catch (error) {
      showError("Failed to cancel order.");
    }
  };

  const handlePickedOrder = async (targetOrderId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showError("You need to be logged in to pick up an order.");
        return;
      }

      if (order.userId !== currentUser.uid) {
        showError("Unauthorized action.");
        return;
      }

      const orderRef = doc(db, "orders", targetOrderId);

      await updateDoc(orderRef, { status: "Picked Up" });

      showSuccess("Enjoy your meal!");

      await fetchPreviousOrders();
      if (selectedOrder?.id === targetOrderId) {
        setSelectedOrder((prev) => ({ ...prev, status: "Picked Up" }));
      }
      
    } catch (error) {
      showError("Failed to picked up order.");
    }
  };

  if (loading) return Loader("Loading order details...");
  if (!order)
    return (
      <div className="container mb-4">
        <h3>Order not found.</h3>
      </div>
    );

  const statusSteps = ["Placed", "In Kitchen", "Ready to Pick Up", "Picked Up"];
  const currentStepIndex = statusSteps.indexOf(order.status);
  const progressPercentage =
    ((currentStepIndex + 1) / statusSteps.length) * 100;

  const getProgressColor = () => {
    if (currentStepIndex === 0) return "info";
    if (currentStepIndex === 1) return "warning";
    if (currentStepIndex === 2) return "primary";
    if (currentStepIndex === 3) return "success";
    return "danger";
  };

  const getStatusText = () => {
    if (currentStepIndex === 0) return "Placed";
    if (currentStepIndex === 1) return "In Kitchen";
    if (currentStepIndex === 2) return "Ready to Pick Up";
    if (currentStepIndex === 3) return "Picked Up";
    return "Order Cancelled. Amount will be refunded to your payment method (if any).";
  };

  const getProgressColorCode = () => {
    if (currentStepIndex === 0) return "#0dcaf0"; // info
    if (currentStepIndex === 1) return "#ffc107"; // warning
    if (currentStepIndex === 2) return "#0d6efd"; // primary
    if (currentStepIndex === 3) return "#198754"; // success
    return "#dc3545"; // danger
  };

  return (
    <div className="container ">
      <h3>Order Details</h3>
      <div className="w-100 row justify-content-between align-items-center shadow p-3 my-3 bg-body rounded-3">
        <div className="col-lg-4">
          <p>
            <strong>Order ID:</strong> {orderId}
          </p>
        </div>
        <div className="col-lg-4 col-md-6">
          <p>
            <strong>Restaurant:</strong> {order.restaurantName}
          </p>
        </div>
        <div className="col-lg-4 col-md-6">
          <p>
            <strong>Customer:</strong> {order.userName}
          </p>
        </div>

        <div className="col-lg-4 col-md-6">
          <p>
            <strong>Order Time:</strong> {new Date(order.time).toLocaleString()}
          </p>
        </div>
        <div className="col-lg-4 col-md-6">
          <p>
            <strong>Status:</strong>{" "}
            <span className={`badge bg-${getProgressColor()}`}>
              {order.status}
            </span>
          </p>
        </div>

        {(order.status === "Placed" || order.status === "Ready to Pick Up") && (
          <div className="col-12 mt-3">
            <button
              className={`btn ${
                order.status === "Placed" ? "btn-danger" : "btn-success"
              }`}
              onClick={()=>
                order.status === "Placed"
                  ? handleCancelOrder(orderId)
                  : handlePickedOrder(orderId)
              }
            >
              {order.status === "Placed" ? "Cancel Order" : "Picked Up"}
            </button>
          </div>
        )}
      </div>

      <div className="my-3">
        <h3>Order Status</h3>
      </div>

      {/* Progress Circle */}
      <div className="bg-body shadow p-4 rounded-3 d-flex flex-column justify-content-center align-items-center">
        <div style={{ width: 150, height: 150 }}>
          <CircularProgressbarWithChildren
            value={progressPercentage}
            styles={buildStyles({
              pathColor: getProgressColorCode(),
              trailColor: "#eee",
              strokeLinecap: "round",
            })}
          >
            <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
              {progressPercentage}%
            </div>
          </CircularProgressbarWithChildren>
        </div>
        <div
          className={`mt-3 fw-semibold text-${getProgressColor()}`}
          style={{ fontSize: "1rem" }}
        >
          {getStatusText()}
        </div>
      </div>

      <h3 className="mt-4">Items</h3>
      <ul className="list-group">
        {Array.isArray(order.items) && order.items.length > 0 ? (
          order.items.map((item, index) => (
            <li key={index} className="list-group-item">
              {item.quantity}x {item.name} - RM
              {parseFloat(item.price).toFixed(2)}
            </li>
          ))
        ) : (
          <li className="list-group-item text-muted">No items in this order</li>
        )}
      </ul>

      <h3 className="mt-3">
        <strong>Total Amount: RM{parseFloat(order.total).toFixed(2)}</strong>
      </h3>

      <h4 className="mt-5">All Orders</h4>

      {!ordersLoaded ? (
        <button
          className="btn btn-primary mb-2"
          onClick={fetchPreviousOrders}
          disabled={loadingOrders}
        >
          {loadingOrders ? "Loading..." : "Load Orders"}
        </button>
      ) : (
        (() => {
          const allOrders = [...previousOrders, order].sort(
            (a, b) => new Date(b.time) - new Date(a.time)
          );

          return allOrders.length === 0 ? (
            <p className="text-muted">No orders found.</p>
          ) : (
            <div className="justify-content-start shadow px-3 mb-3 bg-body rounded-3">
              <div className="table-responsive pt-3">
                <table className="table table-bordered table-hover table-striped">
                  <thead className="bg-dark text-white">
                    <tr>
                      <th>Order ID</th>
                      <th>Restaurant</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Order Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.map((o) => (
                      <tr key={o.id}>
                        <td>{o.id}</td>
                        <td>{o.restaurantName}</td>
                        <td>
                          <span className="badge bg-secondary">{o.status}</span>
                        </td>
                        <td>RM{parseFloat(o.total).toFixed(2)}</td>
                        <td>{new Date(o.time).toLocaleString()}</td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setSelectedOrder(o)}
                            data-bs-toggle="modal"
                            data-bs-target="#orderModal"
                          >
                            View Order
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()
      )}

      {/* Order Modal */}
      <div
        className="modal fade"
        id="orderModal"
        tabIndex="-1"
        aria-labelledby="orderModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="orderModalLabel">
                Order Details
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {selectedOrder ? (
                <>
                  <p>
                    <strong>Order ID:</strong> {selectedOrder.id}
                  </p>
                  <p>
                    <strong>Customer:</strong> {selectedOrder.userName}
                  </p>
                  <p>
                    <strong>Restaurant:</strong> {selectedOrder.restaurantName}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span className="badge bg-secondary">
                      {selectedOrder.status}
                    </span>
                  </p>
                  <p>
                    <strong>Total:</strong> RM
                    {parseFloat(selectedOrder.total).toFixed(2)}
                  </p>
                  <p>
                    <strong>Order Time:</strong>{" "}
                    {new Date(selectedOrder.time).toLocaleString()}
                  </p>

                  {/* Display Items */}
                  <h5 className="mt-3">Items Purchased</h5>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <ul className="list-group">
                      {selectedOrder.items.map((item, index) => (
                        <li key={index} className="list-group-item">
                          {item.quantity}x {item.name} - RM
                          {parseFloat(item.price).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No items found for this order.</p>
                  )}

                  {(selectedOrder.status === "Placed" ||
                    selectedOrder.status === "Ready to Pick Up") && (
                    <div className="col-12 mt-3 d-flex gap-2">
                      {selectedOrder.status === "Placed" && (
                        <button
                          className="btn btn-danger"
                          onClick={() => {
                            handleCancelOrder(selectedOrder.id);
                            }}
                        >
                          Cancel Order
                        </button>
                      )}
                      {selectedOrder.status === "Ready to Pick Up" && (
                        <button
                          className="btn btn-success"
                          onClick={() => handlePickedOrder(selectedOrder.id)}
                        >
                          Picked Up
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p>Loading order details...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPage;
