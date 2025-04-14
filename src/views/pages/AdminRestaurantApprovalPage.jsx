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
import { db } from "../../models/firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
  faUser,
  faEnvelope,
  faClock,
  faPhone,
  faMapMarkerAlt,
  faBan,
  faUndo,
  faStickyNote,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

const AdminRestaurantApprovalPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  

  useEffect(() => {
    fetchRestaurants();
  }, [activeTab]);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const statuses = ["pending", "approved", "rejected", "suspended"];
      const allRestaurants = [];

      for (const status of statuses) {
        const q = query(
          collection(db, "restaurants"),
          where("approvalStatus", "==", status)
        );
        const querySnapshot = await getDocs(q);

        for (const docSnap of querySnapshot.docs) {
          const restaurantData = docSnap.data();
          const userRef = doc(db, "users", restaurantData.userId);
          const userDoc = await getDoc(userRef);

          allRestaurants.push({
            id: docSnap.id,
            ...restaurantData,
            userName: userDoc.exists() ? userDoc.data().name : "Unknown",
            userEmail: userDoc.exists() ? userDoc.data().email : "Unknown",
          });
        }
      }

      setRestaurants(allRestaurants);
    } catch (err) {
      setError("Error fetching restaurants: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (restaurantId, newStatus, remark = "") => {
    try {
      const restaurantRef = doc(db, "restaurants", restaurantId);
      await updateDoc(restaurantRef, {
        approvalStatus: newStatus,
        remark: remark,
      });

      await fetchRestaurants(); // ⬅️ refresh data after update

      Swal.fire({
        icon: "success",
        title: `Restaurant ${newStatus}`,
        text: `The restaurant has been marked as ${newStatus}.`,
        confirmButtonColor: "#f01c1c", 

      });
    } catch (err) {
      setError("Error updating status: " + err.message);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to update restaurant status.",
        confirmButtonColor: "#f01c1c", 

      });
    }
  };

  const handleStatusWithRemark = (restaurantId, newStatus, title) => {
    Swal.fire({
      title: title,
      input: "textarea",
      inputPlaceholder: "Add a remark (optional)",
      showCancelButton: true,
      confirmButtonText: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
      cancelButtonText: "Cancel",
      confirmButtonColor: "#f01c1c", 
      cancelButtonColor: "#3085d6", 
      icon: "warning",
    }).then((result) => {
      if (result.isConfirmed) {
        const remark = result.value || "";
        updateStatus(restaurantId, newStatus, remark);
      }
    });
  };
  

  const filteredRestaurants = restaurants
  .filter((rest) => rest.approvalStatus === activeTab)
  .filter((rest) => {
    const term = searchTerm.toLowerCase();
    return (
      rest.name?.toLowerCase().includes(term) ||
      rest.userName?.toLowerCase().includes(term) ||
      rest.userEmail?.toLowerCase().includes(term) ||
      rest.email?.toLowerCase().includes(term) ||
      rest.location?.toLowerCase().includes(term)
    );
  });


  return (
    <div className="container-fluid mb-4 float-start">
      <h1 className="text-center mb-4">Restaurant Approval Requests</h1>

      
      {/* Search Box */}
      <div className="container mb-4">
        <div className="row justify-content-center">
          <div className="col-md-6 mt-4">
            <form className="d-flex">
              <div className="input-group">
                <input
                  className="form-control"
                  type="search"
                  placeholder="Search"
                  aria-label="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="input-group-text bg-black">
                  <i className="fa fa-search text-white"></i>
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3 justify-content-center align-items-center">
        {["pending", "approved", "rejected", "suspended"].map((status) => (
          <li className="nav-item" key={status}>
            <button
              className={`nav-link ${activeTab === status ? "active" : ""}`}
              onClick={() => setActiveTab(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          </li>
        ))}
      </ul>

      {/* Loading/Error */}
      {loading ? (
        <div className="d-flex justify-content-center align-items-center min-vh-50">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : error ? (
        <div className="alert alert-danger text-center">{error}</div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="alert alert-info text-center">
          No {activeTab} restaurant requests.
        </div>
      ) : (
        <div className="row">
          {filteredRestaurants.map((restaurant) => (
            <div key={restaurant.id} className="col-md-6 mb-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  {/* Optional image */}
                  {restaurant.imgUrl && (
                    <div className="text-center mb-3">
                      <img
                        src={restaurant.imgUrl}
                        alt={restaurant.name}
                        className="img-fluid rounded-circle"
                        style={{ width: "150px", height: "150px" }}
                      />
                    </div>
                  )}

                  <h5 className="text-primary text-center fw-bold">
                    {restaurant.name}
                  </h5>
                  <hr />

                  <div className="row">
                    <div className="col-md-6">
                      <p>
                        <FontAwesomeIcon icon={faUser} className="me-2" />
                        <strong>Requested By:</strong> {restaurant.userName}
                      </p>
                      <p>
                        <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                        <strong>User Email:</strong> {restaurant.userEmail}
                      </p>
                      <p>
                        <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                        <strong>Restaurant Email:</strong> {restaurant.email}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p>
                        <FontAwesomeIcon icon={faPhone} className="me-2" />
                        <strong>Phone:</strong> {restaurant.phone}
                      </p>
                      <p>
                        <FontAwesomeIcon
                          icon={faMapMarkerAlt}
                          className="me-2"
                        />
                        <strong>Location:</strong> {restaurant.location}
                      </p>
                      <p>
                        <FontAwesomeIcon icon={faClock} className="me-2" />
                        <strong>Created At:</strong>{" "}
                        {restaurant.createdAt?.toDate().toLocaleString()}
                      </p>
                      <p>
                        <FontAwesomeIcon icon={faStickyNote} className="me-2" />
                        <strong>Remark:</strong>{" "}
                        {restaurant.remark}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex gap-2 mt-3 flex-wrap">
                    {activeTab === "pending" && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() =>
                            updateStatus(restaurant.id, "approved")
                          }
                        >
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="me-2"
                          />
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleStatusWithRemark(restaurant.id, "rejected", "Reject Restaurant")}
                        >
                          <FontAwesomeIcon
                            icon={faTimesCircle}
                            className="me-2"
                          />
                          Reject
                        </button>
                      </>
                    )}

                    {activeTab === "approved" && (
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => handleStatusWithRemark(restaurant.id, "suspended", "Suspend Restaurant")}
                      >
                        <FontAwesomeIcon icon={faBan} className="me-2" />
                        Suspend
                      </button>
                    )}

                    {activeTab === "rejected" && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() =>
                            updateStatus(restaurant.id, "approved")
                          }
                        >
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="me-2"
                          />
                          Mark as Approved
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => updateStatus(restaurant.id, "pending")}
                        >
                          <FontAwesomeIcon icon={faUndo} className="me-2" />
                          Move to Pending
                        </button>
                      </>
                    )}

                    {/* Suspended action */}

                    {activeTab === "suspended" && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() =>
                            updateStatus(restaurant.id, "approved")
                          }
                        >
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="me-2"
                          />
                          Reactivate
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => updateStatus(restaurant.id, "pending")}
                        >
                          <FontAwesomeIcon icon={faUndo} className="me-2" />
                          Move to Pending
                        </button>
                      </>
                    )}
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
