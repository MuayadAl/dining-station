import React, { useEffect, useState, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { storage } from "../../models/firebase";
import { useParams } from "react-router-dom";
import { db } from "../../models/firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { auth } from "../../models/firebase";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Button, Form } from "react-bootstrap";

import useAlert from "../../hooks/userAlert";

import { addToCart } from "../../controllers/cartController";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDoorOpen, faDoorClosed } from "@fortawesome/free-solid-svg-icons";

import { deleteMenuItem } from "../../controllers/menuController";

import { useCart } from "../../contexts/CartContext";

import imagePlaceHolder from "../../assets/image-placeholder.jpg";
import foodPlaceHolder from "../../assets/food-placeHolder.png";
import CardSkeletonFallback from "../components/CardSkeletonFallback";


const MenuPage = () => {
  const { restaurantId } = useParams();
  const [restaurantImgUrl, setRestaurantImgUrl] = useState(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [openingHours, setOpeningHours] = useState({});
  const [restaurantStatus, setRestaurantStatus] =
    useState("Checking status...");
  const modalImgRef = useRef();

  const { confirmAction, showSuccess, showError } = useAlert();
  const { cartItems, addToCart } = useCart(); // ✅ match context
  const cartIconRef = useRef();
  const navigate = useNavigate();
  const itemImageRefs = useRef({});

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const categoryRefs = useRef({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  // Adding button
  const [addingItemId, setAddingItemId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const [isOwner, setIsOwner] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  const [selectedImageFile, setSelectedImageFile] = useState(null);

  const [showCartConflictModal, setShowCartConflictModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const { cartRestaurantId, clear } = useCart();

  const [showLogoModal, setShowLogoModal] = useState(false);

  const { refreshCart } = useCart();
  const [userRole, setUserRole] = useState(null);
  const [logoLoading, setLogoLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  

  useEffect(() => {
    if (!restaurantId || isOwner === null) return;

    let isMounted = true;

    const fetchMenu = async () => {
      try {
        const q = query(
          collection(db, "menu"),
          where("restaurantId", "==", restaurantId)
        );
        const querySnapshot = await getDocs(q);

        if (!isMounted) return;

        let fetchedItems = [];
        let fetchedCategories = new Set();

        querySnapshot.forEach((doc) => {
          const items = doc.data().items || [];
          const availableItems = isOwner
            ? items.map((item) => ({
                ...item,
                availability: item.availability ?? false,
              }))
            : items.filter((item) => item?.availability === true);

          fetchedItems = [...fetchedItems, ...availableItems];
          availableItems.forEach((item) =>
            fetchedCategories.add(item.category)
          );
        });

        setMenuItems(fetchedItems);
        setCategories(Array.from(fetchedCategories));
      } catch (error) {
        if (isMounted) console.error("Error fetching menu:", error);
      } finally {
        if (isMounted) setLoading(false);
        setInitialLoading(false);
      }
    };

    fetchMenu();

    return () => {
      isMounted = false;
    };
  }, [restaurantId, isOwner]);

  useEffect(() => {
    import("./CartPage"); // preload CartPage after Menu
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshCart();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshCart]);

  const animateToCart = (imgElement) => {
    const cartIcon = cartIconRef.current;
    if (
      !imgElement ||
      !cartIcon ||
      !imgElement.complete ||
      imgElement.naturalHeight === 0
    )
      return;

    const imgRect = imgElement.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();

    const imgTop = imgRect.top + window.scrollY;
    const imgLeft = imgRect.left + window.scrollX;
    const cartTop = cartRect.top + window.scrollY;
    const cartLeft = cartRect.left + window.scrollX;

    const flyingImg = document.createElement("img");
    flyingImg.src = imgElement.src;
    flyingImg.style.position = "absolute";
    flyingImg.style.top = imgTop + "px";
    flyingImg.style.left = imgLeft + "px";
    flyingImg.style.width = "40px";
    flyingImg.style.height = "40px";
    flyingImg.style.borderRadius = "50%";
    flyingImg.style.objectFit = "cover";
    flyingImg.style.zIndex = "9999";
    flyingImg.style.transition = "all 0.8s ease-in-out";
    flyingImg.style.pointerEvents = "none";
    flyingImg.style.aspectRatio = "1 / 1";
    flyingImg.style.overflow = "hidden";

    document.body.appendChild(flyingImg);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flyingImg.style.top = cartTop + "px";
        flyingImg.style.left = cartLeft + "px";
        flyingImg.style.opacity = "0.3";
      });
    });

    setTimeout(() => {
      if (flyingImg?.parentNode) {
        flyingImg.parentNode.removeChild(flyingImg);
      }
    }, 900);
  };

  const handleAddToCart = async (item, e = null, manualImgElement = null) => {
    const defaultSize = item.sizes?.[0];
    setAddingItemId(item.itemId);

    try {
      const restaurantRef = doc(db, "restaurants", restaurantId);
      const restaurantSnap = await getDoc(restaurantRef);

      if (!restaurantSnap.exists()) {
        showError("Restaurant not found.");
        navigate("/restaurants");
        return;
      }

      const restaurantData = restaurantSnap.data();
      const currentStatus = getRestaurantStatus(
        restaurantData.openingHours,
        restaurantData.status
      );

      if (currentStatus.toLowerCase() !== "open") {
        showError("This restaurant is currently closed. Redirecting...");
        navigate("/restaurants");
        return;
      }

      const existingCartItem = cartItems.find(
        (ci) =>
          ci.itemId === item.itemId && ci.selectedSize === defaultSize?.size
      );

      const availableQty =
        typeof item.availableQuantity === "number" ? item.availableQuantity : 0;
      const currentQuantityInCart = existingCartItem?.quantity || 0;

      if (availableQty <= 0) {
        showError(`${item.name} is currently out of stock.`);
        return;
      }

      if (currentQuantityInCart + 1 > availableQty) {
        showError(
          `Only ${availableQty} of ${item.name} available. You've reached the limit.`
        );
        return;
      }

      if (!defaultSize || !defaultSize.size || defaultSize.price == null) {
        showError("This item does not have a valid default size or price.");
        return;
      }

      const itemWithSize = {
        ...item,
        restaurantId, // important for tracking cart source
        selectedSize: defaultSize.size,
        selectedPrice: defaultSize.price,
      };

      // 🧠 Check for conflict
      if (
        cartItems.length > 0 &&
        cartRestaurantId &&
        cartRestaurantId !== restaurantId
      ) {
        setPendingItem(itemWithSize); // Save it temporarily
        setShowCartConflictModal(true); // Show conflict modal
        return;
      }

      if (restaurantId && !isOwner) {
        localStorage.setItem("restaurantId", restaurantId);
      }

      await addToCart(itemWithSize);

      setTimeout(() => {
        const img = manualImgElement || itemImageRefs.current[item.itemId];
        if (img) animateToCart(img);
      }, 0);

      if (manualImgElement) {
        setTimeout(() => {
          setShowViewModal(false);
        }, 800);
      }
    } catch (error) {
      console.error("Caught error in handleAddToCart:", error);
      showError("Failed to add item to cart.");
    } finally {
      setAddingItemId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      try {
        const user = auth.currentUser;
        if (!user || !restaurantId) return;

        // 🔹 1. Fetch user role
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && isMounted) {
          const data = userDoc.data();
          setUserRole(data.userRole || "guest"); // fallback
        }

        // 🔹 2. Fetch restaurant info
        const restaurantRef = doc(db, "restaurants", restaurantId);
        const restaurantSnap = await getDoc(restaurantRef);
        if (!restaurantSnap.exists() || !isMounted) return;

        const restaurantData = restaurantSnap.data();

        const ownerCheck = restaurantData.userId === user.uid;
        setIsOwner(ownerCheck);
        setRestaurantImgUrl(restaurantData.imgUrl || null);
        setRestaurantName(restaurantData.name || "");
        setOpeningHours(restaurantData.openingHours || {});

        const status = getRestaurantStatus(
          restaurantData.openingHours,
          restaurantData.status
        );
        setRestaurantStatus(status);

        // 🔹 3. Fetch Menu items
        const q = query(
          collection(db, "menu"),
          where("restaurantId", "==", restaurantId)
        );
        const querySnapshot = await getDocs(q);

        let fetchedItems = [];
        let fetchedCategories = new Set();

        querySnapshot.forEach((doc) => {
          const items = doc.data().items || [];
          const availableItems = ownerCheck
            ? items.map((item) => ({
                ...item,
                availability: item.availability ?? false,
              }))
            : items.filter((item) => item?.availability === true);

          fetchedItems = [...fetchedItems, ...availableItems];
          availableItems.forEach((item) =>
            fetchedCategories.add(item.category)
          );
        });

        if (isMounted) {
          setMenuItems(fetchedItems);
          setCategories(Array.from(fetchedCategories));
        }
      } catch (error) {
        console.error("Error loading user/restaurant/menu:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllData();

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategoryClick = (category) => {
  if (categoryRefs.current[category]) {
    const element = categoryRefs.current[category];
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - 80; 
    
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth"
    });
  }
};

  const filteredCategories = categories.filter((category) =>
    filteredItems.some((item) => item.category === category));

  
  const handleEditItem = (item) => {
    if (!isOwner) return; // Only owners can edit
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    setSelectedItem({ ...selectedItem, [e.target.name]: e.target.value });
  };

  const handleSaveChanges = async () => {
    setSaving(true); // ✅ Start spinner
    try {
      const menuRef = doc(db, "menu", restaurantId);
      let updatedImgUrl = selectedItem.imgUrl;

      if (selectedImageFile) {
        const user = auth.currentUser;
        const imgRef = ref(
          storage,
          `menus/${user.uid}/${Date.now()}_${selectedImageFile.name}`
        );
        await uploadBytes(imgRef, selectedImageFile);
        updatedImgUrl = await getDownloadURL(imgRef);
      }

      if (selectedItem?.availableQuantity !== undefined) {
        selectedItem.availableQuantity = Number(selectedItem.availableQuantity);
      }

      if (Array.isArray(selectedItem?.sizes)) {
        selectedItem.sizes = selectedItem.sizes.map((sizeObj) => ({
          ...sizeObj,
          price: Number(sizeObj.price),
        }));
      }

      if (Array.isArray(selectedItem?.sizes)) {
        const uniqueSizes = new Set();
        selectedItem.sizes = selectedItem.sizes.filter((sizeObj) => {
          if (sizeObj.size && !uniqueSizes.has(sizeObj.size.toLowerCase())) {
            uniqueSizes.add(sizeObj.size.toLowerCase());
            sizeObj.price = Number(sizeObj.price);
            return true;
          }
          return false;
        });

        const sizeOrder = { Small: 1, Medium: 2, Large: 3 };
        selectedItem.sizes.sort(
          (a, b) => sizeOrder[a.size] - sizeOrder[b.size]
        );
      }

      const updatedItem = {
        ...selectedItem,
        imgUrl: updatedImgUrl,
      };

      const updatedItems = menuItems.map((item) =>
        item.itemId === selectedItem.itemId ? updatedItem : item
      );

      await updateDoc(menuRef, { items: updatedItems });

      setMenuItems(updatedItems);
      setSelectedImageFile(null);
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating item:", error);
      showError("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  // Delete function
  const handleDeleteItem = async (itemId) => {
    if (!isOwner) return; // Ensure only the owner can delete

    const confirmed = await confirmAction(
      "Delete Menu Item",
      "Are you sure you want to delete this item? This action cannot be undone.",
      "Yes, Delete"
    );

    if (!confirmed) return;

    try {
      await deleteMenuItem(restaurantId, itemId); // Call delete function
      setMenuItems(menuItems.filter((item) => item.itemId !== itemId)); // Update UI
      showSuccess("Menu item deleted successfully!");
    } catch (error) {
      console.error("Error deleting item:", error);
      showError("Failed to delete the menu item. Please try again.");
    }
  };

  const getRestaurantStatus = (openingHours, manualStatus) => {
    if (manualStatus === "closed") return "Closed";
    if (manualStatus === "busy") return "Busy";
    if (manualStatus === "open") return "Open";

    if (manualStatus !== "auto") return "Closed"; // fallback
    if (!openingHours) return "Closed";

    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" });
    const currentTime = now.toLocaleTimeString("en-US", { hour12: false });

    const todayHours = openingHours[currentDay];
    if (!todayHours || !todayHours.enabled) return "Closed";

    return currentTime >= todayHours.open && currentTime <= todayHours.close
      ? "Open"
      : "Closed";
  };

if (initialLoading) return <CardSkeletonFallback />;

  return (
    <div className="container p-1 ">
      {/* Floating cart */}
      {isOwner === false && restaurantId && userRole === "customer" && (
        <div
          className="bg-dark p-2 cart_hover"
          style={{
            position: "fixed",
            bottom: "50px",
            right: "20px",
            zIndex: 1050,
            borderRadius: "50%",
          }}
          ref={cartIconRef}
          onClick={() => navigate("/cart")}
        >
          <div className="" style={{ position: "relative" }}>
            <i className="fa fa-shopping-cart fa-2x text-white"></i>
            {cartItems.length > 0 && (
              <span
                className="badge bg-danger"
                style={{
                  position: "absolute",
                  top: "-8px",
                  right: "-10px",
                  borderRadius: "50%",
                  padding: "4px 8px",
                  fontSize: "0.7rem",
                }}
              >
                {cartItems.length}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Restaurant Logo */}
      <div
        className="container d-flex justify-content-center align-items-center"
        style={{ minHeight: "120px" }}
      >
        {logoLoading && (
          <div className="spinner-border text-secondary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        )}

        {(restaurantImgUrl || !logoLoading) && (
          <img
            src={restaurantImgUrl || imagePlaceHolder}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = imagePlaceHolder;
              setLogoLoading(false);
            }}
            onLoad={() => setLogoLoading(false)}
            alt="restaurant logo"
            className="img-fluid mt-2"
            style={{
              display: logoLoading ? "none" : "block", // Hide until fully loaded
              height: "100px",
              width: "100px",
              borderRadius: "50%",
              cursor: "pointer",
            }}
            onClick={() => setShowLogoModal(true)}
          />
        )}
      </div>

      {/* Restaurant Name */}

      <p className="text-center mt-1 fs-5 fw-bold">
        {restaurantName || "No restaurant added yet"}
      </p>

      {/* Restaurant Working hours */}
      {Object.values(openingHours || {}).some(
        (hours) => hours?.enabled && hours.open && hours.close
      ) && (
        <div
          className="shadow pt-3 mb-4 bg-body rounded-3 row hover_effect"
          style={{ paddingLeft: "20px" }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <h6>
              <i className="fa-solid fa-calendar-days"></i> Working Hours
            </h6>
            <div>
              <span
                className={`badge py-3 ${
                  restaurantStatus === "Open" ? "bg-success" : "bg-danger"
                }`}
              >
                <FontAwesomeIcon
                  icon={restaurantStatus === "Open" ? faDoorOpen : faDoorClosed}
                  className="me-2"
                />
                {restaurantStatus}
              </span>
            </div>
          </div>

          <ul className="list-unstyled row">
            {Object.entries(openingHours || {})
              .sort(([dayA], [dayB]) => {
                const order = [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ];
                return order.indexOf(dayA) - order.indexOf(dayB);
              })
              .map(([day, hours]) => (
                <li key={day} className="col-lg-4 col-md-6 mb-2">
                  <strong>{day}:</strong>{" "}
                  {hours?.enabled && hours.open && hours.close ? (
                    <span className="text-success">
                      {hours.open} - {hours.close}
                    </span>
                  ) : (
                    <span className="text-danger">Closed</span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Search Box */}
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 mt-4">
            <form className="d-flex">
              <div className="input-group">
                <input
                  className="form-control"
                  type="search"
                  placeholder="Search"
                  aria-label="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  maxLength={50}
                />
                <span className="input-group-text bg-black">
                  <i className="fa fa-search text-white"></i>
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Category Buttons */}
      <div className="container mt-4">
        <h2 className="text-center mb-3">Food Categories</h2>
        <div className="d-flex flex-wrap justify-content-center gap-2">
          {filteredCategories.map((category, index) => (
            <button
              key={index}
              className="btn btn-outline-dark"
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="card-body p-3">
        {loading ? (
          <div className="text-center">
            <div className="spinner-border text-primary" role="status"></div>
            <p>Loading menu...</p>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center mt-4">
            <h5 className="text-muted">
              No menu has been added for this restaurant yet.
            </h5>
            {isOwner && (
              <p className="text-muted">
                You can add menu items using the "Add Menu Item" section.
              </p>
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center mt-4">
            <h5 className="text-warning">No items match your search.</h5>
          </div>
        ) : filteredItems.length > 0 ? (
          filteredCategories.map((category, index) => (
            <div
              key={index}
              
              className="mt-4"
            >
              <h3 className="text-dark p-2"
              ref={(el) => (categoryRefs.current[category] = el)}
              >{category}</h3>

              <div className="justify-content-start shadow px-1 pb-3 mb-5 bg-body rounded-3 row g-3">
                {filteredItems
                  .filter((item) => item.category === category)
                  .map((item) => {
                    let lowestPrice = "N/A";
                    if (item.sizes && item.sizes.length > 0) {
                      const prices = item.sizes.map((size) =>
                        parseFloat(size.price)
                      );
                      lowestPrice = Math.min(...prices).toFixed(2);
                    }

                    return (
                      <div
                        key={item.itemId}
                        className="col-lg-4 col-md-6 d-flex"
                      >
                        <div
                          className={`card menu-card w-100 ${
                            isOwner ? "clickable" : ""
                          } ${
                            !item.availability
                              ? "unavailable"
                              : "bg-black text-white"
                          }`}
                          style={{ maxWidth: "540px" }}
                          onClick={() => {
                            if (isOwner) {
                              handleEditItem(item);
                            } else {
                              setViewingItem(item);
                              setSelectedSize(null);
                              setShowViewModal(true);
                            }
                          }}
                        >
                          <div className="row g-0">
                            <div className="col-4">
                              <img
                                ref={(el) =>
                                  (itemImageRefs.current[item.itemId] = el)
                                }
                                src={item.imgUrl || foodPlaceHolder}
                                className="img-fluid rounded-start"
                                alt={item.name}
                                style={{
                                  minHeight: "100%",
                                  objectFit: "cover",
                                  width: "100%",
                                }}
                              />
                            </div>
                            <div className="col-8">
                              <div className="card-body d-flex flex-column justify-content-between">
                                {/* Unavailable Badge */}
                                {!item.availability && (
                                  <span className="badge bg-danger position-absolute top-0 end-0 m-2">
                                    Unavailable
                                  </span>
                                )}
                                <h5 className="types_text" title={item.name}>
                                  {item.name}
                                </h5>
                                <p
                                  className="looking_text"
                                  title={item.description}
                                >
                                  {item.description}
                                </p>
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="badge bg-success fs-6">
                                    RM{lowestPrice}
                                  </span>
                                  <span className="small text-white">
                                    ⏳{item.estimatedPreparationTime} min
                                  </span>
                                </div>
                                <div className="send_bt w-100">
                                  {isOwner ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditItem(item);
                                      }}
                                    >
                                      Edit Item
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (userRole !== "customer") {
                                          showError(
                                            "Only customers can add items to the cart."
                                          );
                                          return;
                                        }
                                        handleAddToCart(
                                          item,
                                          null,
                                          itemImageRefs.current[item.itemId]
                                        );
                                      }}
                                      disabled={
                                        addingItemId === item.itemId ||
                                        userRole !== "customer"
                                      }
                                      title={
                                        userRole !== "customer"
                                          ? "Only customers can order"
                                          : ""
                                      }
                                    >
                                      {addingItemId === item.itemId ? (
                                        <>
                                          <i className="fa-solid fa-spinner fa-spin"></i>{" "}
                                          Adding...
                                        </>
                                      ) : (
                                        "Add to Cart"
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-danger">No menu items available.</p>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setSelectedImageFile(null);
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Menu Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3 text-center">
              <div>
                <img
                  src={
                    selectedImageFile
                      ? URL.createObjectURL(selectedImageFile)
                      : selectedItem?.imgUrl || foodPlaceHolder
                  }
                  alt="Edit item"
                  className="img-fluid rounded mb-2"
                  style={{
                    width: "100%",
                    maxHeight: "200px",
                    objectFit: "cover",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    document.getElementById("editItemImageInput")?.click()
                  }
                />
                <Form.Control
                  type="file"
                  id="editItemImageInput"
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedImageFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </Form.Group>

            <Form.Group>
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={selectedItem?.name || ""}
                onChange={handleEditChange}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={selectedItem?.description || ""}
                onChange={handleEditChange}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Available Quantity</Form.Label>
              <Form.Control
                type="number"
                name="availableQuantity"
                value={
                  selectedItem?.availableQuantity !== undefined
                    ? selectedItem.availableQuantity
                    : ""
                }
                onChange={handleEditChange}
                min={0}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Est prep Time</Form.Label>
              <Form.Control
                type="number"
                name="estimatedPreparationTime"
                value={selectedItem?.estimatedPreparationTime || ""}
                onChange={handleEditChange}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Sizes & Prices</Form.Label>
              {(selectedItem?.sizes || [])
                .map((size, originalIndex) => ({ ...size, originalIndex }))
                .sort((a, b) => {
                  const order = { Small: 1, Medium: 2, Large: 3 };
                  return order[a.size] - order[b.size];
                })
                .map((sortedSize, displayIndex) => {
                  const index = sortedSize.originalIndex;
                  return (
                    <div key={index} className="d-flex align-items-center mb-2">
                      {/* Size Dropdown */}
                      <Form.Select
                        value={sortedSize.size}
                        onChange={(e) => {
                          const selectedSize = e.target.value;
                          const isDuplicate = selectedItem.sizes.some(
                            (s, i) =>
                              i !== index &&
                              s.size.toLowerCase() ===
                                selectedSize.toLowerCase()
                          );

                          if (isDuplicate) {
                            showError(
                              `The size "${selectedSize}" has already been added.`
                            );
                            return;
                          }

                          const updatedSizes = [...selectedItem.sizes];
                          updatedSizes[index].size = selectedSize;
                          setSelectedItem({
                            ...selectedItem,
                            sizes: updatedSizes,
                          });
                        }}
                      >
                        {["Small", "Medium", "Large"].map((s) => (
                          <option
                            key={s}
                            value={s}
                            disabled={selectedItem.sizes.some(
                              (sz, i) => sz.size === s && i !== index
                            )}
                          >
                            {s}
                          </option>
                        ))}
                      </Form.Select>

                      {/* Price Input */}
                      <Form.Control
                        type="number"
                        value={sortedSize.price}
                        onChange={(e) => {
                          const updatedSizes = [...selectedItem.sizes];
                          updatedSizes[index].price = e.target.value;
                          setSelectedItem({
                            ...selectedItem,
                            sizes: updatedSizes,
                          });
                        }}
                        min="0"
                        step="0.01"
                      />

                      {selectedItem.sizes.length > 1 && (
                        <Button
                          variant="danger"
                          className="ms-2"
                          onClick={() => {
                            const updatedSizes = selectedItem.sizes.filter(
                              (_, i) => i !== index
                            );
                            setSelectedItem({
                              ...selectedItem,
                              sizes: updatedSizes,
                            });
                          }}
                        >
                          <i className="fa fa-trash"></i>
                        </Button>
                      )}
                    </div>
                  );
                })}

              {(() => {
                const sizeNames =
                  selectedItem?.sizes?.map((s) => s.size.toLowerCase()) || [];
                const availableOptions = ["Small", "Medium", "Large"].filter(
                  (opt) => !sizeNames.includes(opt.toLowerCase())
                );

                return availableOptions.length > 0 ? (
                  <Button
                    variant="outline-secondary"
                    className="mt-2"
                    onClick={() => {
                      const newSize = availableOptions[0];
                      const updatedSizes = [
                        ...selectedItem.sizes,
                        { size: newSize, price: "" },
                      ];

                      setSelectedItem({ ...selectedItem, sizes: updatedSizes });
                    }}
                  >
                    <i class="fa-solid fa-plus"></i> Add Size
                  </Button>
                ) : null;
              })()}
            </Form.Group>

            <Form.Group className="form-check form-switch">
              <Form.Check
                type="switch"
                id="availabilitySwitch"
                label={selectedItem?.availability ? "Available" : "Unavailable"}
                checked={selectedItem?.availability || false}
                onChange={(e) =>
                  selectedItem &&
                  setSelectedItem({
                    ...selectedItem,
                    availability: e.target.checked,
                  })
                }
                data-bs-toggle="tooltip"
                data-bs-placement="top"
                title="Switch on if this item is currently available for orders."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button
            variant="danger"
            disabled={saving}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteItem(selectedItem.itemId);
              setShowEditModal(false);
            }}
          >
            Delete
          </Button>

          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => setShowEditModal(false)}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={handleSaveChanges}
            disabled={saving}
          >
            {saving ? (
              <>
                {" "}
                <i class="fa-solid fa-spinner fa-spin"></i> Saving...{" "}
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Modal for Regular Users */}
      <Modal
        show={showViewModal}
        onHide={() => {
          setShowViewModal(false);
          setSelectedImageFile(null);
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>{viewingItem?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingItem && (
            <>
              <img
                ref={modalImgRef} // ✅ Place ref here
                src={viewingItem.imgUrl}
                alt={viewingItem.name}
                className="img-fluid mb-3 rounded"
                style={{
                  width: "100%",
                  maxHeight: "200px",
                  objectFit: "cover",
                }}
              />
              <p>{viewingItem.description}</p>

              {viewingItem?.availableQuantity !== undefined && (
                <p>
                  <strong>Available Quantity:</strong>{" "}
                  <span
                    className={
                      viewingItem.availableQuantity > 0
                        ? "text-success"
                        : "text-danger"
                    }
                  >
                    {viewingItem.availableQuantity}
                  </span>
                </p>
              )}

              <p>
                <strong>Preparation Time:</strong>{" "}
                {viewingItem.estimatedPreparationTime} min
              </p>

              <Form>
                <Form.Group>
                  <Form.Label>Select Size:</Form.Label>
                  {viewingItem.sizes?.map((sizeObj, idx) => (
                    <Form.Check
                      key={idx}
                      type="radio"
                      name="sizeOption"
                      id={`size-${idx}`}
                      label={`${sizeObj.size} - RM${parseFloat(
                        sizeObj.price
                      ).toFixed(2)}`}
                      value={sizeObj.size}
                      onChange={() => setSelectedSize(sizeObj)}
                      checked={selectedSize?.size === sizeObj.size}
                    />
                  ))}
                </Form.Group>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={isAdding || userRole !== "customer"}
            onClick={async () => {
              if (userRole !== "customer") {
                showError("Only customers can add items to the cart.");
                return;
              }

              if (!selectedSize) return showError("Please select a size.");

              setIsAdding(true); // start loading

              const itemWithSize = {
                ...viewingItem,
                sizes: [selectedSize],
                selectedSize: selectedSize.size,
                selectedPrice: selectedSize.price,
              };

              await handleAddToCart(itemWithSize);

              setTimeout(() => {
                setShowViewModal(false);
                setIsAdding(false); // end loading
              }, 600);
            }}
          >
            {isAdding ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Adding...
              </>
            ) : (
              "Add to Cart"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Replace Cart Modal */}
      <Modal
        show={showCartConflictModal}
        onHide={() => setShowCartConflictModal(false)}
        backdrop="static"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Replace Cart?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You already have items in your cart from a different restaurant. Do
          you want to clear the cart and add this new item instead?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowCartConflictModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              localStorage.setItem("restaurantId", restaurantId);

              await clear();
              await addToCart(pendingItem);
              setShowCartConflictModal(false);
              setTimeout(() => {
                const img = itemImageRefs.current[pendingItem.itemId];
                if (img) animateToCart(img);
              }, 0);
            }}
          >
            Replace Cart
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Logo Image Modal */}
      <Modal
        show={showLogoModal}
        onHide={() => setShowLogoModal(false)}
        size="lg"
        centered
        backdrop={true}
        keyboard={true}
      >
        <Modal.Body
          className="p-0 bg-dark text-center"
          onClick={() => setShowLogoModal(false)}
        >
          <img
            src={restaurantImgUrl || imagePlaceHolder}
            alt="Restaurant Large"
            className="img-fluid"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "90vh",
              objectFit: "cover",
            }}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MenuPage;
