const admin = require("firebase-admin");

exports.createUserAsAdmin = async (req, res) => {
  const { email, password, userData } = req.body;

  try {
    // First, create the user
    const userRecord = await admin.auth().createUser({ email, password });

    // Then build the full user data with UID and createdAt
    const fullUserData = {
      ...userData,
      email,                  // Ensure email is saved
      uid: userRecord.uid,    // ✅ Add UID after it's defined
      createdAt: new Date().toISOString(),
    };

    // Store user details in Firestore
    await admin.firestore().collection("users").doc(userRecord.uid).set(fullUserData);

    res.status(200).json({
      uid: userRecord.uid,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: error.message });
  }
};
