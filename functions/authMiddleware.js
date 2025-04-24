// functions/authMiddleware.js
const { admin } = require("./firebaseAdmin");

exports.isAdmin = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) return res.status(401).json({ error: "Token missing" });

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (
      !userDoc.exists ||
      (userDoc.data().userRole !== "admin" &&
        userDoc.data().userRole !== "restaurant-owner")
    ) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
