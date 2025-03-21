const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { isRestaurant } = require("../middleware/authMiddleware");

const db = admin.firestore();
const ordersCollection = db.collection("orders");

// Get all orders for a restaurant
router.get("/:restaurantId/orders", isRestaurant, async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const snapshot = await ordersCollection.where("restaurantId", "==", restaurantId).get();
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update order status
router.put("/:restaurantId/order/:orderId", isRestaurant, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        await ordersCollection.doc(orderId).update({ status });
        res.status(200).json({ message: "Order status updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
