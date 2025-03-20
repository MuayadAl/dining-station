import { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "../../models/firebase";
import {
  getDoc,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUtensils,
  faDollarSign,
  faBoxes,
  faTag,
  faClock,
  faListAlt,
  faFileImage,
  faExclamationCircle,
  faPlus,
  faTrash,
  faScaleUnbalanced,
} from "@fortawesome/free-solid-svg-icons";

import useAlert from "../../hooks/userAlert";

const popularCategories = [
  "Rice",
  "Bread",
  "Beverage",
  "Salad",
  "Chicken",
  "Meat",
  "Side",
  "Vegetables",
  "Seafood",
  "Pasta",
  "Soup",
  "Desserts",
  "Fast Food",
  "Noodles",
  "Vegan",
  "Breakfast",
  "Dairy & Cheese",
  "Snacks & Finger Foods",
  "Fruits",
  "Pizza",
  "BBQ",
  "Healthy Options",
  "Specials",
  "Sandwich",
];

const itemSize = ["Small", "Medium", "Large"];

// Define keywords for each category
const categoryKeywords = {
  Rice: ["rice", "nasi", "fried rice"],
  Bread: ["bread", "baguette", "roll"],
  Beverage: ["drink", "beverage", "soda", "juice"],
  Salad: ["salad", "greens"],
  Chicken: ["chicken", "wing", "drumstick", "ayam"],
  Meat: ["meat", "beef", "lamb", "daging"],
  Side: ["side", "fries", "appetizer"],
  Vegetables: ["vegetable", "veggie", "greens"],
  Seafood: ["seafood", "fish", "shrimp", "prawn"],
  Pasta: ["pasta", "spaghetti", "lasagna"],
  Soup: ["soup", "broth", "stew"],
  Desserts: ["dessert", "cake", "ice cream"],
  "Fast Food": ["burger", "fast", "fries"],
  Noodles: ["noodle", "ramen", "udon"],
  Vegan: ["vegan", "plant-based"],
  Breakfast: ["breakfast", "pancake", "omelet", "egg", "omelet", "telur dadar"],
  "Dairy & Cheese": ["cheese", "dairy"],
  "Snacks & Finger Foods": ["snack", "finger", "bite"],
  Fruits: ["fruit", "berry", "banana", "apple"],
  Pizza: ["pizza", "slice"],
  BBQ: ["bbq", "barbecue", "grill", "grilled chicken"],
  "Healthy Options": ["healthy", "low-fat", "low-carb"],
  Specials: ["special", "chef", "limited"],
  Sandwich: ["sandwich", "shawarma", "wrap"],
};

// Function to auto-assign a category based on item name and description
// This simple approach uses the first matching keyword found.
const autoAssignCategory = (itemName, description) => {
  const text = (itemName + " " + description).toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }
  return ""; // return empty string if no match found
};

const AddMenuItemPage = () => {
  const { confirmAction, showSuccess, showError } = useAlert();
  const fileInputRef = useRef(null);

  const [restaurantId, setRestaurantId] = useState(
    sessionStorage.getItem("restaurantId") || ""
  );
  const [menuId, setMenuId] = useState("");
  const [itemName, setItemName] = useState("");
  const [availableQuantity, setAvailableQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [sizes, setSizes] = useState([{ size: "", price: "" }]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [category, setCategory] = useState("");
  const [estimatedPreparationTime, setEstimatedPreparationTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [availability, setAvailability] = useState(false);

  // Fetch restaurant id from firestore if not available in sessionStorage.
  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
          collection(db, "restaurants"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const fetchedRestaurantId = querySnapshot.docs[0].data().restaurantId;
          setRestaurantId(fetchedRestaurantId);
          sessionStorage.setItem("restaurantId", fetchedRestaurantId);
        }
      } catch (error) {
        console.error("Error fetching restaurant ID:", error);
      }
    };

    if (!restaurantId) {
      fetchRestaurantId();
    }
  }, [restaurantId]);

  const uploadImage = async (file) => {
    if (!file) return "";
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Unauthorized access");

      const imgRef = ref(
        storage,
        `menus/${user.uid}/${Date.now()}_${file.name}`
      );
      await uploadBytes(imgRef, file);
      return getDownloadURL(imgRef);
    } catch (error) {
      console.error("Image upload error:", error);
      return "";
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, imageFile: "" }));
    } else {
      setImageFile(null);
      setImagePreview("");
      setErrors((prev) => ({
        ...prev,
        imageFile: "Please select a valid image file.",
      }));
    }
  };

  const validateForm = () => {
    let formErrors = {};
    if (!itemName.trim()) formErrors.itemName = "Item name is required.";
    if (!availableQuantity || availableQuantity < 1)
      formErrors.availableQuantity = "Quantity must be at least 1.";
    if (!description.trim())
      formErrors.description = "Description is required.";
    if (!category) formErrors.category = "Please select a category.";
    if (
      !sizes.length ||
      sizes.some((size) => !size.size || !size.price || size.price <= 0)
    ) {
      formErrors.sizes = "At least one valid size and price must be added.";
    }
    if (!estimatedPreparationTime || estimatedPreparationTime <= 0)
      formErrors.estimatedPreparationTime = "Enter a valid preparation time.";
    if (!imageFile) formErrors.imageFile = "Please upload an image.";

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  // Auto-assign category when itemName or description changes.
  useEffect(() => {
    const assignedCategory = autoAssignCategory(itemName, description);
    if (assignedCategory) {
      setCategory(assignedCategory);
    }
  }, [itemName, description]);

  const addMenuItem = async () => {
    if (!validateForm()) return;

    const isConfirmed = await confirmAction(
      "Confirm Add Item",
      "Are you sure you want to add this item?",
      "Yes, add it!"
    );

    if (!isConfirmed) return;

    setLoading(true);
    try {
      const imageUrl = imageFile ? await uploadImage(imageFile) : "";

      const itemData = {
        itemId: uuidv4(),
        name: itemName,
        availableQuantity: parseInt(availableQuantity, 10),
        description,
        sizes,
        imgUrl: imageUrl,
        estimatedPreparationTime,
        category,
        availability,
        createdAt: new Date().toISOString(),
      };

      const menuRef = doc(db, "menu", menuId || restaurantId);
      const menuSnap = await getDoc(menuRef);

      if (menuSnap.exists()) {
        await updateDoc(menuRef, {
          items: arrayUnion(itemData),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(menuRef, {
          menuId: menuId || restaurantId,
          restaurantId,
          items: [itemData],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      showSuccess("Menu item added successfully!");
      resetForm();
    } catch (error) {
      console.error("Error adding menu item:", error);
      showError(`Error adding menu item: ${error.message}`);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setItemName("");
    setAvailableQuantity("");
    setDescription("");
    setSizes([{ size: "", price: "" }]);
    setImageFile(null);
    setImagePreview("");
    setCategory("");
    setEstimatedPreparationTime("");
    setAvailability(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addSizeField = () => {
    setSizes([...sizes, { size: "", price: "" }]);
  };

  const removeSizeField = (index) => {
    setSizes(sizes.filter((_, i) => i !== index));
  };

  const handleSizeChange = (index, key, value) => {
    const updatedSizes = [...sizes];
    updatedSizes[index][key] = value;
    setSizes(updatedSizes);
  };

  return (
    <div className="container d-flex justify-content-center align-items-center">
      <div className="card shadow p-4 w-100 my-3">
        <h2 className="text-center mb-4">Add Menu Item</h2>
        {restaurantId ? (
          <p className="text-muted text-center">
            Restaurant ID: {restaurantId}
          </p>
        ) : (
          <p className="text-danger text-center">Loading restaurant info...</p>
        )}
        {message && <div className="alert alert-info">{message}</div>}

        <form className="row g-3">
          {/* Item Name */}
          <div className="col-12">
            <label className="form-label">Item Name</label>
            <div className="input-group">
              <span className="input-group-text">
                <FontAwesomeIcon icon={faUtensils} />
              </span>
              <input
                type="text"
                className="form-control"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            {errors.itemName && (
              <small className="text-danger">
                <FontAwesomeIcon icon={faExclamationCircle} /> {errors.itemName}
              </small>
            )}
          </div>

          {/* Size & Price */}
          <div className="col-lg-12 col-md-4">
            <label className="form-label"> Sizes & Prices</label>
            {sizes.map((size, index) => (
              <div key={index} className="input-group mb-2">
                <span className="input-group-text">
                  <FontAwesomeIcon icon={faScaleUnbalanced} />
                </span>
                <select
                  className="form-select"
                  value={size.size}
                  onChange={(e) =>
                    handleSizeChange(index, "size", e.target.value)
                  }
                >
                  <option value="">Select a size</option>
                  {itemSize.map((s, idx) => (
                    <option key={idx} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span
                  className="input-group-text"
                  style={{ marginLeft: "10px" }}
                >
                  <FontAwesomeIcon icon={faDollarSign} />
                </span>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Price (RM)"
                  value={size.price}
                  onChange={(e) =>
                    handleSizeChange(index, "price", e.target.value)
                  }
                />
                {sizes.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => removeSizeField(index)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addSizeField}
            >
              <FontAwesomeIcon icon={faPlus} /> Add Size
            </button>
          </div>
          {errors.sizes && (
            <small className="text-danger">
              <FontAwesomeIcon icon={faExclamationCircle} /> {errors.sizes}
            </small>
          )}

          {/* Available Quantity */}
          <div className="col-12">
            <label className="form-label">Available Quantity</label>
            <div className="input-group">
              <span className="input-group-text">
                <FontAwesomeIcon icon={faBoxes} />
              </span>
              <input
                type="number"
                className="form-control"
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(e.target.value)}
                placeholder="Quantity"
              />
            </div>
            {errors.availableQuantity && (
              <small className="text-danger">
                <FontAwesomeIcon icon={faExclamationCircle} />{" "}
                {errors.availableQuantity}
              </small>
            )}
          </div>

          {/* Description */}
          <div className="col-12">
            <label className="form-label">
              <FontAwesomeIcon icon={faTag} /> Description
            </label>
            <textarea
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="2"
              placeholder="Describe the item"
            ></textarea>
            {errors.description && (
              <small className="text-danger">
                <FontAwesomeIcon icon={faExclamationCircle} />{" "}
                {errors.description}
              </small>
            )}
          </div>

          {/* Category */}
          <div className="col-12">
            <label className="form-label">
              <FontAwesomeIcon icon={faListAlt} /> Category
            </label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select a category</option>
              {popularCategories.map((cat, index) => (
                <option key={index} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <small className="text-danger">
                <FontAwesomeIcon icon={faExclamationCircle} /> {errors.category}
              </small>
            )}
          </div>

          {/* Estimated Prep Time */}
          <div className="col-md-6">
            <label className="form-label">Estimated Prep Time</label>
            <div className="input-group">
              <span className="input-group-text">
                <FontAwesomeIcon icon={faClock} />
              </span>
              <input
                type="number"
                className="form-control"
                value={estimatedPreparationTime}
                required
                onChange={(e) => setEstimatedPreparationTime(e.target.value)}
                placeholder="Time (mins)"
              />
            </div>
            {errors.estimatedPreparationTime && (
              <small className="text-danger">
                <FontAwesomeIcon icon={faExclamationCircle} />{" "}
                {errors.estimatedPreparationTime}
              </small>
            )}
          </div>

          {/* Image Uploader */}
          <div className="col-12">
            <label className="form-label">
              <FontAwesomeIcon icon={faFileImage} /> Upload Image
            </label>
            <input
              type="file"
              className="form-control"
              onChange={handleImageChange}
              ref={fileInputRef}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                className="img-thumbnail mt-2"
                alt="Preview"
                width="100px"
              />
            )}
            {errors.imageFile && (
              <small className="text-danger">
                <FontAwesomeIcon icon={faExclamationCircle} />{" "}
                {errors.imageFile}
              </small>
            )}
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="flexSwitchCheckChecked"
              checked={availability}
              onChange={(e) => setAvailability(e.target.checked)}
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title="Switch on if this item is currently available for orders."
            />
            <label
              className="form-check-label"
              htmlFor="flexSwitchCheckChecked"
            >
              Availability
            </label>
          </div>

          {/* Submit Button */}
          <div className="col-md-6 send_bt">
            <button
              type="button"
              onClick={addMenuItem}
              disabled={loading}
              className="btn"
            >
              {loading ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMenuItemPage;
