const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
require("dotenv").config();

const { admin, db } = require("./firebaseAdmin");
const adminRoutes = require("./adminRoutes");
const orderRoutes = require("./orderController");

const app = express();

// ✅ CORS configuration
const allowedOrigin = "https://dinging-station.web.app";

const corsOptions = {
  origin: allowedOrigin,
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// ✅ Manual CORS headers for full control
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

// ✅ Stripe setup
const stripeSecret = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret;
const frontendBaseUrl = process.env.FRONTEND_BASE_URL || functions.config().frontend?.base_url;

if (!stripeSecret || !frontendBaseUrl) {
  console.error("❌ Missing STRIPE_SECRET_KEY or FRONTEND_BASE_URL");
  throw new Error("Stripe environment configuration missing");
}

const stripe = Stripe(stripeSecret);

// ✅ Handle preflight requests
app.options("/api/create-checkout-session", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.status(204).send();
});

// ✅ Checkout session endpoint
app.post("/api/create-checkout-session", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");

  try {
    const { cartItems, userId, userName, restaurantId, restaurantName } = req.body;

    if (
      !cartItems?.length ||
      !userId ||
      !userName ||
      !restaurantId ||
      !restaurantName
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const total = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const newOrderRef = db.collection("orders").doc();
    const orderId = newOrderRef.id;

    await newOrderRef.set({
      orderId,
      userId,
      userName,
      restaurantId,
      restaurantName,
      total: parseFloat(total.toFixed(2)),
      time: new Date().toISOString(),
      items: cartItems,
      status: "Placed",
      paymentMethod: "Stripe",
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${frontendBaseUrl}/order/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBaseUrl}/cancel`,
      line_items: cartItems.map((item) => ({
        price_data: {
          currency: "myr",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("🔥 Stripe Checkout Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Register other routes
app.use("/api", adminRoutes);
app.use("/orders", orderRoutes);

// ✅ Export the function
exports.api = functions.https.onRequest(app);
