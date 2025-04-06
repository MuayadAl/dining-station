import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  orderBy,
  startAfter,
  limit,
  where,
} from "firebase/firestore";
import { db } from "../../models/firebase";
import "../style/styleSheet.css";
import "./../style/responsive.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { NavLink } from "react-router-dom";
import "../style/responsive.css"
const BATCH_SIZE = 6; // Number of restaurants loaded per batch

function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const navigate = useNavigate();
  const fetchRestaurants = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      let restaurantQuery = query(
        collection(db, "restaurants"),
        // where("approvalStatus", "==", "approved"), // Only fetch approved restaurants
        orderBy("name"),
        limit(BATCH_SIZE)
      );

      if (lastVisible) {
        restaurantQuery = query(
          collection(db, "restaurants"),
          // where("approvalStatus", "==", "approved"), // Ensure this applies for pagination
          orderBy("name"),
          startAfter(lastVisible),
          limit(BATCH_SIZE)
        );
      }

      const querySnapshot = await getDocs(restaurantQuery);
      const newRestaurants = querySnapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            status: getRestaurantStatus(data.openingHours, data.status),
          };
        })
        .filter((restaurant) => restaurant.approvalStatus === "approved");

        newRestaurants.sort((a, b) => {
          const statusPriority = { open: 0, busy: 1, closed: 2 };
          return statusPriority[a.status] - statusPriority[b.status];
        });
        

      // Avoid duplicates
      setRestaurants((prevRestaurants) => {
        const existingIds = new Set(prevRestaurants.map((r) => r.id));
        const uniqueRestaurants = newRestaurants.filter(
          (r) => !existingIds.has(r.id)
        );
        return [...prevRestaurants, ...uniqueRestaurants];
      });

      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    }
    setLoading(false);
  }, [lastVisible, loading, hasMore]);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 200 &&
        !loading &&
        hasMore
      ) {
        fetchRestaurants();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchRestaurants, loading, hasMore]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRestaurants((prevRestaurants) => {
        const updated = prevRestaurants.map((r) => ({
          ...r,
          status: getRestaurantStatus(r.openingHours, r.status),
        }));
  
        updated.sort((a, b) => {
          const statusPriority = { open: 0, busy: 1, closed: 2 };
          return statusPriority[a.status] - statusPriority[b.status];
        });
  
        return updated;
      });
    }, 60000); // Every 60 seconds
  
    return () => clearInterval(interval);
  }, []);
  

  const getRestaurantStatus = (openingHours, manualStatus) => {
    if (manualStatus === "closed") return "closed";
    if (manualStatus === "busy") return "busy";

    if (!openingHours) return "closed";

    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" });
    const currentTime = now.toLocaleTimeString("en-US", { hour12: false });

    const today = openingHours[currentDay];
    if (!today || !today.enabled) return "closed";

    return currentTime >= today.open && currentTime <= today.close
      ? "open"
      : "closed";
  };

  const handleNavigation = (page) => {
    navigate(`/user/menu-page/${page}`);
  };

  const RestaurantCardPlaceholder = () => (
    <div className="col-lg-3 col-md-6 d-flex justify-content-center">
      <div className="restaurant_card placeholder-glow">
        <div
          className="restaurant_img bg-secondary placeholder"
          style={{ height: "200px", width: "100%" }}
        ></div>
        <div className="restaurant_box">
          <h3
            className="types_text placeholder bg-secondary"
            style={{ height: "20px", width: "70%" }}
          ></h3>
          <p
            className="looking_text placeholder bg-secondary"
            style={{ height: "14px", width: "100%" }}
          ></p>
          <div className="read_bt">
            <div
              className="order_btn placeholder bg-secondary"
              style={{ height: "30px", width: "100px" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container p-4 text-center">
      <h1 className="restaurant_title">RESTAURANTS</h1>
      <div className="row justify-content-start shadow p-3 mb-5 bg-body rounded-3">
        {restaurants.length > 0 ? (
          restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="col-lg-3 col-md-6 d-flex justify-content-center"
            >
              <div
                className={`restaurant_card mb-4 mx-2 ${
                  restaurant.status === "open"
                    ? ""
                    : "disabled pointer-event-none opacity-75"
                }`}
                onClick={() => {
                  if (restaurant.status === "open") {
                    handleNavigation(restaurant.id);
                  }
                }}
              >
                <div className="restaurant_img position-relative">
                  <img
                    src={restaurant.imgUrl}
                    alt={restaurant.name}
                    loading="lazy"
                    className="w-100 mt-0"
                  />
                  <span
                    title={`Manual: ${
                      restaurant.manualStatus || "N/A"
                    }, Schedule: ${getRestaurantStatus(
                      restaurant.openingHours,
                      "open"
                    )}`}
                    className={`position-absolute top-0 start-0 m-2 px-2 py-1 rounded ${
                      restaurant.status === "open"
                        ? "bg-success"
                        : restaurant.status === "closed"
                        ? "bg-danger"
                        : "bg-warning"
                    } text-white fw-bold`}
                    style={{ fontSize: "0.8rem" }}
                  >
                    <i
                      className={`fa-solid ${
                        restaurant.status === "open"
                          ? "fa-door-open"
                          : "fa-door-closed"
                      } me-1`}
                    ></i>
                    {restaurant.status}
                  </span>
                </div>

                <div className="restaurant_box">
                  <h3 className="types_text" title={restaurant.name}>
                    {restaurant.name}
                  </h3>
                  <p className="looking_text" title={restaurant.description}>
                    {restaurant.description}
                  </p>
                  <div className="read_bt">
                    {restaurant.status === "open" ? (
                      <NavLink
                        className="order_btn"
                        to={`/user/menu-page/${restaurant.id}`}
                      >
                        Order Now
                      </NavLink>
                    ) : (
                      <button className="btn btn-secondary" disabled>
                        Closed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : loading ? (
          // Show placeholders if loading and no restaurants yet
          <>
            {Array.from({ length: BATCH_SIZE }).map((_, index) => (
              <RestaurantCardPlaceholder key={index} />
            ))}
          </>
        ) : (
          <p>Please log in to view restaurants.</p>
        )}
      </div>
    </div>
  );
}

export default RestaurantsPage;
