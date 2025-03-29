import { db, auth } from "../models/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// Function to get the user's cart from Firestore
export const getCart = async () => {
  if (!auth.currentUser) return [];

  try {
      const cartRef = doc(db, "carts", auth.currentUser.uid);
      const cartSnap = await getDoc(cartRef);

      if (!cartSnap.exists()) return [];

      const items = cartSnap.data().items || [];

      const processedItems = items.map((item) => ({
          ...item,
          price: item.price !== undefined 
              ? parseFloat(item.price) 
              : (item.sizes && item.sizes.length > 0 
                  ? parseFloat(item.sizes[0].price) 
                  : 0) // Ensure valid price
      }));

      console.log("Fetched cart from Firestore:", processedItems); // Debugging log

      return processedItems;
  } catch (error) {
      console.error("Error fetching cart:", error);
      return [];
  }
};

  

// Function to add an item to the cart
export const addToCart = async (item) => {
  if (!auth.currentUser) throw new Error("User not logged in");

  try {
    const cartRef = doc(db, "carts", auth.currentUser.uid);
    const cartSnap = await getDoc(cartRef);

    let cartItems = cartSnap.exists() ? cartSnap.data().items || [] : [];

    const existingItemIndex = cartItems.findIndex((i) => i.itemId === item.itemId);
    if (existingItemIndex !== -1) {
      cartItems[existingItemIndex].quantity = (cartItems[existingItemIndex].quantity || 0) + 1;
    } else {
      cartItems.push({ ...item, quantity: 1 });
    }

    await setDoc(cartRef, { items: cartItems });

    return cartItems;
  } catch (error) {
    console.error("Error adding to cart:", error);
    throw error;
  }
};



// Function to remove an item from the cart
export const removeFromCart = async (itemId) => {
  if (!auth.currentUser) return;

  try {
    const cartRef = doc(db, "carts", auth.currentUser.uid);
    const cartSnap = await getDoc(cartRef);

    if (!cartSnap.exists()) return;

    let cartItems = cartSnap.data().items || [];
    cartItems = cartItems.filter((item) => item.itemId !== itemId);

    await updateDoc(cartRef, { items: cartItems });

    return cartItems;
  } catch (error) {
    console.error("Error removing item from cart:", error);
  }
};

// Function to update the quantity of an item
export const updateCartQuantity = async (itemId, newQuantity) => {
  if (!auth.currentUser) return [];

  try {
      const cartRef = doc(db, "carts", auth.currentUser.uid);
      const cartSnap = await getDoc(cartRef);

      if (!cartSnap.exists()) return [];

      let cartData = cartSnap.data().items || [];

      cartData = cartData.map((item) => {
          if (item.itemId === itemId) {
              return {
                  ...item,
                  quantity: newQuantity,
                  price: item.price !== undefined 
                      ? parseFloat(item.price) 
                      : (item.sizes && item.sizes.length > 0 
                          ? parseFloat(item.sizes[0].price) 
                          : 0) // Ensure valid price
              };
          }
          return item;
      });

      // Update Firestore
      await updateDoc(cartRef, { items: cartData });

      console.log("Updated cart in Firestore:", cartData); // Debugging log

      return cartData;
  } catch (error) {
      console.error("Error updating cart quantity:", error);
      return [];
  }
};

  

// Function to clear the cart
export const clearCart = async () => {
  if (!auth.currentUser) return [];

  try {
    const cartRef = doc(db, "carts", auth.currentUser.uid);
    await setDoc(cartRef, { items: [] });
    return []; 
  } catch (error) {
    console.error("Error clearing cart:", error);
    throw error;
  }
};

