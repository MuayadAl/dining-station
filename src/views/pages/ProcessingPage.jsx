import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../../models/firebase";
import { getCart, clearCart } from "../../controllers/cartController";
import { doc, collection, setDoc } from "firebase/firestore";
import { db } from "../../models/firebase";
import useAlert from "../../hooks/userAlert";

const ProcessingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useAlert();

  const queryParams = new URLSearchParams(location.search);
  const sessionId = queryParams.get("session_id");

  useEffect(() => {
    const processOrder = async () => {
      if (!sessionId || localStorage.getItem(`order-placed-${sessionId}`)) return;

      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/retrieve-checkout-session?session_id=${sessionId}`
        );
        const session = await response.json();

        if (!session || !session.customer_details) throw new Error("Invalid Stripe session");

        const user = auth.currentUser;
        if (!user) return navigate("/login");

        const cart = await getCart();
        if (!Array.isArray(cart) || cart.length === 0) throw new Error("Cart is empty.");

        const total = (session.amount_total / 100).toFixed(2);
        const orderRef = doc(collection(db, "orders"));
        const orderData = {
          stripeSessionId: sessionId,
          orderId: orderRef.id,
          userId: user.uid,
          userName: session.customer_details.name || "Unknown",
          restaurantId: session.metadata?.restaurantId || "unknown",
          restaurantName: session.metadata?.restaurantName || "Unknown",
          total: parseFloat(total),
          time: new Date().toISOString(),
          items: cart,
          status: "Placed",
          paymentMethod: "Stripe",
        };

        await setDoc(orderRef, orderData);
        await clearCart();
        localStorage.setItem(`order-placed-${sessionId}`, "true");

        navigate(`/order/${orderRef.id}?justPaid=true`);
        showSuccess("Payment successful and order placed!");
      } catch (err) {
        console.error("❌ Error processing order:", err);
        showError("Payment completed but order creation failed.");
        navigate("/"); // or redirect to error page
      }
    };

    processOrder();
  }, [sessionId, navigate, showError, showSuccess]);

  return (
    <div className="container text-center my-5">
      <h3>Processing your order...</h3>
      <p>Please wait while we confirm your payment and place your order.</p>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
};

export default ProcessingPage;
