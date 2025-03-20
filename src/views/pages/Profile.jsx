// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import Swal from 'sweetalert2';

// Firebase and controller import starts 
import { auth, db } from "../../models/firebase"; // Firebase auth
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { updateUserName } from "../../controllers/userController"; // Import the new function
import { deleteUserAccount } from "../../controllers/userController";

// Firebase and controller import ends 
/*******************************/

// Pages and components starts
import Loader from "../components/Loader";

// Pages and components ends
/*****************************/

// Font Awesome Packages starts
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons/faFloppyDisk";

// Font Awesome Packages ends


export default function Profile() {

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    gender: "",
  });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(""); // State for success message
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch user data from Firestore

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

  // Handle changes to form data
  const handleChange = (e) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle saving changes to profile
  const handleSaveChanges = async () => {
    setError("");
    setSuccess(""); 

    // Check if any fields are blank
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
        // Update gender (can add more fields here as needed)
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          name: userData.name,
          gender: userData.gender,
        });

        setEditing(false); 
        setSuccess("Profile updated successfully!"); 
      }
    } catch (err) {
      setError("Error updating profile");
    }
  };


  // Hanle Delete Account
  const handleDeleteAccount = async () => {
    setError("");

    const result = await Swal.fire({
    title: "Are you sure?",
    text: "This action will permanently delete your account.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete my account!"
  });

  if (result.isConfirmed) {
    try {
      const user = auth.currentUser;

      if (user) {
        await deleteUserAccount(user.uid);
        navigate("/login");
        Swal.fire("Deleted!", "Your account has been deleted.", "success");
      } else {
        setError("No user authenticated");
      }
    } catch (err) {
      setError("Error deleting user account");
    }
  }
  };
  

  if (loading) {
    return <Loader message="Loading your profile..." />;
  }

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100 ">
      <div
        className="card shadow-lg p-4"
        style={{ width: "100%", maxWidth: "800px" }}
      >
        <h3 className="text-center mb-4">
          <i className="fa fa-user"></i> Profile
        </h3>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}{" "}
        {/* Success message */}
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
            <i class="fa fa-envelope"></i> Email
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
            <i class="fa fa-venus-mars"></i> Gender
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

          <div className="d-flex justify-content-between">
            {editing ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveChanges} // Call handleSaveChanges on click
              >
                <FontAwesomeIcon icon={faFloppyDisk} /> Save Changes
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditing(true)} // Enable editing on click
              >
                <FontAwesomeIcon icon={faPenToSquare} /> Edit Profile


              </button>
            )}
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteAccount}
            >
               <FontAwesomeIcon icon={faTrashCan} /> Delete Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
