// functions/adminController.js
const { admin } = require("./firebaseAdmin");

exports.createUserAsAdmin = async (req, res) => {
  const { email, password, userData } = req.body;

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    await admin.firestore().collection("users").doc(userRecord.uid).set(userData);

    res.status(200).json({
      uid: userRecord.uid,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: error.message });
  }
};
