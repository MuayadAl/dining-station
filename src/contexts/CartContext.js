import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
} from "../controllers/cartController";

import { addToCart as addToCartController } from "../controllers/cartController";


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

  const addToCart = async (item) => {
    try {
      await addToCartController(item);      // ✅ let controller handle logic + Firestore write
      const updated = await getCart();      // ✅ get the new cart state
      setCartItems(updated);
    } catch (error) {
      console.error("Failed to add item to cart (context):", error);
    }
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
