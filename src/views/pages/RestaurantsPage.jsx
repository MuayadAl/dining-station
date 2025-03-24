import React, { useState, useEffect, useCallback } from "react";
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

const BATCH_SIZE = 6; // Number of restaurants loaded per batch

function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);


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
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((restaurant) => restaurant.approvalStatus === "approved"); // Additional check

      // Avoid duplicates
      setRestaurants((prevRestaurants) => {
        const existingIds = new Set(prevRestaurants.map((r) => r.id));
        const uniqueRestaurants = newRestaurants.filter(
          (r) => !existingIds.has(r.id)
        );
        return [...prevRestaurants, ...uniqueRestaurants];
      });

      // Update last document for pagination
      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      } else {
        setHasMore(false); // Stop fetching when no more data
      }

      
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    }
    setLoading(false);
  }, [lastVisible, loading, hasMore]);

  useEffect(() => {
    fetchRestaurants(); // Fetch initial data
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

  

  return (
    <div className="container p-4 text-center">
      <h1 className="restaurant_title">OUR RESTAURANTS</h1>
      <div className="row justify-content-start shadow p-3 mb-5 bg-body rounded-3">
        {restaurants.length > 0 ? (
          restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="col-lg-3 col-md-6 d-flex justify-content-center"
            >
              <div className="restaurant_card">
                <div className="restaurant_img placeholder-glow">
                  <img
                    src={restaurant.imgUrl}
                    alt={restaurant.name}
                    loading="lazy"
                  />
                </div>
                <div className="restaurant_box">
                  <h3 className="types_text" title={restaurant.name}>
                    {restaurant.name}
                  </h3>
                  <p className="looking_text" title={restaurant.description}>
                    {restaurant.description}
                  </p>
                  <div className="read_bt">
                    <NavLink
                      className="order_btn"
                      to={`/user/menu-page/${restaurant.id}`}
                    >
                      Order Now
                    </NavLink>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : ( !loading && (
          <p>Please log in to view restaurants.</p>
        )
        )}
      </div>
      {loading && (
        <p>
          <i className="fa-solid fa-spinner fa-spin"></i> Loading more
          restaurants...
        </p>
      )}
      {/* {!hasMore && restaurants.length > 0 && (
        <p>
          <i className="fa-solid fa-bed fa-beat"></i> No more restaurants to
          load.
        </p>
      )} */}
    </div>
  );
}

export default RestaurantsPage;
