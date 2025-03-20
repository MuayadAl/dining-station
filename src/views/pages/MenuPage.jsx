import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../models/firebase";
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

const MenuPage = () => {
  const { restaurantId } = useParams();
  const [restaurantImgUrl, setRestaurantImgUrl] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [openingHours, setOpeningHours] = useState({});
  const [restaurantStatus, setRestaurantStatus] =
    useState("Checking status...");

  const { confirmAction, showSuccess, showError } = useAlert();

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const categoryRefs = useRef({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOwner, setIsOwner] = useState(null);

  useEffect(() => {
    if (restaurantId) {
      localStorage.setItem("restaurantId", restaurantId); // ✅ Store in localStorage
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId || isOwner === null) return; // Ensure isOwner is determined

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
      }
    };

    fetchMenu();

    return () => {
      isMounted = false;
    };
  }, [restaurantId, isOwner]); // Dependency array includes isOwner



  const handleAddToCart = async (item) => {
    try {
      await addToCart(item);
      showSuccess(`${item.name} added to cart!`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      showError("Failed to add item to cart.");
    }
  };


  useEffect(() => {
    let isMounted = true;

    const fetchRestaurantDetails = async () => {
      try {
        const restaurantRef = doc(db, "restaurants", restaurantId);
        const restaurantSnap = await getDoc(restaurantRef);

        if (restaurantSnap.exists() && isMounted) {
          const restaurantData = restaurantSnap.data();
          setIsOwner(restaurantData.userId === auth.currentUser?.uid);
          setRestaurantImgUrl(restaurantData.imgUrl || "");
          setRestaurantName(restaurantData.name || "");
          setOpeningHours(restaurantData.openingHours || {}); // Store opening hours

          const status = getRestaurantStatus(restaurantData.openingHours);
          setRestaurantStatus(status);
        }
      } catch (error) {
        if (isMounted)
          console.error("Error fetching restaurant details:", error);
      }
    };

    fetchRestaurantDetails();

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategoryClick = (category) => {
    if (categoryRefs.current[category]) {
      categoryRefs.current[category].scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const filteredCategories = categories.filter((category) =>
    filteredItems.some((item) => item.category === category)
  );

  const handleEditItem = (item) => {
    if (!isOwner) return; // Only owners can edit
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    setSelectedItem({ ...selectedItem, [e.target.name]: e.target.value });
  };

  const handleSaveChanges = async () => {
    try {
      const menuRef = doc(db, "menu", restaurantId);
      const updatedItems = menuItems.map((item) =>
        item.itemId === selectedItem.itemId ? selectedItem : item
      );

      await updateDoc(menuRef, { items: updatedItems });
      setMenuItems(updatedItems);
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating item:", error);
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


  const getRestaurantStatus = (openingHours) => {
    if (!openingHours) return "Closed";

    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" }); // Get current day (e.g., "Monday")
    const currentTime = now.toLocaleTimeString("en-US", { hour12: false }); // Get current time in 24-hour format

    const todayHours = openingHours[currentDay];

    if (!todayHours || !todayHours.enabled) {
      return "Closed";
    }

    const openTime = todayHours.open;
    const closeTime = todayHours.close;

    if (currentTime >= openTime && currentTime <= closeTime) {
      return "Open";
    } else {
      return "Closed";
    }
  };

  return (
    <div className="container p-1 ">
      {/* Restaurant Logo */}
      <div className=" container d-flex justify-content-center align-items-center">
        <img
          src={restaurantImgUrl || "https://via.placeholder.com/50"}
          alt="restaurant logo"
          className="img-fluid mt-2"
          style={{ height: "100px", width: "100px", borderRadius: "50%" }}
        />
      </div>

      {/* Restaurant Name */}

      <p className="text-center mt-1 fs-5 fw-bold">{restaurantName}</p>

      {/* Restaurant Working hours */}
      <div
        className="shadow pt-3 mb-4 bg-body rounded-3 row"
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
        ) : filteredItems.length > 0 ? (
          filteredCategories.map((category, index) => (
            <div
              key={index}
              ref={(el) => (categoryRefs.current[category] = el)}
              className="mt-4"
            >
              <h3 className="text-dark p-2">{category}</h3>
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
                          onClick={() => isOwner && handleEditItem(item)}
                        >
                          <div className="row g-0">
                            <div className="col-4">
                              <img
                                src={item.imgUrl}
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
                                  <button
                                    className=""
                                    style={{
                                      display: isOwner ? "none" : "block",
                                    }}
                                    onClick={() => handleAddToCart(item)}
                                  >
                                    {" "}
                                    Add to Cart
                                  </button>
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
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Fast Edit Menu Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
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
              {selectedItem?.sizes?.map((size, index) => (
                <div key={index} className="d-flex align-items-center mb-2">
                  {/* Size Dropdown */}
                  <Form.Select
                    value={size.size}
                    onChange={(e) => {
                      const updatedSizes = [...selectedItem.sizes];
                      updatedSizes[index].size = e.target.value;
                      setSelectedItem({ ...selectedItem, sizes: updatedSizes });
                    }}
                    className="me-2"
                  >
                    <option value="">Select a Size</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                  </Form.Select>

                  {/* Price Input */}
                  <Form.Control
                    type="number"
                    value={size.price}
                    onChange={(e) => {
                      const updatedSizes = [...selectedItem.sizes];
                      updatedSizes[index].price = e.target.value;
                      setSelectedItem({ ...selectedItem, sizes: updatedSizes });
                    }}
                    min="0"
                    step="0.01"
                  />
                </div>
              ))}
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
            onClick={(e) => {
              e.stopPropagation(); 
              handleDeleteItem(selectedItem.itemId);
              setShowEditModal(false);
            }}
          >
            Delete
          </Button>

          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveChanges}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MenuPage;
