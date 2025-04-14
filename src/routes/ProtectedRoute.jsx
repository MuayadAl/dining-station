import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; 

const ProtectedRoute = ({ element: Component, allowedRoles }) => {
  const { currentUser } = useAuth(); 

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(currentUser.userRole))
    return <Navigate to="/403" replace />;
  

  return Component;
};

export default ProtectedRoute;
