import React, { useEffect, useState } from "react";
import { getCart } from "../../controllers/cartController";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Table } from "react-bootstrap";
import useAlert from "../../hooks/userAlert";
import { auth } from "../../models/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../models/firebase";

import { getUserDetails } from "../../controllers/userController";

const CheckoutForm = ({ cartItems, total, user, restaurant }) => {
  const { showError } = useAlert();

  const handlePayment = async () => {
    if (cartItems.length === 0) {
      showError("Your cart is empty.");
      return;
    }

    if (!user || !restaurant) {
      console.error("❌ Missing user or restaurant details", { user, restaurant });
      showError("Error retrieving user or restaurant details.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems,
          total,
          userId: user.id,
          userName: user.name,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
        }),
      });

      const data = await response.json();
      console.log("Stripe Session Data:", data);

      if (!response.ok || !data.url) {
        showError(data.error || "Payment failed. Please try again.");
        return;
      }

      // Redirect user to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error("Network error:", err);
      showError("Network error: Unable to reach Stripe.");
    }
  };

  return (
    <Button variant="success" className="mt-3" onClick={handlePayment}>
      Pay with Stripe
    </Button>
  );
};

const CheckoutPage = () => {
  const { restaurantId: paramRestaurantId } = useParams();
  const storedRestaurantId = localStorage.getItem("restaurantId");
  const restaurantId = paramRestaurantId || storedRestaurantId;

  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const navigate = useNavigate();
  

  useEffect(() => {
    const fetchCart = async () => {
      const cartData = await getCart();
      setCartItems(cartData);
      calculateTotal(cartData);
    };

    fetchCart();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log("👤 User ID:", currentUser.uid);
        const userDetails = await getUserDetails(currentUser.uid); // ✅ Fetch from Firestore

        if (userDetails) {
          setUser({
            id: currentUser.uid,
            name: userDetails.name, // ✅ Use Firestore name instead of displayName
            email: userDetails.email,
          });
        } else {
          console.warn("⚠ User details not found in Firestore.");
          setUser({ id: currentUser.uid, name: "Unknown User" });
        }
      } else {
        console.warn("⚠ No user is logged in.");
      }
      setLoadingUser(false);
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!restaurantId) {
        console.warn("⚠ No restaurantId found in URL or localStorage.");
        setLoadingRestaurant(false);
        return;
      }

      try {
        console.log(`📢 Fetching restaurant details for ID: ${restaurantId}`);
        const restaurantRef = doc(db, "restaurants", restaurantId);
        const restaurantSnap = await getDoc(restaurantRef);

        if (restaurantSnap.exists()) {
          console.log("✅ Restaurant found:", restaurantSnap.data());
          setRestaurant({ id: restaurantId, ...restaurantSnap.data() });
        } else {
          console.error("❌ Restaurant not found in Firestore.");
        }
      } catch (error) {
        console.error("❌ Firestore error fetching restaurant:", error);
      }

      setLoadingRestaurant(false);
    };

    fetchRestaurant();
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
      console.error("❌ No restaurantId found. Redirecting user.");
      setTimeout(() => navigate("/restaurants"), 2000);
    }
  }, [restaurantId, navigate]);

  const calculateTotal = (items) => {
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setTotal(totalAmount);
  };

  return (
    <div className="container">
      <h2 className="text-center">Checkout</h2>
      <div className="card shadow p-4 w-100 my-3">
        {cartItems.length === 0 ? (
          <p className="text-center text-muted">Your cart is empty.</p>
        ) : (
          <>
            <Table striped bordered hover>
              <thead className="bg-dark text-white">
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item) => (
                  <tr key={item.itemId}>
                    <td>{item.name}</td>
                    <td>RM{parseFloat(item.price).toFixed(2)}</td>
                    <td>{item.quantity}</td>
                    <td>RM{(item.quantity * parseFloat(item.price)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <h4 className="text-right">Total: RM{total.toFixed(2)}</h4>

            {/* Stripe Payment Button */}
            {loadingUser || loadingRestaurant ? (
              <p className="text-center text-warning">Loading user and restaurant details...</p>
            ) : restaurant ? (
              <CheckoutForm cartItems={cartItems} total={total} user={user} restaurant={restaurant} />
            ) : (
              <p className="text-danger text-center">Error: Unable to fetch restaurant details. Redirecting...</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
