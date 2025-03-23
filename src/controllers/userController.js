import { db, auth } from '../models/firebase';
import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth'; 


// Function to store user details in Firestore
export const storeUserDetails = async (userData, uid) => {
  try {
    const userRef = doc(db, "users", uid); 
    await setDoc(userRef, {
      uid, 
      name: userData.name,
      email: userData.email,
      gender: userData.gender,
      userRole: userData.userRole,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error adding user details to Firestore: ", error);
    throw error;
  }
};



  export const updateUserName = async (userId, newName) => {
    try {
      const userRef = doc(db, 'users', userId);
  
      await updateDoc(userRef, {
        name: newName,
      });
  
      return 'User name updated successfully'; 
    } catch (error) {
      console.error('Error updating user name:', error);
      throw new Error('Error updating user name');
    }
  };

  // Function to delete user details from Firestore and Firebase Authentication
export const deleteUserAccount = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef); 

    const user = auth.currentUser;
    if (user && user.uid === uid) {
      await deleteUser(user); 
    }

    return 'User account deleted successfully'; 
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw new Error('Error deleting user account');
  }
};

export const getUserDetails = async (userId) => {
  if (!userId) return null; 

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data(); 
    } else {
      console.warn("⚠ No user found in Firestore.");
      return null;
    }
  } catch (error) {
    console.error("❌ Error fetching user details:", error);
    return null;
  }
};