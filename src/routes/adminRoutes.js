const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middleware/authMiddleware");
const { createUserAsAdmin } = require("../controllers/adminController");
const admin = require("firebase-admin");

const db = admin.firestore();
const ordersCollection = db.collection("orders");

// Admin-only: Create user
router.post("/create-user", isAdmin, createUserAsAdmin);

// Admin-only: Get all orders
router.get("/orders", isAdmin, async (req, res) => {
  try {
    const snapshot = await ordersCollection.get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin-only: Get reports
router.get("/reports", isAdmin, async (req, res) => {
  try {
    const { start, end } = req.query;
    const snapshot = await ordersCollection
      .where("time", ">=", start)
      .where("time", "<=", end)
      .get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
