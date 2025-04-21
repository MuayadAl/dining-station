import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "font-awesome/css/font-awesome.min.css";
import { NavLink, useNavigate } from "react-router-dom";
import {
  handleLogin,
  handlePasswordReset,
} from "../../controllers/authController";
import { Modal, Button } from "react-bootstrap";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showResetModal, setShowResetModal] = useState(false); // Modal visibility
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const navigate = useNavigate();

  // Toggle password visibility
  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  // Handle input change for email and password
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "email") {
      setEmail(value);
    } else if (name === "password") {
      setPassword(value);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Both email and password are required.");
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@(apu\.edu\.my|mail\.apu\.edu\.my)$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      const user = await handleLogin(email, password);
      navigate("/landing", { replace: true });
    } catch (error) {
      setError("Invalid email or password. Please try again.");
    }
  };

  // Password reset
  const handleResetSubmit = async () => {
    setResetMessage("");

    if (!resetEmail) {
      setResetMessage("Email is required.");
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@(apu\.edu\.my|mail\.apu\.edu\.my)$/;
    if (!emailRegex.test(resetEmail)) {
      setResetMessage("Please enter a valid APU email address.");
      return;
    }

    try {
      await handlePasswordReset(resetEmail);
      setResetMessage(
        "Password reset link has been sent successfully. If this email is registered, you will receive a reset link."
      );
    } catch (err) {
      setResetMessage("Failed to send reset email. Please try again.");
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100 ">
      <div
        className="card shadow-lg p-5 "
        style={{ width: "100%", maxWidth: "800px" }}
      >
        <h3 className="text-center mb-4">
          <i className="fa fa-user-circle"></i> Login
        </h3>

        {/* Display error message */}
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              <i className="fa fa-envelope"></i> Email
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              name="email"
              placeholder="tp061234@mail.apu.edu.my"
              value={email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              <i className="fa fa-lock"></i> Password
            </label>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                id="password"
                name="password"
                placeholder="Password"
                value={password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary bg-black"
                onClick={togglePassword}
              >
                <i
                  className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"}
                ></i>
              </button>
            </div>
          </div>

          <div className="d-flex justify-content-center align-items-center main_btn active w-100">
            <button type="submit" className="btn w-50">
              Login
            </button>
          </div>

          <div className="text-center">
            <a
              href="#"
              className="small"
              onClick={() => setShowResetModal(true)}
            >
              <i className="fa fa-question-circle mt-2"></i> Forgot your password?
            </a>
          </div>

          {/* Sign Up Option */}
          <li className="text-center mt-3">
            <span>Don't have an account? </span>
            <NavLink to="/signup" className="text-primary">
              Sign Up
            </NavLink>
          </li>
        </form>
      </div>
      {/* Password Reset Modal */}
      <Modal
        show={showResetModal}
        onHide={() => setShowResetModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Reset Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label htmlFor="resetEmail" className="form-label">
              Enter your email address
            </label>
            <input
              type="email"
              className="form-control"
              id="resetEmail"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="tp061234@mail.apu.edu.my"
            />
          </div>
          {resetMessage && (
            <div
              className={`alert ${
                resetMessage.toLowerCase().includes("success")
                  ? "alert-success"
                  : "alert-danger"
              } d-flex align-items-center gap-2 shadow-sm rounded-2 px-3 py-2`}
              role="alert"
            >
              <i
                className={`fa ${
                  resetMessage.toLowerCase().includes("success")
                    ? "fa-check-circle"
                    : "fa-exclamation-circle"
                }`}
                aria-hidden="true"
              ></i>
              <span className="flex-grow-1">{resetMessage}</span>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResetModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleResetSubmit}>
            Send Reset Link
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
