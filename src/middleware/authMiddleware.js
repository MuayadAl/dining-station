// // Dummy auth middleware – replace with Firebase Auth integration if needed
// function isRestaurant(req, res, next) {
//     if (req.user && req.user.role === "restaurant") {
//         return next();
//     }
//     return res.status(403).json({ error: "Access denied: Restaurant only" });
// }

// function isAdmin(req, res, next) {
//     if (req.user && req.user.role === "admin") {
//         return next();
//     }
//     return res.status(403).json({ error: "Access denied: Admin only" });
// }

// module.exports = {
//     isRestaurant,
//     isAdmin
// };


// server/middleware/authMiddleware.js
const admin = require("firebase-admin");

exports.isAdmin = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization?.split("Bearer ")[1];

    if (!idToken) {
      return res.status(401).json({ error: "Unauthorized. Token missing." });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Fetch user data from Firestore to check role
    const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();

    if (!userDoc.exists || userDoc.data().userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden. Admin access required." });
    }

    req.user = decodedToken; // Attach user to request if needed
    next(); // All good, proceed
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized. Invalid token." });
  }
};
