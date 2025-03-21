import React, { useEffect, useState } from "react";
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
const OrderPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previousOrders, setPreviousOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const navigate = useNavigate();
  const { confirmAction, showSuccess, showError } = useAlert();

  useEffect(() => {
    let isMounted = true;

    setLoading(true);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && isMounted) {
        const orderRef = doc(db, "orders", orderId);

        const unsubscribeOrder = onSnapshot(orderRef, (docSnapshot) => {
          if (isMounted) {
            if (docSnapshot.exists()) {
              setOrder({ id: docSnapshot.id, ...docSnapshot.data() });
            } else {
              showError("Order not found.");
              navigate("/orders");
            }
            setLoading(false);
          }
        });

        return () => unsubscribeOrder();
      } else if (isMounted) {
        showError("No authenticated user.");
        navigate("/login");
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, [orderId, navigate]);

  const fetchPreviousOrders = async () => {
    setLoadingOrders(true);
    try {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("userId", "==", order?.userId));
      const querySnapshot = await getDocs(q);

      const orders = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((o) => o.id !== orderId)
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      setPreviousOrders(orders);
      setOrdersLoaded(true);
    } catch (error) {
      showError("Error fetching previous orders.");
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCancelOrder = async () => {
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
      const orderRef = doc(db, "orders", orderId);

      await updateDoc(orderRef, { status: "Cancelled" });

      showSuccess("Order canceled successfully!");

    } catch (error) {
      showError("Failed to cancel order.");
    }
  };

  if (loading) return Loader("Loading order details");
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
    if (currentStepIndex === 2) return "success";
    return "danger";
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

        {order.status === "Placed" && (
          <div className="col-12 mt-3">
            <button className="btn btn-danger" onClick={handleCancelOrder}>
              Cancel Order
            </button>
          </div>
        )}
      </div>

      <div className="my-3">
        <h3>Order Status</h3>
      </div>

      <div className="bg-body shadow p-4 rounded-3 d-flex flex-column justify-content-center align-items-center">
        <div className="progress w-100">
          <div
            className={`progress-bar progress-bar-striped progress-bar-animated bg-${getProgressColor()}`}
            style={{ width: `${progressPercentage}%` }}
          >
            {progressPercentage}%
          </div>
        </div>

        <div className="d-flex justify-content-between w-100 mt-2">
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

      <h3 className="mt-4">Items</h3>
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

      <h4 className="mt-5">Previous Orders</h4>
      {!ordersLoaded ? (
        <button
          className="btn btn-primary"
          onClick={fetchPreviousOrders}
          disabled={loadingOrders}
        >
          {loadingOrders ? "Loading..." : "Load Previous Orders"}
        </button>
      ) : previousOrders.length === 0 ? (
        <p className="text-muted">No previous orders found.</p>
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
                {previousOrders.map((prevOrder) => (
                  <tr key={prevOrder.id}>
                    <td>{prevOrder.id}</td>
                    <td>{prevOrder.restaurantName}</td>
                    <td>
                      <span className="badge bg-secondary">
                        {prevOrder.status}
                      </span>
                    </td>
                    <td>RM{parseFloat(prevOrder.total).toFixed(2)}</td>
                    <td>{new Date(prevOrder.time).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setSelectedOrder(prevOrder)}
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
