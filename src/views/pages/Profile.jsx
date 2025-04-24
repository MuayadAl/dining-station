// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";

// Firebase and controller import starts
import { auth, db } from "../../models/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { updateUserName, deleteUserAccount } from "../../controllers/userController";
import { handlePasswordReset } from "../../controllers/authController";
// Firebase and controller import ends

// Components
import Loader from "../components/Loader";

// Font Awesome
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons/faFloppyDisk";

// Alert Hook
import useAlert from "../../hooks/userAlert";

export default function Profile() {
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    gender: "",
  });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { confirmAction, showSuccess, showError } = useAlert();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            setError("User data not found");
          }
        } catch (error) {
          setError("Failed to load user data");
        } finally {
          setLoading(false);
        }
      } else {
        setError("User not authenticated");
        setLoading(false);
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (e) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = async () => {
    const confirmed = await confirmAction(
      "Reset Password?",
      `An email will be sent to ${userData.email} to reset your password.`,
      "Send Reset Email"
    );
  
    if (!confirmed) return;
  
    try {
      await handlePasswordReset(userData.email);
      showSuccess("Password reset email sent.");
    } catch (error) {
      showError("Failed to send password reset email.");
    }
  };
  

  const handleSaveChanges = async () => {
    setError("");
    setSuccess("");

    if (!userData.name || !userData.gender) {
      setError("All fields are required");
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        if (userData.name !== user.displayName) {
          await updateUserName(user.uid, userData.name);
        }

        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          name: userData.name,
          gender: userData.gender,
        });

        setEditing(false);
        showSuccess("Profile updated successfully!");
      }
    } catch (err) {
      showError("Error updating profile");
    }
  };

  const handleDeleteAccount = async () => {
    setError("");

    const confirmed = await confirmAction(
      "Are you sure?",
      "This action will permanently delete your account.",
      "Yes, delete my account!"
    );

    if (confirmed) {
      try {
        const user = auth.currentUser;
        if (user) {
          await deleteUserAccount(user.uid);
          navigate("/login");
          showSuccess("Your account has been deleted.");
        } else {
          showError("No user authenticated");
        }
      } catch (err) {
        showError("Error deleting user account");
      }
    }
  };

  if (loading) {
    return <Loader message="Loading your profile..." />;
  }

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow-lg p-4" style={{ width: "100%", maxWidth: "800px" }}>
        <h3 className="text-center mb-4">
          <i className="fa fa-user"></i> Profile
        </h3>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form>
          {/* Name */}
          <div className="mb-3">
            <label htmlFor="name" className="form-label">
              <i className="fa fa-user"></i> Name
            </label>
            <input
              type="text"
              className="form-control"
              id="name"
              name="name"
              value={userData.name}
              onChange={handleChange}
              disabled={!editing}
            />
          </div>

          {/* Email */}
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              <i className="fa fa-envelope"></i> Email
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              name="email"
              value={userData.email}
              disabled
            />
          </div>

          {/* Gender */}
          <div className="mb-3">
            <label htmlFor="gender" className="form-label">
              <i className="fa fa-venus-mars"></i> Gender
            </label>
            <select
              className="form-select"
              name="gender"
              value={userData.gender}
              onChange={handleChange}
              disabled={!editing}
            >
              <option value="">Select your gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="d-flex justify-content-between gap-2">
            {editing ? (
              <button type="button" className="btn btn-primary" onClick={handleSaveChanges}>
                <FontAwesomeIcon icon={faFloppyDisk} /> Save Changes
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
                <FontAwesomeIcon icon={faPenToSquare} /> Edit Profile
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={handlePasswordChange}>
              <i className="fa-solid fa-lock"></i> Change Password
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDeleteAccount}>
              <FontAwesomeIcon icon={faTrashCan} /> Delete Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
