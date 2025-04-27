import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "../style/styleSheet.css";
import SpinnerFallback from "../components/SpinnerFallback";
const Forbidden403 = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) return <SpinnerFallback />;

  return (
    <div
      className="container d-flex align-items-center justify-content-center text-center"
      style={{ height: "90vh" }}
    >
      <div className="row w-50 p-4 rounded bg-white shadow">
        <h1 className="forbidden-code text-danger">403</h1>
        <h2 className="forbidden-heading">Access Denied</h2>
        <p className="forbidden-message mb-4">
          You do not have permission to view this page.
        </p>
        <div className="">
          <NavLink className="btn btn-danger" to="/landing">
            Go Back to Home
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Forbidden403;
