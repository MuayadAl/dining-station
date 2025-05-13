import { db, auth, storage } from "../models/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Reference to the 'restaurants' collection
const restaurantCollection = collection(db, "restaurants");

// Helper function to upload an image and get the download URL
const uploadImage = async (imgFile) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const imgRef = ref(
    storage,
    `restaurants/${user.uid}/${Date.now()}_${imgFile.name}`
  );
  await uploadBytes(imgRef, imgFile);
  return getDownloadURL(imgRef);
};

// Function to add a new restaurant
export const addRestaurant = async ({
  name,
  email,
  phone,
  location,
  description,
  imgFile,
  openingHours,
  menuIds = [],
  remark = "",
}) => {
  // Check if the user is authenticated
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  // Validate required fields
  if (!name || !email || !phone || !location || !openingHours) {
    throw new Error(
      "Missing required fields: name, email, phone, location, or openingHours"
    );
  }

  let imgUrl = "";
  // If an image file is provided, upload it and get the URL
  if (imgFile) {
    try {
      imgUrl = await uploadImage(imgFile);
    } catch (error) {
      throw new Error("Error uploading image: " + error.message);
    }
  }

  // Prepare restaurant data without the restaurantId
  const restaurantData = {
    userId: user.uid,
    menuIds,
    name,
    email,
    phone,
    location,
    imgUrl,
    status: null,
    openingHours,
    approvalStatus: "pending", // default approval status until the admin approve it or reject it.
    remark,
    description,
    createdAt: serverTimestamp(),
  };

  try {
    // Add the restaurant document to Firestore (without restaurantId)
    const docRef = await addDoc(restaurantCollection, restaurantData);

    // Update the document to include the restaurantId (same as doc ID)
    await updateDoc(doc(db, "restaurants", docRef.id), {
      restaurantId: docRef.id,
    });

    return docRef.id; // Return the ID of the new restaurant document
  } catch (error) {
    throw new Error("Error adding restaurant to Firestore: " + error.message);
  }
};

// Function to edit an existing restaurant
// Function to edit an existing restaurant
export const editRestaurant = async (
  restaurantId,
  {
    name,
    email,
    phone,
    location,
    description,
    imgFile,
    openingHours,
  }
) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const restaurantRef = doc(db, "restaurants", restaurantId);
  const restaurantDoc = await getDoc(restaurantRef);

  if (!restaurantDoc.exists()) {
    throw new Error("Restaurant not found");
  }

  // Ensure the user is the owner of the restaurant
  if (restaurantDoc.data().userId !== user.uid) {
    throw new Error("Unauthorized: You can only edit your own restaurant");
  }

  let imgUrl = restaurantDoc.data().imgUrl; // Keep existing image URL
  if (imgFile) {
    try {
      imgUrl = await uploadImage(imgFile);
    } catch (error) {
      throw new Error("Error uploading new image: " + error.message);
    }
  }

  try {
    await updateDoc(restaurantRef, {
      name,
      email,
      phone,
      location,
      description,
      imgUrl,
      openingHours, 
      updatedAt: serverTimestamp(),
    });
    return "Restaurant updated successfully";
  } catch (error) {
    throw new Error("Error updating restaurant: " + error.message);
  }
};
