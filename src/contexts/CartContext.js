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
  const [cartRestaurantId, setCartRestaurantId] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const backendCart = await getCart();
        setCartItems(backendCart);
        if (backendCart.length > 0) {
          setCartRestaurantId(backendCart[0].restaurantId);
        } else {
          setCartRestaurantId(null);
        }
      } catch (error) {
        console.error("Failed to fetch cart:", error);
        setCartItems([]);
        setCartRestaurantId(null);
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
    setCartRestaurantId(null);  
  };
  

  const refreshCart = async () => {
    const updated = await getCart();
    setCartItems(updated);
  };

  const addToCart = async (item) => {
    try {
      await addToCartController(item); // item must contain selectedSize & selectedPrice
      const updated = await getCart();
      setCartItems(updated);
      setCartRestaurantId(item.restaurantId);
    } catch (error) {
      console.error("Failed to add item to cart (context):", error);
    }
  };
  

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartRestaurantId,
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
