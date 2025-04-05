import React, { useEffect, useState } from "react";
import { getCart } from "../../controllers/cartController";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Table } from "react-bootstrap";
import useAlert from "../../hooks/userAlert";
import { auth, db } from "../../models/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getUserDetails } from "../../controllers/userController";

const CheckoutForm = ({ cartItems, total, user, restaurant }) => {
  const { showError } = useAlert();

  const handlePayment = async () => {
    if (cartItems.length === 0) {
      showError("Your cart is empty.");
      return;
    }

    if (!user || !restaurant) {
      console.error("Missing user or restaurant details", { user, restaurant });
      showError("Error retrieving user or restaurant details.");
      return;
    }

    try {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
      const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
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

      if (!response.ok || !data.url) {
        showError(data.error || "Payment failed. Please try again.");
        return;
      }

      window.location.href = data.url; // Redirect to Stripe
    } catch (err) {
      console.error("❌ Network error:", err);
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch Cart Data
        const cartData = await getCart();
        setCartItems(cartData);
        setTotal(cartData.reduce((sum, item) => sum + item.price * item.quantity, 0));

        // Fetch User Data
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log("👤 User ID:", currentUser.uid);
          const userDetails = await getUserDetails(currentUser.uid);
          setUser({
            id: currentUser.uid,
            name: userDetails?.name || "Unknown User",
            email: userDetails?.email || "",
          });
        } else {
          console.warn("⚠ No user is logged in.");
        }

        // Fetch Restaurant Data
        if (restaurantId) {
          console.log(`📢 Fetching restaurant details for ID: ${restaurantId}`);
          const restaurantRef = doc(db, "restaurants", restaurantId);
          const restaurantSnap = await getDoc(restaurantRef);

          if (restaurantSnap.exists()) {
            setRestaurant({ id: restaurantId, ...restaurantSnap.data() });
          } else {
            console.error("❌ Restaurant not found in Firestore.");
          }
        } else {
          console.warn("⚠ No restaurantId found.");
        }
      } catch (error) {
        console.error("❌ Fetching error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
      console.error("❌ No restaurantId found. Redirecting user.");
      setTimeout(() => navigate("/restaurants"), 2000);
    }
  }, [restaurantId, navigate]);

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
            {loading ? (
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
