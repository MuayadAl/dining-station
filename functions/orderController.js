const express = require("express");
const router = express.Router();
const { admin, db } = require("./firebaseAdmin");

const ordersCollection = db.collection("orders");

router.post("/create", async (req, res) => {
  try {
    const { restaurantId, restaurantName, orderId, userId, userName, time, items } = req.body;
    if (!restaurantId || !restaurantName || !orderId || !userId || !userName || !time || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }

    const orderData = {
      restaurantId,
      restaurantName,
      orderId,
      userId,
      userName,
      time,
      items,
      status: "Placed"
    };

    await ordersCollection.doc(orderId).set(orderData);
    res.status(201).json({ message: "Order created successfully", order: orderData });
  } catch (error) {
    console.error("🔥 Error creating order:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const snapshot = await ordersCollection.get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const doc = await ordersCollection.doc(orderId).get();
    if (!doc.exists) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    if (!orderId || !status) return res.status(400).json({ error: "Missing data" });
    await ordersCollection.doc(orderId).update({ status });
    res.status(200).json({ message: "Order status updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
