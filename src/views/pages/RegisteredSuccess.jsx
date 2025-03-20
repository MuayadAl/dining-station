// src/pages/RegisteredSuccess.jsx
import React from "react";
import { useNavigate } from "react-router-dom"; // Use useNavigate

export default function RegisteredSuccess() {
  const navigate = useNavigate(); // useNavigate hook

  // Handle the redirection to the login page
  const handleLandingRedirect = () => {
    navigate("/landing"); // Redirects to the login page
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div
        className="card shadow-lg p-4"
        style={{ width: "100%", maxWidth: "800px" }}
      >
        <h3 className="text-center mb-4">
          <i className="fa fa-check-circle"></i> Registration Successful!
        </h3>
        <p className="text-center">You have successfully registered!.</p>
        <div className="d-flex justify-content-center align-items-center">
          <button
            className="btn btn-primary w-50"
            onClick={handleLandingRedirect}
          >
            Proceed to Home page
          </button>
        </div>
      </div>
    </div>
  );
}
