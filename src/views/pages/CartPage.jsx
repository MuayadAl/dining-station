import React, { useEffect, useState } from "react";
import {
  getCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
} from "../../controllers/cartController";
import { useNavigate } from "react-router-dom";
import { Button, Table } from "react-bootstrap";
import useAlert from "../../hooks/userAlert";

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const { showSuccess, showError } = useAlert();
  const navigate = useNavigate();
  const storedRestaurantId = localStorage.getItem("restaurantId");


  useEffect(() => {
    const fetchCart = async () => {
      const cartData = await getCart();
  
      console.log("Fetched Cart Data:", cartData); // Debugging
  
      setCartItems(cartData.map(item => ({
        ...item,
        price: parseFloat(item.price) || 0  // Ensure price is always a number
      })));
    };
    fetchCart();
  }, []);
  

  const handleRemoveItem = async (itemId) => {
    const updatedCart = await removeFromCart(itemId);
    setCartItems(updatedCart);
    showSuccess("Item removed from cart!");
  };

  const handleQuantityChange = async (itemId, quantity) => {
    if (quantity < 1) return;

    const updatedCart = await updateCartQuantity(itemId, quantity);

    console.log("Updated Cart from API:", updatedCart); // Debugging

    setCartItems(updatedCart.map(item => ({
        ...item,
        price: parseFloat(item.price) || 0 // Ensure price is never NaN
    })));
};

  

  const handleClearCart = async () => {
    await clearCart();
    setCartItems([]);
    showSuccess("Cart cleared successfully!");
  };

  const handleCheckout = () => {
    const storedRestaurantId = localStorage.getItem("restaurantId");
    if (!storedRestaurantId) {
      console.error("❌ No restaurantId found. Ensure restaurant is selected.");
      showError("Error: No restaurant selected. Please select a restaurant first.");
      return;
    }
  
    navigate(`/checkout/${storedRestaurantId}`); // ✅ Pass restaurantId in the URL
  };
  
  

  return (
    <div className="container ">
      <h2 className=" text-center">Your Cart</h2>
      <div className="card shadow p-4 w-100 my-3">
        {cartItems.length === 0 ? (
          <p className="text-center text-muted">Your cart is empty.</p>
        ) : (
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="bg-dark text-white">
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item) => (
                  <tr key={item.itemId}>
                    <td>{item.name}</td>
                    <td>RM{(item.quantity * (parseFloat(item.price))).toFixed(2)}</td>

                    <td>
                      <Button
                        variant=""
                        size="sm"
                        onClick={() =>
                          handleQuantityChange(item.itemId, item.quantity - 1)
                        }
                      >
                        <i class="fa-solid fa-minus"></i>
                      </Button>
                      <span className="mx-2 float-none">{item.quantity}</span>
                      <Button
                        variant=" "
                        size="sm" 
                        onClick={() =>
                          handleQuantityChange(item.itemId, item.quantity + 1)
                        }
                      >
                        <i class="fa-solid fa-plus"></i>
                      </Button>
                    </td>
                    <td>
                      RM{(item.quantity * parseFloat(item.price)).toFixed(2)}
                    </td>
                    <td>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveItem(item.itemId)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {cartItems.length > 0 && (
          <div className="d-flex justify-content-between mt-3">
            <Button variant="outline-danger" onClick={handleClearCart}>
              Clear Cart
            </Button>
            <Button variant="success" onClick={handleCheckout}>
              Proceed to Checkout
              
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
