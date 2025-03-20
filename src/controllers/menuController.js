import { db, auth, storage } from "../models/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

// Reference to the 'menu' collection
const menuCollection = collection(db, "menu");

/**
 * ✅ Helper function to upload an image and return the download URL
 */
const uploadImage = async (imgFile) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const imgRef = ref(storage, `menus/${user.uid}/${Date.now()}_${imgFile.name}`);
  await uploadBytes(imgRef, imgFile);
  return getDownloadURL(imgRef);
};

/**
 * ✅ Adds a new item to a restaurant's menu.
 * Allows meal sizes (small, medium, large) but ensures only **one size per item**.
 */
export const addMenuItem = async (restaurantId, menuId, newItem) => {
  try {
    if (!restaurantId) {
      throw new Error("restaurantId is required to add a menu item.");
    }

    if (!newItem.selectedSize || !newItem.sizes[newItem.selectedSize]) {
      throw new Error("A valid meal size must be selected with a corresponding price.");
    }

    const menuRef = doc(db, "menu", menuId);
    const menuSnap = await getDoc(menuRef);

    // Upload image if provided
    let imageUrl = newItem.imgUrl;
    if (newItem.imageFile) {
      imageUrl = await uploadImage(newItem.imageFile);
    }

    const itemData = {
      itemId: newItem.itemId || uuidv4(),
      name: newItem.name,
      selectedSize: newItem.selectedSize, // ✅ Only one size is selected per meal
      price: parseFloat(newItem.sizes[newItem.selectedSize]), // ✅ Price is set dynamically from selected size
      availableQuantity: parseInt(newItem.availableQuantity, 10),
      description: newItem.description,
      availability: newItem.availability,
      sizes: newItem.sizes, // ✅ Store all size options with their prices
      imgUrl: imageUrl,
      estimatedPreparationTime: newItem.estimatedPreparationTime,
      category: newItem.category,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (menuSnap.exists()) {
      // ✅ Append the new item to the existing menu
      await updateDoc(menuRef, {
        items: arrayUnion(itemData),
        updatedAt: serverTimestamp(),
      });
    } else {
      // ✅ Create a new menu document
      await setDoc(menuRef, {
        menuId,
        restaurantId,
        menuName: newItem.menuName || "Default Menu",
        items: [itemData],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { success: true, message: "Item added successfully!" };
  } catch (error) {
    console.error("Error adding menu item:", error);
    return { success: false, message: error.message };
  }
};


/**
 * ✅ Edits an existing menu item by updating specific fields, including image if changed.
 */
export const editMenuItem = async (menuId, itemId, updates) => {
  try {
    const menuRef = doc(db, "menu", menuId);
    const menuSnap = await getDoc(menuRef);

    if (!menuSnap.exists()) {
      throw new Error("Menu not found.");
    }

    // ✅ Upload new image if provided
    let imageUrl = updates.imgUrl;
    if (updates.imageFile) {
      imageUrl = await uploadImage(updates.imageFile);
    }

    const menuData = menuSnap.data();
    const updatedItems = menuData.items.map((item) =>
      item.itemId === itemId ? { ...item, ...updates, imgUrl: imageUrl, updatedAt: serverTimestamp() } : item
    );

    await updateDoc(menuRef, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: "Menu item updated successfully!" };
  } catch (error) {
    console.error("Error updating menu item:", error);
    return { success: false, message: error.message };
  }
};

/**
 * ✅ Deletes a menu item from the menu.
 * If all items are removed, the entire menu document is deleted.
 */
export const deleteMenuItem = async (restaurantId, itemId) => {
  try {
    const menuRef = doc(db, "menu", restaurantId);
    const menuSnap = await getDoc(menuRef);

    if (!menuSnap.exists()) {
      throw new Error("Menu document does not exist");
    }

    let menuData = menuSnap.data();
    let items = menuData.items || [];

    const itemToDelete = items.find((item) => item.itemId === itemId);

    if (!itemToDelete) {
      throw new Error("Menu item not found");
    }

    // Delete image from Firebase Storage if it exists
    if (itemToDelete.imgUrl) {
      const imageRef = ref(storage, itemToDelete.imgUrl);
      await deleteObject(imageRef).catch((error) => {
        console.error("Error deleting image:", error);
      });
    }

    // Remove the item from the menu
    const updatedItems = items.filter((item) => item.itemId !== itemId);

    await updateDoc(menuRef, { items: updatedItems });

    return { success: true };
  } catch (error) {
    console.error("Error deleting menu item:", error);
    throw error;
  }
};

/**
 * ✅ Fetches all menu items for a specific restaurant.
 * Optimized to use Firestore query instead of filtering manually.
 */
export const getMenu = async (restaurantId) => {
  try {
    if (!restaurantId) {
      throw new Error("restaurantId is required to fetch the menu.");
    }

    const q = query(menuCollection, where("restaurantId", "==", restaurantId));
    const querySnapshot = await getDocs(q);

    const restaurantMenus = querySnapshot.docs.map((doc) => doc.data());

    return { success: true, data: restaurantMenus };
  } catch (error) {
    console.error("Error fetching menu:", error);
    return { success: false, message: error.message };
  }
};
