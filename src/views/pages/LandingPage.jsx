import "../style/styleSheet.css";
import "./../style/responsive.css";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useEffect } from "react";
import { auth } from "../../models/firebase"; // Import Firebase authentication
import RestaurantsPage from "./RestaurantsPage";

function LandingPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if the user is authenticated
    const unsubscribe = auth.onAuthStateChanged(setUser);
    
    // Clean up the subscription when the component unmounts
    return () => unsubscribe();
  }, []);

  return (
    <div>
      <div className="img-fluid header_section ">
        <div className="banner_section layout_padding">
          <div className="container">
            <div
              id="banner_slider"
              className="carousel slide"
              data-ride="carousel"
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
                            {!user && (
                              <a href="signup">
                                  Register
                              </a>
                            )}
                          </div>
                          <div className="callnow_bt">
                            {/* Hide the Login link if the user is logged in */}
                            {!user && (
                              <a href="/login">
                                  Login
                              </a>
                            )}
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
      <RestaurantsPage />
    </div>
  );
}

export default LandingPage;
