import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "font-awesome/css/font-awesome.min.css";
import { handleSignUp } from "../../controllers/authController";
import { auth, db } from "../../models/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import useAlert from "../../hooks/userAlert";

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    gender: "",
    userRole: "customer",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState(null); 
  const navigate = useNavigate();
    const { confirmAction, showSuccess, showError } = useAlert();
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCurrentUserRole(docSnap.data().userRole);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
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
    setError("");
  
    const emailRegex = /@apu.edu.my$|@mail.apu.edu.my$/;
    if (!emailRegex.test(formData.email)) {
      showError("Email must be @apu.edu.my or @mail.apu.edu.my");
      return;
    }
  
    if (formData.password !== formData.confirmPassword) {
      showError("Passwords do not match");
      return;
    }
  
    try {
      if (currentUserRole === "admin") {
        // 🔐 Get admin's Firebase ID token
        const token = await auth.currentUser.getIdToken();
      
        const response = await fetch("http://localhost:5000/api/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // ✅ Required for authMiddleware
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            userData: {
              name: formData.name,
              gender: formData.gender,
              userRole: formData.userRole,
              email: formData.email,
            },
          }),
        });
      
        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error || "Failed to create user");
        }
      
        showSuccess(`You have successfully registered ${formData.name}!`);
        setFormData({
          name: "",
          email: "",
          gender: "",
          userRole: "customer",
          password: "",
          confirmPassword: "",
        });
      }
       else {
        // Regular user self-registration (auto-login)
        await handleSignUp(formData.email, formData.password, {
          name: formData.name,
          gender: formData.gender,
          userRole: formData.userRole,
          email: formData.email,
          
        });
  
        showSuccess("You have successfully registered!");
        navigate("/landing");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Sign-up failed. Please try again.");
    }
  };
  
  

  return (
    <div className="container d-flex justify-content-center align-items-center ">
      <div
        className="card shadow-lg p-4 my-4 w-75"
      >
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

          {/* User Role */}

          {currentUserRole === "admin" && (
            <div className="mb-3">
              <label className="form-label"><i className="fa fa-users"></i> User Role</label>
              <select className="form-select" name="userRole" value={formData.userRole} onChange={handleChange} required>
                <option value="">Select User Role</option>
                <option value="customer">Customer</option>
                <option value="restaurant-owner">Restaurant Owner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

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
                <i
                  className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"}
                ></i>
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
                <i
                  className={
                    showConfirmPassword ? "fa fa-eye-slash" : "fa fa-eye"
                  }
                ></i>
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
