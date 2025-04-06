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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../models/firebase";

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const { showSuccess, showError } = useAlert();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCart = async () => {
      const cartData = await getCart();
      setCartItems(cartData);
    };

    fetchCart();
  }, []);

  const handleRemoveItem = async (itemId, selectedSize) => {
    const updatedCart = await removeFromCart(itemId, selectedSize); // pass size
    setCartItems(updatedCart);
    showSuccess("Item removed from cart!");
  };

  const handleQuantityChange = async (itemId, selectedSize, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      const restaurantId = localStorage.getItem("restaurantId");
      if (!restaurantId) {
        showError("Restaurant not found.");
        return;
      }

      const menuRef = doc(db, "menu", restaurantId);
      const menuSnap = await getDoc(menuRef);

      if (!menuSnap.exists()) {
        showError("Menu not found.");
        return;
      }

      const menuData = menuSnap.data();
      const allItems = menuData.items || [];

      const menuItem = allItems.find((item) => item.itemId === itemId);
      if (!menuItem) {
        showError("Item no longer exists.");
        return;
      }

      const availableQty =
        typeof menuItem.availableQuantity === "number"
          ? menuItem.availableQuantity
          : 0;

      if (newQuantity > availableQty) {
        showError(`Only ${availableQty} ${menuItem.name} in stock.`);
        return;
      }

      await updateCartQuantity(itemId, selectedSize, newQuantity); // pass size
      const updatedCart = await getCart();
      setCartItems(updatedCart);
    } catch (error) {
      console.error("Error updating quantity:", error);
      showError("Failed to update item quantity.");
    }
  };

  const handleClearCart = async () => {
    await clearCart();
    setCartItems([]);
    showSuccess("Cart cleared successfully!");
  };

  const handleCheckout = () => {
    const storedRestaurantId = localStorage.getItem("restaurantId");
    if (!storedRestaurantId) {
      showError(
        "Error: No restaurant selected. Please select a restaurant first."
      );
      return;
    }

    navigate(`/checkout/${storedRestaurantId}`);
  };

  return (
    <div className="container">
      <h2 className="text-center">Your Cart</h2>
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
                {cartItems.map((item, index) => (
                  <tr key={`${item.itemId}_${item.selectedSize || index}`}>
                    <td>
                      {item.name}
                      <br />
                      {item.selectedSize && (
                        <span className="text-muted">
                          Size: {item.selectedSize}
                        </span>
                      )}
                    </td>
                    <td>RM{parseFloat(item.selectedPrice).toFixed(2)}</td>{" "}
                    <td>
                      <Button
                        variant=""
                        size="sm"
                        onClick={() =>
                          handleQuantityChange(
                            item.itemId,
                            item.selectedSize,
                            item.quantity - 1
                          )
                        }
                      >
                        <i className="fa-solid fa-minus"></i>
                      </Button>
                      <span className="mx-2">{item.quantity}</span>
                      <Button
                        variant=""
                        size="sm"
                        onClick={() =>
                          handleQuantityChange(
                            item.itemId,
                            item.selectedSize,
                            item.quantity + 1
                          )
                        }
                      >
                        <i className="fa-solid fa-plus"></i>
                      </Button>
                    </td>
                    <td>
                      RM
                      {(item.quantity * parseFloat(item.selectedPrice)).toFixed(
                        2
                      )}
                    </td>
                    <td>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          handleRemoveItem(item.itemId, item.selectedSize)
                        }
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
