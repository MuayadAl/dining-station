import { db, auth } from "../models/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// Helper to generate a unique cart item key (itemId + selectedSize)
const getCartItemKey = (item) => `${item.itemId}_${item.selectedSize || ""}`;

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
          : 0),
    }));

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

    const itemKey = getCartItemKey(item);

    const existingItemIndex = cartItems.findIndex(
      (i) => getCartItemKey(i) === itemKey
    );

    if (existingItemIndex !== -1) {
      cartItems[existingItemIndex].quantity += 1;
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
export const removeFromCart = async (itemId, selectedSize) => {
  if (!auth.currentUser) return;

  try {
    const cartRef = doc(db, "carts", auth.currentUser.uid);
    const cartSnap = await getDoc(cartRef);

    if (!cartSnap.exists()) return;

    let cartItems = cartSnap.data().items || [];
    cartItems = cartItems.filter(
      (item) =>
        !(
          item.itemId === itemId &&
          (item.selectedSize || "") === (selectedSize || "")
        )
    );

    await updateDoc(cartRef, { items: cartItems });

    return cartItems;
  } catch (error) {
    console.error("Error removing item from cart:", error);
  }
};

// Function to update the quantity of an item
export const updateCartQuantity = async (itemId, selectedSize, newQuantity) => {
  if (!auth.currentUser) return [];

  try {
    const cartRef = doc(db, "carts", auth.currentUser.uid);
    const cartSnap = await getDoc(cartRef);

    if (!cartSnap.exists()) return [];

    let cartData = cartSnap.data().items || [];

    cartData = cartData.map((item) => {
      if (
        item.itemId === itemId &&
        (item.selectedSize || "") === (selectedSize || "")
      ) {
        return {
          ...item,
          quantity: newQuantity,
          price: item.price !== undefined
            ? parseFloat(item.price)
            : (item.sizes && item.sizes.length > 0
              ? parseFloat(item.sizes[0].price)
              : 0),
        };
      }
      return item;
    });

    await updateDoc(cartRef, { items: cartData });

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
