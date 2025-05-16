const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
require("dotenv").config();

const { admin, db } = require("./firebaseAdmin");
const adminRoutes = require("./adminRoutes");
const orderRoutes = require("./orderController");

const app = express();
const router = express.Router(); // ✅ define router

// ✅ CORS setup
const allowedOrigin = "https://dinging-station.web.app";

app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));

app.options("*", cors({
  origin: allowedOrigin,
  credentials: true,
}));

app.use(express.json());

// ✅ Admin and order routes (outside router)
app.use(adminRoutes);
app.use("/orders", orderRoutes);

// ✅ Stripe checkout session route
router.post("/create-checkout-session", async (req, res) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const frontendBaseUrl = process.env.FRONTEND_BASE_URL;

  if (!stripeSecret || !frontendBaseUrl) {
    console.error("❌ Missing STRIPE_SECRET_KEY or FRONTEND_BASE_URL");
    return res.status(500).json({ error: "Stripe configuration missing" });
  }

  const stripe = Stripe(stripeSecret);

  try {
    const { cartItems } = req.body;

    if (!cartItems?.length) {
      return res.status(400).json({ error: "Missing cart items" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${frontendBaseUrl}/order/processing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBaseUrl}/cancel`,
      line_items: cartItems.map((item) => ({
        price_data: {
          currency: "myr",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      metadata: {
        restaurantId: req.body.restaurantId || "unknown-restaurant-id",
        restaurantName: req.body.restaurantName || "Unknown Restaurant",
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("🔥 Stripe Checkout Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Stripe session retrieval
router.get("/retrieve-checkout-session", async (req, res) => {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    res.status(200).json(session);
  } catch (error) {
    console.error("🔥 Stripe Session Retrieval Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Test route
router.get("/test", (req, res) => {
  res.status(200).json({
    message: "✅ Test route reached successfully!",
    timestamp: new Date().toISOString(),
  });
});

// ✅ Mount all routes under /api
app.use("/api", router);
app.use("/api", adminRoutes);

// ✅ Export Gen 2 Cloud Function
exports.api = onRequest(
  {
    timeoutSeconds: 60,
    secrets: ["STRIPE_SECRET_KEY", "FRONTEND_BASE_URL"],
  },
  app
);
