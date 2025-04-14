// Firebase Import Starts
import React, { useState, useEffect } from "react";
import { query, where, collection, getDocs } from "firebase/firestore";
import { editRestaurant } from "../../controllers/restaurantController";
import { auth, db } from "../../models/firebase";
import { onAuthStateChanged } from "firebase/auth";

// Hooks Import
import useAlert from "../../hooks/userAlert";

// Font awesome Import Starts
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { faClock } from "@fortawesome/free-solid-svg-icons";

import imagePlaceHolder from "../../assets/image-placeholder.jpg";
import Loader from "../components/Loader";

export default function EditRestaurant() {
  const { confirmAction, showSuccess, showError } = useAlert(); // Use the alert hook

  const [restaurantId, setRestaurantId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    imgUrl: "",
    openingHours: {
      Monday: { enabled: false, open: "", close: "" },
      Tuesday: { enabled: false, open: "", close: "" },
      Wednesday: { enabled: false, open: "", close: "" },
      Thursday: { enabled: false, open: "", close: "" },
      Friday: { enabled: false, open: "", close: "" },
      Saturday: { enabled: false, open: "", close: "" },
      Sunday: { enabled: false, open: "", close: "" },
    },
  });
  const [imgFile, setImgFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
  
    const fetchRestaurant = async (user) => {
      if (isMounted) setLoading(true); // ✅ Start loading
  
      try {
        if (!user) {
          if (isMounted) {
            setError("User not authenticated");
            setIsHidden(true);
            setLoading(false); // ✅ End loading on error
          }
          return;
        }
  
        const restaurantQuery = query(
          collection(db, "restaurants"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(restaurantQuery);
  
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
  
          if (isMounted) {
            setRestaurantId(docSnap.id);
            setFormData({
              name: data.name || "",
              email: data.email || "",
              phone: data.phone || "",
              location: data.location || "",
              imgUrl: data.imgUrl || "",
              openingHours: data.openingHours || {
                Monday: { enabled: false, open: "", close: "" },
                Tuesday: { enabled: false, open: "", close: "" },
                Wednesday: { enabled: false, open: "", close: "" },
                Thursday: { enabled: false, open: "", close: "" },
                Friday: { enabled: false, open: "", close: "" },
                Saturday: { enabled: false, open: "", close: "" },
                Sunday: { enabled: false, open: "", close: "" },
              },
            });
            setIsHidden(false);
          }
        } else {
          if (isMounted) {
            setError("No restaurant found for this user");
            setIsHidden(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError("Error fetching restaurant: " + err.message);
        }
      } finally {
        if (isMounted) setLoading(false); // ✅ Always stop loading
      }
    };
  
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      fetchRestaurant(user);
    });
  
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);
  

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImgFile(file);

      // Preview the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          imgUrl: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    document.getElementById("fileInput").click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!restaurantId) {
      showError("No restaurant ID found. Cannot update.");
      return;
    }

    // Show confirmation before updating the restaurant
    const isConfirmed = await confirmAction(
      "Are you sure?",
      "Do you want to update this restaurant?",
      "Yes, update it!"
    );

    if (!isConfirmed) return; // Stop if user cancels

    setLoading(true);
    try {
      await editRestaurant(restaurantId, { ...formData, imgFile });
      showSuccess("Restaurant updated successfully!");
      setSuccess("Restaurant updated successfully");
    } catch (err) {
      showError("Error updating restaurant: " + err.message);
      setError("Error updating restaurant: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  if(loading){
    return Loader("Loading...")
  }

  return (
    <div className="container d-flex justify-content-center align-items-center py-2">
      <div className="shadow p-3 mb-5 bg-body rounded body_card_layout">
        <h3 className="text-center mb-4">
          <i className="fa fa-edit"></i> Edit Your Restaurant
        </h3>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Conditionally render the form based on isHidden */}
        {!isHidden && (
          <form onSubmit={handleSubmit}>
            {/* Restaurant Image */}
            <div className="mb-3 text-center position-relative">
              {imgLoading && (
                <div
                  className="spinner-border text-primary position-absolute top-50 start-50 translate-middle"
                  role="status"
                  style={{ width: "2rem", height: "2rem" }}
                ></div>
              )}
              <img
                src={formData.imgUrl || imagePlaceHolder}
                alt="Restaurant Logo"
                className="restaurant_edit_img"
                onClick={handleImageClick}
                onLoad={() => setImgLoading(false)}
                onError={(e) => {
                  e.target.src = imagePlaceHolder;
                  setImgLoading(false);
                }}
                style={imgLoading ? { visibility: "hidden" } : {}}
              />
              <FontAwesomeIcon
                icon={faPen}
                className="restaurant_edit_icon"
                onClick={handleImageClick}
              />
              <input
                type="file"
                id="fileInput"
                className="d-none"
                onChange={handleImageChange}
                accept="image/*"
              />
            </div>

            <hr class="border border-primary border-3 opacity-75" />

            {/* Restaurant Name */}
            <div className="mb-3">
              <label className="form-label">
                <i className="fa fa-user"></i> Name
              </label>
              <input
                type="text"
                className="form-control"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Restaurant Email */}
            <div className="mb-3">
              <label className="form-label">
                <i className="fa fa-envelope"></i> Email
              </label>
              <input
                type="email"
                className="form-control"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Restaurant Phone */}
            <div className="mb-3">
              <label className="form-label">
                <i className="fa fa-phone"></i> Phone
              </label>
              <input
                type="text"
                className="form-control"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            {/* Restaurant Location */}
            <div className="mb-3">
              <label className="form-label">
                <i className="fa fa-map"></i> Location
              </label>
              <input
                type="text"
                className="form-control"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>

            {/* Opening Hours */}
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
                      checked={formData.openingHours?.[day]?.enabled || false}
                      onChange={(e) =>
                        handleOpeningHoursChange(
                          day,
                          "enabled",
                          e.target.checked
                        )
                      }
                    />
                    <label className="form-check-label">{day}</label>

                    {formData.openingHours?.[day]?.enabled && (
                      <div className="d-flex justify-content-start mt-2">
                        <input
                          type="time"
                          className="form-control w-25 mr-2"
                          value={formData.openingHours?.[day]?.open || ""}
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
                          value={formData.openingHours?.[day]?.close || ""}
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

            {/* Submit Button */}
            <div className="d-flex justify-content-center align-items-center send_bt">
              <button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> Updating...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPen}></FontAwesomeIcon> Update
                    Restaurant
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
