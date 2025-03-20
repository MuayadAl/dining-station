import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../models/firebase";
import { Container, ProgressBar, Table } from "react-bootstrap";

const OrderPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previousOrders, setPreviousOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const orderRef = doc(db, "orders", orderId);

    // 🔥 Save last visited orderId in LocalStorage
    localStorage.setItem("lastOrderId", orderId);

    // 🔥 Listen to real-time order updates
    const unsubscribe = onSnapshot(orderRef, (doc) => {
      if (doc.exists()) {
        setOrder(doc.data());
        setLoading(false);
      } else {
        console.error("Order not found.");
        setOrder(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [orderId]);

  // 🔹 Fetch Previous Orders for the Same User
  useEffect(() => {
    if (order?.userId) {
      const fetchPreviousOrders = async () => {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("userId", "==", order.userId));
        const querySnapshot = await getDocs(q);

        const orders = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((o) => o.orderId !== orderId) // Exclude current order
          .sort((a, b) => new Date(b.time) - new Date(a.time)); // Sort by date (latest first)

        setPreviousOrders(orders);
      };

      fetchPreviousOrders();
    }
  }, [order]);

  const handleDeleteOrder = async () => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;

    try {
      const response = await fetch(`http://localhost:5000/orders/${orderId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error);
        return;
      }

      alert("Order deleted successfully!");
      navigate("/orders"); // Redirect to the orders list page
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Failed to delete order.");
    }
  };

  if (loading)
    return (
      <div className="container mb-4">
        <h3>Loading order details...</h3>
      </div>
    );
  if (!order)
    return (
      <div className="container mb-4">
        <h3>Order not found.</h3>
      </div>
    );

  // 🔹 Define Status Steps
  const statusSteps = [
    "Placed",
    "In the Kitchen",
    "Ready to Pick Up",
    "Picked Up",
  ];
  const currentStepIndex = statusSteps.indexOf(order.status);
  const progressPercentage =
    ((currentStepIndex + 1) / statusSteps.length) * 100;

  // 🔹 Define Colors Based on Status
  const getProgressColor = () => {
    if (currentStepIndex === 0) return "info"; // Blue for "Placed"
    if (currentStepIndex === 1) return "warning"; // Yellow for "In the Kitchen"
    if (currentStepIndex === 2) return "success"; // Green for "Ready to Pick Up"
    return "primary"; // Dark blue for "Picked Up"
  };

  return (
    <Container className="mb-4">
      <h2 className="mb-3">Order Details</h2>
      <p>
        <strong>Order ID:</strong> {orderId}
      </p>
      <p>
        <strong>Restaurant:</strong> {order.restaurantName}
      </p>
      <p>
        <strong>User:</strong> {order.userName}
      </p>
      <p>
        <strong>Order Time:</strong> {new Date(order.time).toLocaleString()}
      </p>
      <p>
        <strong>Status:</strong>{" "}
        <span className={`badge bg-${getProgressColor()}`}>{order.status}</span>
      </p>
      <div>
        {order.status === "Placed" && (
          <button className="btn btn-danger" onClick={handleDeleteOrder}>
            Delete Order
          </button>
        )}
      </div>

      {/* 🔥 Bootstrap Progress Bar with Dynamic Colors */}
      <div className="mt-4">
        <ProgressBar
          now={progressPercentage}
          label={`${progressPercentage}%`}
          variant={getProgressColor()}
          animated
        />
        <div className="d-flex justify-content-between mt-2">
          {statusSteps.map((step, index) => (
            <span
              key={index}
              className={`fw-bold ${
                index <= currentStepIndex ? "text-primary" : "text-muted"
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      <h4 className="mt-4">Items:</h4>
      <ul className="list-group">
        {order.items.map((item, index) => (
          <li key={index} className="list-group-item">
            {item.quantity}x {item.name} - RM{parseFloat(item.price).toFixed(2)}
          </li>
        ))}
      </ul>

      <h3 className="mt-3">
        <strong>Total Amount: RM{parseFloat(order.total).toFixed(2)}</strong>
      </h3>

      {/* 🔥 Display Previous Orders */}
      <h4 className="mt-5">Previous Orders</h4>
      {previousOrders.length === 0 ? (
        <p className="text-muted">No previous orders found.</p>
      ) : (
        <Table striped bordered hover className="mt-3">
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
            {previousOrders.map((prevOrder) => (
              <tr key={prevOrder.orderId}>
                <td>{prevOrder.orderId}</td>
                <td>{prevOrder.restaurantName}</td>
                <td>
                  <span className={`badge bg-${getProgressColor()}`}>
                    {prevOrder.status}
                  </span>
                </td>
                <td>RM{parseFloat(prevOrder.total).toFixed(2)}</td>
                <td>{new Date(prevOrder.time).toLocaleString()}</td>
                <td>
                  <Link
                    to={`/order/${prevOrder.orderId}`}
                    className="btn btn-primary btn-sm"
                  >
                    View Order
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default OrderPage;
