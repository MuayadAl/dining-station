const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env.local") });
const adminRoutes = require("./adminRoutes");

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const ordersCollection = db.collection("orders");

// Middleware
app.use(
  cors({
    origin: [
      process.env.FRONTEND_BASE_URL,
      "http://localhost:3000",
      "http://192.168.100.31:3000",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use("/api", adminRoutes);
// Import and Use Order Routes
const orderRoutes = require("./orderController");
app.use("/orders", orderRoutes);

/// ✅ **🔥 API: Get Order Details (Fix: Missing API)**
app.get("/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderRef = ordersCollection.doc(orderId);
    const doc = await orderRef.get();
    res.json({ paymentStatus: "paid" });

    if (!doc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: error.message });
  }
});

/// ✅ **🔥 API: Update Order Status (Fix: Ensure Order Exists)**
app.put("/orders/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // Check if order exists before updating
    const orderRef = ordersCollection.doc(orderId);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }

    await orderRef.update({ status });

    res.status(200).json({ message: `Order status updated to '${status}'` });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: error.message });
  }
});

/// ✅ **🔥 API: Delete Order**
app.delete("/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderRef = ordersCollection.doc(orderId);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderData = doc.data();
    if (orderData.status.toLowerCase() !== "placed") {
      return res
        .status(400)
        .json({ error: "You can only delete orders that are 'Placed'." });
    }

    // 🔥 Delete the order from Firestore
    await orderRef.delete();

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: error.message });
  }
});

/// ✅ **🔥 API: Create Stripe Checkout Session**
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { cartItems, userId, userName, restaurantId, restaurantName } =
      req.body;

    // Ensure required fields are present
    if (
      !cartItems ||
      cartItems.length === 0 ||
      !userId ||
      !userName ||
      !restaurantId ||
      !restaurantName
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔹 Calculate total on the backend (ensuring it's correct)
    const total = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // 🔥 Generate a Firestore document reference and get the auto-generated ID
    const newOrderRef = ordersCollection.doc();
    const orderId = newOrderRef.id; // Use Firestore's auto-generated ID

    const orderData = {
      orderId, // Store the Firestore-generated ID explicitly
      userId,
      userName,
      restaurantId,
      restaurantName,
      total: parseFloat(total.toFixed(2)),
      time: new Date().toISOString(),
      items: cartItems,
      status: "Placed",
    };

    // 🔥 Save order in Firestore
    await newOrderRef.set(orderData, { merge: true });

    // 🔥 Create Stripe Checkout Session
    const FRONTEND_BASE_URL =
      process.env.FRONTEND_BASE_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${FRONTEND_BASE_URL}/order/${orderId}`,
      cancel_url: `${FRONTEND_BASE_URL}/cancel`,
      line_items: cartItems.map((item) => ({
        price_data: {
          currency: "myr",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })),
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("🔥 Stripe Checkout Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
