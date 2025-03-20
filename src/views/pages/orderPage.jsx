import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db, auth } from "../../models/firebase";
import useAlert from "../../hooks/userAlert"; // Import the custom alert hook

const OrderPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previousOrders, setPreviousOrders] = useState([]);
  const navigate = useNavigate();
  const { confirmAction, showSuccess, showError } = useAlert(); // Use alert functions

  useEffect(() => {
    setLoading(true);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const orderRef = doc(db, "orders", orderId);

        const unsubscribeOrder = onSnapshot(orderRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            setOrder({ id: docSnapshot.id, ...docSnapshot.data() });
          } else {
            showError("Order not found.");
            navigate("/orders");
          }
          setLoading(false);
        });

        return () => unsubscribeOrder();
      } else {
        showError("No authenticated user.");
        navigate("/login");
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [orderId, navigate]);

  useEffect(() => {
    if (orderId && order?.userId) {
      const fetchPreviousOrders = async () => {
        try {
          const ordersRef = collection(db, "orders");
          const q = query(ordersRef, where("userId", "==", order.userId));
          const querySnapshot = await getDocs(q);

          const orders = querySnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((o) => o.id !== orderId)
            .sort((a, b) => new Date(b.time) - new Date(a.time));

          setPreviousOrders(orders);
        } catch (error) {
          showError("Error fetching previous orders.");
        }
      };

      fetchPreviousOrders();
    }
  }, [orderId, order?.userId]);

  const handleDeleteOrder = async () => {
    const isConfirmed = await confirmAction(
      "Are you sure?",
      "This action cannot be undone. Do you want to delete this order?",
      "Yes, delete it"
    );

    if (!isConfirmed) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showError("You need to be logged in to delete an order.");
        return;
      }

      if (order.userId !== currentUser.uid) {
        showError("Unauthorized action.");
        return;
      }

      await deleteDoc(doc(db, "orders", orderId));

      showSuccess("Order deleted successfully!");
      navigate("/restaurants");
    } catch (error) {
      showError("Failed to delete order.");
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

  const statusSteps = ["Placed", "In Kitchen", "Ready to Pick Up", "Picked Up"];
  const currentStepIndex = statusSteps.indexOf(order.status);
  const progressPercentage = ((currentStepIndex + 1) / statusSteps.length) * 100;

  const getProgressColor = () => {
    if (currentStepIndex === 0) return "info";
    if (currentStepIndex === 1) return "warning";
    if (currentStepIndex === 2) return "success";
    return "danger";
  };

  return (
    <div className="container mb-4">
      <div className="d-flex row justify-content-start shadow p-3 my-5 bg-body rounded-3">
        <h2 className="mb-3">Order Details</h2>
        <p><strong>Order ID:</strong> {orderId}</p>
        <p><strong>Restaurant:</strong> {order.restaurantName}</p>
        <p><strong>Customer:</strong> {order.userName}</p>
        <p><strong>Order Time:</strong> {new Date(order.time).toLocaleString()}</p>
        <p>
          <strong>Status:</strong> <span className={`badge bg-${getProgressColor()}`}>{order.status}</span>
        </p>
        <div>
          {order.status === "Placed" && (
            <button className="btn btn-danger" onClick={handleDeleteOrder}>
              Delete Order
            </button>
          )}
        </div>
      </div>

      <div className="bg-body shadow p-4 rounded-3 d-flex flex-column justify-content-center align-items-center">
        <div className="progress w-100" aria-valuemin="0" aria-valuemax="100">
          <div
            className={`progress-bar progress-bar-striped progress-bar-animated bg-${getProgressColor()}`}
            role="progressbar"
            style={{ width: `${progressPercentage}%` }}
            aria-valuenow={progressPercentage}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            {progressPercentage}%
          </div>
        </div>

        <div className="d-flex justify-content-between w-100 mt-2">
          {statusSteps.map((step, index) => (
            <span
              key={index}
              className={`fw-bold ${index <= currentStepIndex ? "text-primary" : "text-muted"}`}
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

      <h3 className="mt-3"><strong>Total Amount: RM{parseFloat(order.total).toFixed(2)}</strong></h3>

      <h4 className="mt-5">Previous Orders</h4>
      {previousOrders.length === 0 ? (
        <p className="text-muted">No previous orders found.</p>
      ) : (
        <div className="justify-content-start shadow px-1 pb-3 mb-5 bg-body rounded-3">
          <div className="table-responsive mt-4">
            <table className="table table-bordered table-hover table-striped">
              <thead className="bg-dark text-white text-center">
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
                  <tr key={prevOrder.id} className="align-middle text-center">
                    <td className="fw-bold">{prevOrder.id}</td>
                    <td>{prevOrder.restaurantName}</td>
                    <td>
                      <span className={`badge bg-${getProgressColor()}`}>{prevOrder.status}</span>
                    </td>
                    <td className="fw-semibold">RM{parseFloat(prevOrder.total).toFixed(2)}</td>
                    <td>{new Date(prevOrder.time).toLocaleString()}</td>
                    <td>
                      <button className="btn btn-primary btn-sm shadow-sm" onClick={() => setOrder(prevOrder)}>
                        View Order
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPage;
