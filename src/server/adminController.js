const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { isAdmin } = require("../middleware/authMiddleware");

const db = admin.firestore();
const ordersCollection = db.collection("orders");

// Get all orders (Admin)
router.get("/orders", isAdmin, async (req, res) => {
    try {
        const snapshot = await ordersCollection.get();
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get reports (e.g., total orders in date range)
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
            orders
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createUserAsAdmin = async (req, res) => {
    const { email, password, userData } = req.body;
  
    try {
      const userRecord = await admin.auth().createUser({ email, password });
      await admin.firestore().collection('users').doc(userRecord.uid).set(userData);
  
      res.status(200).json({
        uid: userRecord.uid,
        message: 'User created successfully',
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message });
    }
  };
  

module.exports = router;
