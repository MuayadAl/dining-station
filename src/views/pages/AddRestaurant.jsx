// src/views/pages/AddRestaurant.jsx
import React, { useState, useEffect, useRef } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";

// import { Link } from "react-router-dom";
import { addRestaurant } from "../../controllers/restaurantController";

// Firebase
import { auth, db } from "../../models/firebase";
import { doc, getDocs, collection, query, where } from "firebase/firestore";

// Hooks Import
import useAlert from "../../hooks/userAlert";

// Font awesome Import Starts
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { faClock } from "@fortawesome/free-solid-svg-icons";

export default function AddRestaurant() {
  const { confirmAction, showSuccess, showError } = useAlert(); // Use the alert hook

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    description: "",
    status: null, // Status is null for now
    openingHours: {}, // Store opening hours as an object
  });
  const [imgFile, setImgFile] = useState(null); // To store the image file
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [checking, setChecking] = useState(true);

  // Reference for scrolling
  const messageRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkExistingRestaurant = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
          collection(db, "restaurants"),
          where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          setHasRestaurant(true);
        }
      } catch (error) {
        console.error("Error checking existing restaurant:", error);
      } finally {
        setChecking(false);
      }
    };

    checkExistingRestaurant();
  }, []);

  // Scroll to message when error or success changes
  useEffect(() => {
    if (error || success) {
      messageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [error, success]);

  // Handle input changes for form fields
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle opening hours change (checkboxes + time selection)
  const handleOpeningHoursChange = (day, timeSlot, value) => {
    setFormData((prevState) => ({
      ...prevState,
      openingHours: {
        ...prevState.openingHours,
        [day]: {
          ...prevState.openingHours[day],
          [timeSlot]: value,
        },
      },
    }));
  };

  // Phone number validation (only numbers, 10-15 digits)
  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  };

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.location ||
      !formData.openingHours ||
      !formData.description
    ) {
      setError("All fields are required");
      return;
    }

    if (!validatePhone(formData.phone)) {
      setError(
        "Invalid phone number. It should contain only numbers and be 10 to 15 digits long."
      );
      return;
    }

    if (!validateEmail(formData.email)) {
      setError("Invalid email address format.");
      return;
    }

    // ✅ Use the reusable SweetAlert2 confirmation dialog
    const isConfirmed = await confirmAction(
      "Are you sure?",
      "Do you want to submit this restaurant opening request?",
      "Yes, submit it!"
    );

    if (!isConfirmed) return; // Stop if user cancels

    setLoading(true);
    try {
      const restaurantId = await addRestaurant({
        ...formData,
        imgFile,
      });

      showSuccess(
        `Restaurant added successfully with ID: ${restaurantId}. You can track the admin's approval status from the Restaurant Status & Report page.`
      );

      setFormData({
        name: "",
        email: "",
        phone: "",
        location: "",
        status: null,
        openingHours: {},
        description: "",
      });
      setImgFile(null);

      window.location.href = "/my-restaurant/status-report";
    } catch (err) {
      showError("Error adding restaurant: " + err.message);
    } finally {
      setLoading(false);
      <Navigate to="/landing" replace></Navigate>;
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center">
      <div className="shadow p-3 my-3 bg-body rounded body_card_layout ">
        {checking ? (
          <h5 className="text-center">Checking your restaurant status...</h5>
        ) : hasRestaurant ? (
          <div className="alert alert-info text-center">
            You already have a registered restaurant. You can view it from the{" "}
            <strong>
              <Link
                to="/my-restaurant/status-report"
                className="text-decoration-underline"
              >
                Restaurant Status & Report
              </Link>
            </strong>{" "}
            page.
          </div>
        ) : (
          <>
            <h3 className="text-center mb-4">
              <i className="fa fa-plus"></i> Request Opening Restaurant Form
            </h3>

            {/* Message container with ref */}
            <div ref={messageRef}>
              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Restaurant Name */}
              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  <i className="fa fa-user"></i> Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter restaurant name"
                  required
                />
              </div>

              {/* Restaurant Email */}
              <div className="mb-3">
                <label htmlFor="email" className="form-label">
                  <i className="fa fa-envelope"></i> Email
                </label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter restaurant email"
                  required
                />
              </div>

              {/* Restaurant Phone */}
              <div className="mb-3">
                <label htmlFor="phone" className="form-label">
                  <i className="fa fa-phone"></i> Phone
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter restaurant phone"
                  required
                />
              </div>

              {/* Restaurant Description */}
              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  <i class="fa-solid fa-tag"></i> Description
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter restaurant description"
                  required
                />
              </div>

              {/* Restaurant Location */}
              <div className="mb-3">
                <label htmlFor="location" className="form-label">
                  <i className="fa fa-map"></i> Location
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Enter restaurant location"
                  required
                />
              </div>

              {/* Opening Hours (Checkboxes + Time Pickers) */}
              <div className="mb-3">
                <label className="form-label">
                  <FontAwesomeIcon icon={faClock} /> Opening Hours
                </label>
                <div className="form-check">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <div key={day}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={day}
                        onChange={(e) =>
                          handleOpeningHoursChange(
                            day,
                            "enabled",
                            e.target.checked
                          )
                        }
                      />
                      <label className="form-check-label">{day}</label>

                      {formData.openingHours[day]?.enabled && (
                        <div className="d-flex justify-content-start gap-2 mt-2">
                          <input
                            type="time"
                            className="form-control w-25 mr-2"
                            value={formData.openingHours[day]?.open || ""}
                            onChange={(e) =>
                              handleOpeningHoursChange(
                                day,
                                "open",
                                e.target.value
                              )
                            }
                          />
                          <input
                            type="time"
                            className="form-control w-25"
                            value={formData.openingHours[day]?.close || ""}
                            onChange={(e) =>
                              handleOpeningHoursChange(
                                day,
                                "close",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div className="mb-3">
                <label htmlFor="imgFile" className="form-label">
                  <i class="fa fa-image"></i> Restaurant Logo
                </label>
                <input
                  type="file"
                  className="form-control"
                  id="imgFile"
                  onChange={(e) => setImgFile(e.target.files[0])}
                />
              </div>

              {/* Submit Button */}
              <div className="d-flex justify-content-center align-items-center send_bt">
                <button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin /> Sending
                      Request...
                    </>
                  ) : (
                    <>
                      <i class="fa fa-paper-plane"></i> Send Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
