// functions/adminRoutes.js
const express = require("express");
const router = express.Router();
const { admin } = require("./firebaseAdmin");
const { isAdmin } = require("./authMiddleware");
const { createUserAsAdmin } = require("./adminController");

const db = admin.firestore();
const ordersCollection = db.collection("orders");

router.post("/create-user", isAdmin, createUserAsAdmin);

router.get("/orders", isAdmin, async (req, res) => {
  try {
    const snapshot = await ordersCollection.get();
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/reports", isAdmin, async (req, res) => {
  try {
    const { start, end } = req.query;
    const snapshot = await ordersCollection
      .where("time", ">=", start)
      .where("time", "<=", end)
      .get();
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ totalOrders: orders.length, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔧 Delete User
router.post("/admin/deleteUser", isAdmin, async (req, res) => {
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ error: "User UID is required." });
  }

  try {
    // Fetch the user making the request
    const requesterDoc = await db.collection("users").doc(req.user.uid).get();
    const requester = requesterDoc.data();

    // If the requester is a restaurant-owner, check if the target user belongs to their restaurant
    if (requester.userRole === "restaurant-owner") {
      const targetUserDoc = await db.collection("users").doc(uid).get();

      if (!targetUserDoc.exists) {
        return res.status(404).json({ error: "Target user not found" });
      }

      const targetUser = targetUserDoc.data();

      // Restrict restaurant-owners from deleting users outside their own restaurant
      if (
        targetUser.userRole !== "restaurant-staff" ||
        targetUser.restaurantId !== requester.restaurantId
      ) {
        return res.status(403).json({ error: "Unauthorized to delete this user" });
      }
    }

    // Proceed with deletion
    await admin.auth().deleteUser(uid);
    await db.collection("users").doc(uid).delete();

    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("🔥 Error deleting user:", error);
    res.status(500).json({ error: error.message || "Failed to delete user" });
  }
});


module.exports = router;
