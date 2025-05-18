const express = require("express");
const { db } = require("./firebaseAdmin");
const router = express.Router();

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post("/", async (req, res) => {
  const Stripe = require("stripe");
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log("✅ Webhook verified:", event.type);
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const metadata = session.metadata;

    if (!metadata) {
      console.error("❌ No metadata in session");
      return res.status(400).send("Missing metadata");
    }

    let parsedItems = [];
    try {
      parsedItems = JSON.parse(metadata.items);
    } catch (err) {
      console.error("❌ Failed to parse metadata.items:", err.message);
      return res.status(400).send("Invalid items format");
    }

    const orderRef = db.collection("orders").doc(session.id);
    const existing = await orderRef.get();
    if (existing.exists) {
      console.log("⚠️ Order already exists:", session.id);
      return res.status(200).send("Duplicate ignored");
    }

    const orderData = {
      orderId: session.id,
      userId: metadata.userId,
      restaurantId: metadata.restaurantId,
      restaurantName: metadata.restaurantName,
      total: session.amount_total / 100,
      items: parsedItems,
      status: "Placed",
      time: new Date().toISOString(),
      paymentMethod: "Stripe",
      email: session.customer_details?.email || "unknown",
    };

    await orderRef.set(orderData);
    console.log("✅ Order saved from webhook:", session.id);
  } else {
    console.log("ℹ️ Unhandled event type:", event.type);
  }

  res.status(200).send("Webhook handled");
});

module.exports = router;
