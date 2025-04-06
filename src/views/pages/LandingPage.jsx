import "../style/styleSheet.css";
import "../style/responsive.css";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useEffect } from "react";
import { auth, db } from "../../models/firebase";
import { collection, getDocs } from "firebase/firestore";

function LandingPage() {
  const [user, setUser] = useState(null);
  const [topItems, setTopItems] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTopItems = async () => {
      try {
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        const itemMap = {};

        ordersSnapshot.forEach((doc) => {
          const order = doc.data();
          if (Array.isArray(order.items)) {
            order.items.forEach((item) => {
              const name = item.name || item.itemName;
              const quantity = item.quantity || 1;
              const image = item.imgUrl || "";

              if (name) {
                if (!itemMap[name]) {
                  itemMap[name] = { name, image, total: 0 };
                }
                itemMap[name].total += quantity;
              }
            });
          }
        });

        const sorted = Object.values(itemMap)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        setTopItems(sorted);
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    };

    fetchTopItems();
  }, []);

  return (
    <div>
      <div className="img-fluid header_section ">
        <div className="banner_section layout_padding">
          <div className="container">
            <div
              id="banner_slider"
              className="carousel slide"
              data-bs-ride="carousel"
            >
              <div className="carousel-inner">
                <div className="carousel-item active">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="banner_taital_main">
                        <h1 className="banner_taital">
                          Dining <br />
                          Station
                        </h1>
                        <p className="banner_text">
                          Say goodbye to long queues! Simply order and pay with
                          ease, and we'll notify you as soon as your order is
                          ready for pickup!
                        </p>
                        <div className="btn_main">
                          <div className="main_btn active">
                            {/* Hide the Register link if the user is logged in */}
                            {!user && <a href="signup">Register</a>}
                          </div>
                          <div className="callnow_bt">
                            {/* Hide the Login link if the user is logged in */}
                            {!user && <a href="/login">Login</a>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <section className="container py-4">
        <h2
          className="text-center "
          style={{ fontSize: "2.2rem", fontWeight: "600" }}
        >
          Top 5 Ordered Items
        </h2>

        {topItems.length === 0 ? (
          <div className="text-center">
            <p>No top items found yet. Be the first to order something!</p>
          </div>
        ) : (
          <div
            id="topItemsCarousel"
            className="carousel slide top-items-carousel"
            data-bs-ride="carousel"
          >
            {/* Carousel Indicators */}
            <div className="carousel-indicators">
              {topItems.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  data-bs-target="#topItemsCarousel"
                  data-bs-slide-to={idx}
                  className={
                    idx === 0 ? "active indicator-btn" : "indicator-btn"
                  }
                  aria-current={idx === 0 ? "true" : undefined}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Carousel Items */}
            <div className="carousel-inner carousel-items-wrapper">
              {topItems.map((item, idx) => (
                <div
                  className={`carousel-item ${idx === 0 ? "active" : ""}`}
                  key={item.name}
                >
                  <div className="carousel-item-container">
                    <div className="carousel-img-wrapper">
                      <img
                        src={
                          item.image ||
                          "https://via.placeholder.com/600x400?text=No+Image+Available"
                        }
                        alt={item.name}
                        className="carousel-img"
                      />
                      {idx === 0 && (
                        <div className="carousel-label">Most Popular</div>
                      )}
                    </div>
                    <div className="carousel-text">
                      <h4>{item.name}</h4>
                      <p>
                        Ordered <span>{item.total}</span> times
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            {topItems.length > 1 && (
              <>
                <button
                  className="carousel-control-prev"
                  type="button"
                  data-bs-target="#topItemsCarousel"
                  data-bs-slide="prev"
                >
                  <span
                    className="carousel-control-prev-icon carousel-icon"
                    aria-hidden="true"
                  />
                  <span className="visually-hidden">Previous</span>
                </button>
                <button
                  className="carousel-control-next"
                  type="button"
                  data-bs-target="#topItemsCarousel"
                  data-bs-slide="next"
                >
                  <span
                    className="carousel-control-next-icon carousel-icon"
                    aria-hidden="true"
                  />
                  <span className="visually-hidden">Next</span>
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default LandingPage;
