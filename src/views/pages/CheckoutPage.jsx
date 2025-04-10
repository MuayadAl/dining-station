import React, { useEffect, useState } from "react";
import { getCart } from "../../controllers/cartController";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Table, Form } from "react-bootstrap";
import useAlert from "../../hooks/userAlert";
import { auth, db } from "../../models/firebase";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { getUserDetails } from "../../controllers/userController";
import { clearCart } from "../../controllers/cartController";

const CheckoutForm = ({ cartItems, total, user, restaurant }) => {
  const { showError, showSuccess } = useAlert();
  const [paymentMethod, setPaymentMethod] = useState("Stripe");
  const [loading, setLoading] = useState(false);


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

    if (paymentMethod === "ApCard") {
      setLoading(true);
      try {
        const orderRef = doc(collection(db, "orders"));
        const orderId = orderRef.id;

        const orderData = {
          orderId,
          userId: user.id,
          userName: user.name,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          total: parseFloat(total.toFixed(2)),
          time: new Date().toISOString(),
          items: cartItems,
          status: "Placed",
          paymentMethod,
        };

        await setDoc(orderRef, orderData, { merge: true });
        await clearCart();

        showSuccess(`Your order has been placed with ${paymentMethod}.`);
        setTimeout(() => {
          window.location.href = `/order/${orderId}`;
        }, 1500);
      } catch (error) {
        console.error(`🔥 Firebase Order Error (${paymentMethod}):`, error);
        showError("Failed to place order. Please try again.");
      } finally{
        setLoading(false);
      }
      return;
    }

    // Stripe Payment
    setLoading(true);
    try {
      const API_BASE_URL =
        process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
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
      console.error("Network error:", err);
      showError("Network error: Unable to reach Stripe.");
    } finally{
      setLoading(false);
    }
  };

  return (
    <>
      <Form.Group className="mt-3">
        <Form.Label>Select Payment Method:</Form.Label>
        <Form.Select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="Stripe">Credit/debit card</option>
          <option value="ApCard">ApCard in store</option>
          <option value="" disabled>
            ApCard balance
          </option>
        </Form.Select>
      </Form.Group>
      <div className=" justify-content-center align-items-center d-flex">
        {loading? (

          <Button
            variant="success"
            className="mt-3 col-lg-6 "
            disabled
          >
            <i className="fas fa-spinner fa-spin me-2"></i> Processing Payment...
          </Button>
        ):(
        <Button
          variant="success"
          className="mt-3 col-lg-6 "
          onClick={handlePayment}
        >
          Pay with {paymentMethod}
        </Button>

        )}
      </div>
    </>
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

        const cartData = await getCart();
        setCartItems(cartData);
        setTotal(
          cartData.reduce(
            (sum, item) => sum + item.selectedPrice * item.quantity,
            0
          )
        );

        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDetails = await getUserDetails(currentUser.uid);
          setUser({
            id: currentUser.uid,
            name: userDetails?.name || "Unknown User",
            email: userDetails?.email || "",
          });
        }

        if (restaurantId) {
          const restaurantRef = doc(db, "restaurants", restaurantId);
          const restaurantSnap = await getDoc(restaurantRef);
          if (restaurantSnap.exists()) {
            setRestaurant({ id: restaurantId, ...restaurantSnap.data() });
          }
        }
      } catch (error) {
        console.error("Fetching error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
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
                  <tr key={`${item.itemId}_${item.selectedSize}`}>
                    <td>{item.name}</td>
                    <td>
                      RM{parseFloat(item.selectedPrice).toFixed(2)}
                      <br />
                      <small className="text-muted">
                        ({item.selectedSize})
                      </small>
                    </td>
                    <td>{item.quantity}</td>
                    <td>
                      RM
                      {(item.quantity * parseFloat(item.selectedPrice)).toFixed(
                        2
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <h4 className="text-right">Total: RM{total.toFixed(2)}</h4>

            {loading ? (
              <p className="text-center text-warning">
                Loading user and restaurant details...
              </p>
            ) : restaurant ? (
              <CheckoutForm
                cartItems={cartItems}
                total={total}
                user={user}
                restaurant={restaurant}
              />
            ) : (
              <p className="text-danger text-center">
                Error: Unable to fetch restaurant details. Redirecting...
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
