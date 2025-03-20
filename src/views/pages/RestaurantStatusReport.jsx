import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../models/firebase"; // Adjust the import path as needed
import { onAuthStateChanged } from "firebase/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCheckCircle,
  faHourglass,
  faTimesCircle,
  faChartLine,
  faCalendarDays,
  faStore,
  faStickyNote,
  faDoorOpen,
  faDoorClosed,
} from "@fortawesome/free-solid-svg-icons";

const RestaurantStatusReports = () => {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantStatus, setRestaurantStatus] = useState("Checking status...");

  // Function to check if the restaurant is open or closed
  const getRestaurantStatus = (openingHours) => {
    if (!openingHours) return "Closed";

    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" }); // Get current day (e.g., "Monday")
    const currentTime = now.toLocaleTimeString("en-US", { hour12: false }); // Get current time in 24-hour format

    const todayHours = openingHours[currentDay];

    if (!todayHours || !todayHours.enabled) {
      return "Closed";
    }

    const openTime = todayHours.open;
    const closeTime = todayHours.close;

    if (currentTime >= openTime && currentTime <= closeTime) {
      return "Open";
    } else {
      return "Closed";
    }
  };

  // Fetch restaurant data for the logged-in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const restaurantQuery = query(
            collection(db, "restaurants"),
            where("userId", "==", user.uid)
          );
          const querySnapshot = await getDocs(restaurantQuery);

          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const restaurantData = docSnap.data();
            setRestaurant(restaurantData);

            // Calculate and set the restaurant status
            const status = getRestaurantStatus(restaurantData.openingHours);
            setRestaurantStatus(status);
          } else {
            setError("No restaurant found for this user.");
          }
        } catch (err) {
          setError("Error fetching restaurant data: " + err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setError("User not authenticated.");
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  if (loading) {
    return (
      <div className="min-vh-100 container-fluid d-flex align-items-center justify-content-center">
        <div className="container d-flex justify-content-center align-items-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>

      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 container-fluid">
        <div className=" container-fluid float-start alert alert-danger text-center my-5 py-5 fs-5" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
        <div className="alert alert-warning text-center mt-5" role="alert">
          No restaurant data available.
        </div>

    );
  }

  return (
    <div className="container-fluid mb-4 float-start">
      {/* Restaurant Status Badge */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <p className="flex-grow-1 text-center fs-1 mt-2 me-2 fw-bold">Restaurant Status & Reports</p>
        <div >
          <span
            className={`badge py-3 ${
              restaurantStatus === "Open" ? "bg-success" : "bg-danger"
            }`}
          >
            <FontAwesomeIcon
              icon={restaurantStatus === "Open" ? faDoorOpen : faDoorClosed}
              className="me-2"
            />
            {restaurantStatus}
          </span>
        </div>
      </div>

      {/* Restaurant Status Section */}
      <section className="mb-5">
        <h2 className="mb-4">
          <FontAwesomeIcon icon={faChartLine} className="me-2" />
          Restaurant Status
        </h2>
        <div className="card shadow-sm">
          <div className="card-body fs-6">
            <h5 className="card-title text-primary text-center fw-bold">
              {restaurant.name}
            </h5>
            <hr />

            <div className="row">
              <div className="col-12 col-md-6 mb-3">
                <p className="card-text">
                  <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                  <strong>Email:</strong> {restaurant.email}
                </p>
                <p className="card-text">
                  <FontAwesomeIcon icon={faPhone} className="me-2" />
                  <strong>Phone:</strong> {restaurant.phone}
                </p>
                <p className="card-text">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                  <strong>Location:</strong> {restaurant.location}
                </p>
              </div>
              <div className="col-md-6">
                <p className="card-text">
                  <FontAwesomeIcon icon={faStore} className="me-2" />
                  <strong>Approval Status:</strong>{" "}
                  <span
                    className={`badge p-2 ${
                      restaurant.approvalStatus === "approved"
                        ? "bg-success"
                        : restaurant.approvalStatus === "pending"
                        ? "bg-warning"
                        : "bg-danger"
                    }`}
                  >
                    {restaurant.approvalStatus === "approved" && (
                      <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                    )}
                    {restaurant.approvalStatus === "pending" && (
                      <FontAwesomeIcon icon={faHourglass} className="me-1" />
                    )}
                    {restaurant.approvalStatus === "rejected" && (
                      <FontAwesomeIcon icon={faTimesCircle} className="me-1" />
                    )}
                    {restaurant.approvalStatus}
                  </span>
                </p>
                <p className="card-text">
                  <FontAwesomeIcon icon={faClock} className="me-2" />
                  <strong>Created At:</strong>{" "}
                  {restaurant.createdAt?.toDate().toLocaleString()}
                </p>
                <p className="card-text">
                  <FontAwesomeIcon icon={faStickyNote} className="me-2" />
                  <strong>Remark:</strong> {restaurant.remark || "N/A"}
                </p>
              </div>
            </div>
            <hr />
            <div style={{ paddingLeft: "20px" }}>
              <h6>
                <FontAwesomeIcon icon={faCalendarDays} className="me-2" />
                Opening Hours
              </h6>
              <ul className="list-unstyled row">
                {Object.entries(restaurant.openingHours || {})
                  .sort(([dayA], [dayB]) => {
                    const order = [
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ];
                    return order.indexOf(dayA) - order.indexOf(dayB);
                  })
                  .map(([day, hours]) => (
                    <li key={day} className="col-md-4 mb-2">
                      <strong>{day}:</strong>{" "}
                      {hours && hours.enabled && hours.open && hours.close ? (
                        <span className="text-success">
                          {hours.open} - {hours.close}
                        </span>
                      ) : (
                        <span className="text-danger">Closed</span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Reports Section (Placeholder) */}
      <section>
        <h2 className="mb-4">
          <FontAwesomeIcon icon={faChartLine} className="me-2" />
          Reports
        </h2>
        <div className="card shadow-sm">
          <div className="card-body">
            <p className="card-text text-muted">
              Reports section will be added once the backend is ready.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RestaurantStatusReports;
