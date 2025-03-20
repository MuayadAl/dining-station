import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../models/firebase"; // Adjust the import path as needed
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faUser,
  faEnvelope,
  faStore,
  faClock,
  faStickyNote,
  faPhone,
  faMapMarkerAlt,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

const AdminRestaurantApprovalPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch all pending restaurant requests with user details
  useEffect(() => {
    const fetchPendingRestaurants = async () => {
      try {
        const q = query(
          collection(db, "restaurants"),
          where("approvalStatus", "==", "pending")
        );
        const querySnapshot = await getDocs(q);
        const restaurantsList = [];

        for (const docSnap of querySnapshot.docs) {
          const restaurantData = docSnap.data();
          const userRef = doc(db, "users", restaurantData.userId);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            restaurantsList.push({
              id: docSnap.id,
              ...restaurantData,
              userName: userDoc.data().name,
              userEmail: userDoc.data().email,
            });
          } else {
            restaurantsList.push({
              id: docSnap.id,
              ...restaurantData,
              userName: "Unknown",
              userEmail: "Unknown",
            });
          }
        }

        setRestaurants(restaurantsList);
      } catch (err) {
        setError("Error fetching pending restaurants: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingRestaurants();
  }, []);

  // Handle approval or rejection of a restaurant
  const handleApproval = async (restaurantId, status, remark = "") => {
    try {
      const restaurantRef = doc(db, "restaurants", restaurantId); // Correct usage of `doc`
      await updateDoc(restaurantRef, {
        approvalStatus: status,
        remark: remark,
      });

      // Update the UI by removing the approved/rejected restaurant
      setRestaurants((prev) => prev.filter((rest) => rest.id !== restaurantId));

      // Show success message
      Swal.fire({
        icon: "success",
        title: `Restaurant ${status}`,
        text: `The restaurant has been ${status}.`,
      });
    } catch (err) {
      setError("Error updating restaurant status: " + err.message);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to update restaurant status.",
      });
    }
  };

  // Handle rejection with SweetAlert2
  const handleReject = (restaurantId) => {
    Swal.fire({
      title: "Reject Restaurant",
      input: "textarea",
      inputPlaceholder: "Add a remark (optional)",
      showCancelButton: true,
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel",
      icon: "warning",
    }).then((result) => {
      if (result.isConfirmed) {
        const remark = result.value || "";
        handleApproval(restaurantId, "rejected", remark);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-vh-100 container-fluid d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 container-fluid">
        <div
          className="container-fluid float-start alert alert-danger text-center my-5 py-5 fs-5"
          role="alert"
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mb-4 float-start">
      <h1 className="text-center mb-4">Restaurant Approval Requests</h1>

      {restaurants.length === 0 ? (
        <div className="min-vh-100 container-fluid">
          <div
            className="alert alert-info text-center my-5 py-5 fs-5"
            role="alert"
          >
            <i class="fa-solid fa-hourglass-start fa-spin"></i> No pending
            restaurant requests.
          </div>
        </div>
      ) : (
        <div className="row">
         
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} className="col-md-6 mb-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  {/* Restaurant Image */}
                  {restaurant.imgUrl && (
                    <div className="text-center mb-3">
                      <img
                        src={restaurant.imgUrl}
                        alt={restaurant.name}
                        className="img-fluid"
                        style={{
                          maxWidth: "150px",
                          height: "150px",
                          borderRadius: "50%",
                        }}
                      />
                    </div>
                  )}

                  {/* Restaurant Details */}
                  <h5 className="card-title text-primary text-center fw-bold">
                    {restaurant.name}
                  </h5>
                  <hr />

                  <div className="row">
                    <div className="col-12 col-md-6 mb-3">
                      <p className="card-text">
                        <FontAwesomeIcon icon={faUser} className="me-2" />
                        <strong>Requested By:</strong> {restaurant.userName}
                      </p>
                      <p className="card-text">
                        <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                        <strong>User Email:</strong> {restaurant.userEmail}
                      </p>

                      <p className="card-text">
                        <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                        <strong>Restaurant Email:</strong> {restaurant.email}
                      </p>
                    </div>

                    <div className="col-md-6">
                      <p className="card-text">
                        <FontAwesomeIcon icon={faPhone} className="me-2" />
                        <strong>Phone:</strong> {restaurant.phone}
                      </p>
                      <p className="card-text">
                        <FontAwesomeIcon
                          icon={faMapMarkerAlt}
                          className="me-2"
                        />
                        <strong>Location:</strong> {restaurant.location}
                      </p>
                      <p className="card-text">
                        <FontAwesomeIcon icon={faClock} className="me-2" />
                        <strong>Created At:</strong>{" "}
                        {restaurant.createdAt?.toDate().toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Approve/Reject Buttons */}
                  <div className="d-flex gap-3 mt-2">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleApproval(restaurant.id, "approved")}
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                      Approve
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleReject(restaurant.id)}
                    >
                      <FontAwesomeIcon icon={faTimesCircle} className="me-2" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRestaurantApprovalPage;
