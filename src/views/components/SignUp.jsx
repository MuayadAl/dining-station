// src/pages/SignUp.jsx
import React, { useState } from 'react';

import { NavLink, useNavigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import 'font-awesome/css/font-awesome.min.css';
import { handleSignUp } from '../../controllers/authController';

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    gender: '',
    userRole: 'customer',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate(); // useNavigate hook

  // Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle password visibility toggle
  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate email
    const emailRegex = /@apu.edu.my$|@mail.apu.edu.my$/;
    if (!emailRegex.test(formData.email)) {
      setError("Email must be @apu.edu.my or @mail.apu.edu.my");
      return;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      // Call the sign up controller with user data
      await handleSignUp(formData.email, formData.password, formData);
      // Redirect to the 'Registration Successful' page
      navigate('/registered-success'); // Navigate to success page
    } catch (err) {
      setError("Sign-up failed. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow-lg p-4" style={{ width: '100%', maxWidth: '800px' }}>
        <h3 className="text-center mb-4">
          <i className="fa fa-user-plus"></i> Sign Up
        </h3>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">{error}</div>}
          
          {/* Name */}
          <div className="mb-3">
            <label htmlFor="name" className="form-label">
              <i className="fa fa-user"></i> Full Name
            </label>
            <input
              type="text"
              className="form-control"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Email */}
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              <i className="fa fa-envelope"></i> Email
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tp061234@mail.apu.edu.my"
              required
            />
          </div>

          {/* Gender */}
          <div className="mb-3">
            <label className="form-label">
              <i className="fa fa-venus-mars"></i> Gender
            </label>
            <select
              className="form-select"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="">Select your gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* Password */}
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
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={togglePassword}
              >
                <i className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"}></i>
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="mb-3">
            <label htmlFor="confirmPassword" className="form-label">
              <i className="fa fa-lock"></i> Confirm Password
            </label>
            <div className="input-group">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="form-control"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={toggleConfirmPassword}
              >
                <i className={showConfirmPassword ? "fa fa-eye-slash" : "fa fa-eye"}></i>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="d-flex justify-content-center align-items-center main_btn active w-100">
            <button type="submit" className="btn w-50">
              Sign Up
            </button>
          </div>

          {/* Already have an account */}
          <div className="text-center mt-3">
            <span>Already have an account? </span>
            <NavLink to="/login" className="text-primary">
              Login
            </NavLink>
          </div>
        </form>
      </div>
    </div>
  );
}
