// src/components/Loader.jsx
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const SpinnerFallback = ({ message = "Loading..." }) => {
  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="text-center">
        <FontAwesomeIcon
          icon={faSpinner}
          spin
          size="3x"
          className="text-primary mb-3"
        />
        <h5 className="text-muted">{message}</h5>
      </div>
    </div>
  );
};

export default SpinnerFallback;
