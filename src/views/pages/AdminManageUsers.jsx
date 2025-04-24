import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
  orderBy,
  startAfter,
  getDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "../../models/firebase";
import useAlert from "../../hooks/userAlert";
import { getIdToken } from "firebase/auth";

const AdminManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [restaurantId, setRestaurantId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const { confirmAction, showSuccess, showError } = useAlert();


  const BATCH_SIZE = 20;
  const searchRef = useRef("");


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) return showError("User not found.");
  
        const userData = userDoc.data();
        if (userData.userRole === "admin") {
          setRestaurantId("ALL_ADMINS_CAN_VIEW");
          return;
        }
  
        const restaurantQuery = query(
          collection(db, "restaurants"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(restaurantQuery);
        if (!querySnapshot.empty) {
          const restaurantDoc = querySnapshot.docs[0];
          setRestaurantId(restaurantDoc.data().restaurantId);
        } else {
          showError("You are not authorized to view this page.");
        }
      }
    });
  
    return () => unsubscribe();
  }, []);
  
  // Get current user and their restaurantId
  useEffect(() => {
    const fetchCurrentUserRestaurantId = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
    
      setCurrentUserId(currentUser.uid);
    
      try {
        // Get the user document to check their role
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
    
        if (!userDoc.exists()) {
          showError("User not found.");
          return;
        }
    
        const userData = userDoc.data();
    
        if (userData.userRole === "admin") {
          // Admin can view all users (or filtered by your logic)
          setRestaurantId("ALL_ADMINS_CAN_VIEW");
          return;
        }
    
        // If not admin, check for restaurant ownership
        const restaurantQuery = query(
          collection(db, "restaurants"),
          where("userId", "==", currentUser.uid)
        );
    
        const querySnapshot = await getDocs(restaurantQuery);
    
        if (!querySnapshot.empty) {
          const restaurantDoc = querySnapshot.docs[0];
          setRestaurantId(restaurantDoc.data().restaurantId);
        } else {
          showError("You are not authorized to view this page.");
        }
      } catch (error) {
        console.error("Failed to fetch user or restaurant document:", error);
      }
    };
    
    fetchCurrentUserRestaurantId();
  }, []);

  // Fetch users with optional search
  const fetchUsers = async (isNewSearch = false) => {
    if (!restaurantId) return;
  
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      let q;
  
      const constraints = [];
  
      // Admin sees all users, others see restaurant-staff only
      if (restaurantId !== "ALL_ADMINS_CAN_VIEW") {
        constraints.push(where("userRole", "==", "restaurant-staff"));
        constraints.push(where("restaurantId", "==", restaurantId));
      }
  
      // Firestore search for admin
      if (restaurantId === "ALL_ADMINS_CAN_VIEW" && search.trim()) {
        const searchTerm = search.trim();
        constraints.push(where("email", ">=", searchTerm));
        constraints.push(where("email", "<=", searchTerm + "\uf8ff"));
        constraints.push(orderBy("email")); 
      } 

  
      if (!isNewSearch && lastVisible) {
        constraints.push(startAfter(lastVisible));
      }
  
      constraints.push(limit(BATCH_SIZE));
  
      q = query(usersRef, ...constraints);
  
      const snapshot = await getDocs(q);
      const fetchedUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      // For non-admins or fallback, client-side filter
      let filteredUsers = fetchedUsers;
      if (restaurantId !== "ALL_ADMINS_CAN_VIEW" && search.trim()) {
        const s = search.trim().toLowerCase();
        filteredUsers = fetchedUsers.filter(
          (u) =>
            u.name?.toLowerCase().includes(s) ||
            u.email?.toLowerCase().includes(s)
        );
      }
  
      if (isNewSearch) {
        setUsers(filteredUsers);
      } else {
        setUsers((prev) => [...prev, ...filteredUsers]);
      }
  
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  };
  
  
  
  

  // Initial fetch when restaurantId becomes available
  useEffect(() => {
    if (restaurantId) {
      fetchUsers(true);
    }
  }, [restaurantId]);

  // Handle search updates (debounced)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchRef.current !== search) {
        searchRef.current = search;
        setLastVisible(null);
        fetchUsers(true);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  // Delete user handler
  const handleDelete = async (uid) => {
    const confirmed = await confirmAction(
      "Confirm Delete User",
      "Are you sure you want to delete this user?",
      `Yes, delete user`
    );
    if (!confirmed) return;

    try {
      const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? process.env.REACT_APP_LOCAL_API
    : process.env.REACT_APP_API_BASE_URL;

      const currentUser = auth.currentUser;
    
      if (!currentUser) {
        showError("User not authenticated.");
        return;
      }
    
      const token = await currentUser.getIdToken();
    
      const res = await fetch(`${API_BASE_URL}/api/admin/deleteUser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ Add the token here
        },
        body: JSON.stringify({ uid }),
      });
    
      const data = await res.json();
    
      if (!res.ok) {
        console.error("Server error:", data);
        throw new Error(data.error || "Failed to delete user.");
      }
    
      showSuccess("User deleted successfully.");
      setLastVisible(null);
      fetchUsers(true);
    } catch (error) {
      console.error("Error deleting user:", error);
      showError("Error deleting user.");
    }
  };

  return (
    <div className="d-flex container justify-content-center align-items-center">
      <div className="w-100 my-2">
        <h1 className="text-center">Users Management</h1>
        <div className="row my-4 shadow p-3 bg-body rounded-3 hover_effect g-2">
          <input
            type="text"
            placeholder="Search by email..."
            className="mb-4 p-2 border rounded w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <p className="text-center">
              <i className="fa-solid fa-spinner"></i> Loading users...
            </p>
          ) : (
            <div className="table-responsive">

            <table className="w-100 table-auto border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">ID</th>
                  <th className="p-2 border">Name</th>
                  <th className="p-2 border">Email</th>
                  <th className="p-2 border">Gender</th>
                  <th className="p-2 border">Role</th>
                  <th className="p-2 border">Created At</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid || user.id}>
                    <td className="p-2 border">{user.id}</td>
                    <td className="p-2 border">{user.name}</td>
                    <td className="p-2 border">{user.email}</td>
                    <td className="p-2 border">{user.gender}</td>
                    <td className="p-2 border">{user.userRole}</td>
                    <td className="p-2 border">
                    {new Date(
                        user.createdAt?.seconds
                          ? user.createdAt.seconds * 1000
                          : user.createdAt
                      ).toLocaleString("en-MY")}
                    </td>
                    <td className="p-2 border">
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(user.uid || user.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center p-4">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}

          {/* Load more */}
          {!loading && users.length >= BATCH_SIZE && lastVisible && (
  <div className="text-center mt-3">
    <button className="btn btn-primary" onClick={() => fetchUsers(false)}>
      Load More
    </button>
  </div>
)}

        </div>
      </div>
    </div>
  );
};

export default AdminManageUsers;
