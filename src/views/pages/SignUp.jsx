import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "font-awesome/css/font-awesome.min.css";
import { handleSignUp } from "../../controllers/authController";
import { auth, db } from "../../models/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import useAlert from "../../hooks/userAlert";
import zxcvbn from "zxcvbn";

export default function SignUp({ isStaffRegistration = false }) {
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
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const errorRef = useRef(null);
  const [passwordScore, setPasswordScore] = useState(0);

  const navigate = useNavigate();
  const { showSuccess, showError } = useAlert();

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

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "password") {
      const result = zxcvbn(value);
      setPasswordScore(result.score);
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const togglePassword = () => setShowPassword(!showPassword);
  const toggleConfirmPassword = () =>
    setShowConfirmPassword(!showConfirmPassword);

  const scrollToError = () => {
    if (errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const emailRegex = /@apu.edu.my$|@mail.apu.edu.my$/;
    if (!emailRegex.test(formData.email)) {
      const msg = "Email must be @apu.edu.my or @mail.apu.edu.my";
      setError(msg);
      showError(msg);
      setLoading(false);
      scrollToError();
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      const msg = "Passwords do not match";
      setError(msg);
      showError(msg);
      setLoading(false);
      scrollToError();
      return;
    }

    try {
      if (currentUserRole === "admin" || isStaffRegistration) {
        const token = await auth.currentUser.getIdToken();

        // ✅ Build userData before API call
        const userData = {
          name: formData.name,
          gender: formData.gender,
          userRole: formData.userRole,
          email: formData.email,
        };

        // ✅ For restaurant staff, fetch restaurantId
        if (isStaffRegistration) {
          const q = query(
            collection(db, "restaurants"),
            where("userId", "==", auth.currentUser.uid)
          );
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const restaurantId = snapshot.docs[0].id;
            userData.restaurantId = restaurantId;
            userData.createdBy = auth.currentUser.uid;
          } else {
            showError("You must have an approved restaurant to create staff account. Please make sure your restaurant request is submitted and approved.");
            throw new Error("No restaurant found for this owner.");
          }
        }

        // ✅ Now send the API request with correct userData
        const response = await fetch("http://localhost:5000/api/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            userData: userData, // ← includes restaurantId and createdBy if applicable
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
          userRole: "",
          password: "",
          confirmPassword: "",
        });
      } else {
        // Normal customer sign up
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
      scrollToError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center">
      <div className="card shadow-lg p-4 my-4 col-lg-9 col-12">
        <h3 className="text-center mb-4">
          <i className="fa fa-user-plus"></i> Sign Up
        </h3>
        <form onSubmit={handleSubmit}>
          {error && (
            <div ref={errorRef} className="alert alert-danger">
              {error}
            </div>
          )}

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
              placeholder="Full name"
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
          {currentUserRole === "admin" || isStaffRegistration ? (
            <div className="mb-3">
              <label className="form-label">
                <i className="fa fa-users"></i> User Role
              </label>
              <select
                className="form-select"
                name="userRole"
                value={formData.userRole}
                onChange={handleChange}
                required
              >
                <option value="">Select User Role</option>
                {currentUserRole === "admin" && (
                  <>
                    <option value="customer">Customer</option>
                    <option value="restaurant-owner">Restaurant Owner</option>
                    <option value="admin">Admin</option>
                  </>
                )}
                {isStaffRegistration && (
                  <>
                    <option value="restaurant-staff">Restaurant Staff</option>
                    <option value="#" disabled>
                      Restaurant Manager
                    </option>
                    <option value="#" disabled>
                      Restaurant Accountant
                    </option>
                  </>
                )}
              </select>
            </div>
          ) : null}

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
                placeholder="Password"
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

          {/* Password Strength */}
          {formData.password && (
            <div className="mt-2">
              <div className="progress">
                <div
                  className={`progress-bar ${
                    passwordScore < 2
                      ? "bg-danger"
                      : passwordScore === 2
                      ? "bg-warning"
                      : passwordScore === 3
                      ? "bg-info"
                      : "bg-success"
                  }`}
                  role="progressbar"
                  style={{ width: `${(passwordScore + 1) * 20}%` }}
                  aria-valuenow={(passwordScore + 1) * 20}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
              <small className="form-text text-muted">
                Password Strength:{" "}
                {["Very Weak", "Weak", "Fair", "Good", "Strong"][passwordScore]}
              </small>
            </div>
          )}

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
                placeholder="Confirm password"
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

            {/* ✅ Password match status */}
            {formData.confirmPassword && (
              <small
                className={`form-text mt-1 ${
                  formData.password === formData.confirmPassword
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {formData.password === formData.confirmPassword
                  ?<>
                  <i class="fa-solid fa-circle-check"></i> Passwords match
                  </> 
                  : <>
                  <i class="fa-solid fa-circle-xmark"></i> Passwords do not match
                  </>
                  
                  }
              </small>
            )}
          </div>

          {/* Submit Button */}
          <div className="d-flex justify-content-center align-items-center send_bt">
            <button type="submit" disabled={loading}>
              {loading ? (
                <>
                  "Signing Up..."<i class="fa-solid fa-spinner fa-spin"></i>
                </>
              ) : (
                "Sign Up"
              )}
            </button>
          </div>

          {/* Already have an account */}
          {currentUserRole == null && (
            <div className="text-center mt-3">
              <span>Already have an account? </span>
              <NavLink to="/login" className="text-primary">
                Login
              </NavLink>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
