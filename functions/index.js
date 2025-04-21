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

// const allowedOrigins = [
//   "https://dinging-station.web.app",
//   "http://localhost:3000"
// ];

// const corsOptions = {
//   origin: function (origin, callback) {
//     // allow requests with no origin like mobile apps or curl
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true,
//   methods: ["GET", "POST", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// };

// app.use(cors(corsOptions));
// app.use(express.json());

// // ✅ Universal CORS headers (for fallback)
// app.use((req, res, next) => {
//   const origin = req.headers.origin;
//   if (allowedOrigins.includes(origin)) {
//     res.setHeader("Access-Control-Allow-Origin", origin);
//   }
//   res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   res.setHeader("Access-Control-Allow-Credentials", "true");
//   next();
// });


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

app.get("/api/retrieve-checkout-session", async (req, res) => {
  const sessionId = req.query.session_id;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.status(200).json(session);
  } catch (error) {
    console.error("🔥 Stripe Session Retrieval Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// ✅ Register other routes
app.use("/api", adminRoutes);
app.use("/orders", orderRoutes);

// ✅ Export the function
exports.api = functions.https.onRequest(app);
