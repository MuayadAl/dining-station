import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { clearCart } from "../../controllers/cartController"; // Import clearCart function
 

const Success = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const clearUserCart = async () => {
      try {
        await clearCart();
      } catch (error) {
        console.error("Error clearing cart:", error);
      }
    };

    clearUserCart(); 
  }, []); 

  return (
    <div className="container text-center mb-5 justify-content-center align-items-center">
      <h2>Payment Successful!</h2>
      <p>Thank you for your purchase.</p>
      <Button variant="primary" onClick={() => navigate("/")}>
        Go to Home
      </Button>
    </div>
  );
};

export default Success;
