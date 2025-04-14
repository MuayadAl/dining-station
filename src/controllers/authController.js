// src/controllers/authController.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { storeUserDetails } from "./userController";
import { auth } from "../models/firebase";

// Sign up a new user with email and password
export const handleSignUp = async (email, password, userData) => {
  try {
    // Create a new user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Store user details in Firestore
    await storeUserDetails(userData, user.uid);

    return user;
  } catch (error) {
    console.error("Error signing up: ", error);
    throw error;
  }
};

// Log in an existing user
export const handleLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    sessionStorage.removeItem("restaurantId");
    localStorage.removeItem("restaurantId"); 

    return userCredential.user;
  } catch (error) {
    console.error("Error logging in: ", error);
    throw error;
  }
};

// Log out the user
export const handleLogout = async () => {
  try {
    await signOut(auth);
    sessionStorage.removeItem("restaurantId");
    localStorage.removeItem("restaurantId");
  } catch (error) {
    console.error("Error logging out: ", error);
    throw error;
  }
};

// Reset the user's password
export const handlePasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset email: ", error);
    throw new Error("Failed to send password reset email. Please try again.");
  }
};
