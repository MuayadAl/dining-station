import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
} from "../controllers/cartController";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const backendCart = await getCart();
        setCartItems(backendCart);
      } catch (error) {
        console.error("Failed to fetch cart:", error);
        setCartItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  const updateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return;
    await updateCartQuantity(itemId, quantity);
    const updated = await getCart();
    setCartItems(updated);
  };

  const removeItem = async (itemId) => {
    const updated = await removeFromCart(itemId);
    setCartItems(updated);
  };

  const clear = async () => {
    await clearCart();
    setCartItems([]);
  };

  const refreshCart = async () => {
    const updated = await getCart();
    setCartItems(updated);
  };

  const addToCart = async (newItem) => {
    // Add logic to handle new item in your backend (optional)
    const currentCart = await getCart();
    const existingIndex = currentCart.findIndex(
      (item) => item.itemId === newItem.itemId
    );

    if (existingIndex !== -1) {
      await updateCartQuantity(
        newItem.itemId,
        currentCart[existingIndex].quantity + 1
      );
    } else {
      // Your backend should support adding new item to cart
      currentCart.push({ ...newItem, quantity: 1 });
      // You can create a backend method like `setCart(currentCart)` if needed
    }

    const updated = await getCart();
    setCartItems(updated);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        setCartItems,
        updateQuantity,
        removeItem,
        clear,
        refreshCart,
        addToCart,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
