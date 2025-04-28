import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../models/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCheckCircle,
  faHourglass,
  faTimesCircle,
  faChartLine,
  faCalendarDays,
  faStore,
  faStickyNote,
  faDoorOpen,
  faDoorClosed,
} from "@fortawesome/free-solid-svg-icons";

const RestaurantStatusReports = () => {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantStatus, setRestaurantStatus] =
    useState("Checking status...");
    const [orderStats, setOrderStats] = useState({
      totalIncome: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      topItems: [],
      dailyTotals: [],
      weeklyTotals: [],
      monthlyTotals: [],
      totalOrders: 0,
      avgTicket: 0,
    });
    
  const [orders, setOrders] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const downloadCSV = (data) => {
    const filtered = data.filter((order) => {
      const orderDate = new Date(order.time);
      return (
        (!startDate || orderDate >= new Date(startDate)) &&
        (!endDate || orderDate <= new Date(endDate))
      );
    });

    let rows = [];

    filtered.forEach((order) => {
      const baseInfo = [
        order.id,
        new Date(order.time).toLocaleDateString(),
        new Date(order.time).toLocaleTimeString(),
        `RM${order.total?.toFixed(2) || "0.00"}`,
        order.status,
      ];

      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          rows.push([
            ...baseInfo,
            item.name,
            item.quantity,
            `RM${(item.price * item.quantity).toFixed(2)}`,
          ]);
        });
      } else {
        rows.push([...baseInfo, "N/A", "N/A", "N/A"]);
      }
    });

    const headers = [
      "Order ID",
      "Date",
      "Time",
      "Total",
      "Status",
      "Item Name",
      "Quantity",
      "Item Subtotal",
    ];

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `restaurant_orders_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to check if the restaurant is open or closed
  const getRestaurantStatus = (openingHours, manualStatus) => {
    if (manualStatus === "closed") return "closed";
    if (manualStatus === "busy") return "busy";

    if (!openingHours) return "closed";

    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" });
    const currentTime = now.toLocaleTimeString("en-US", { hour12: false });

    const todayHours = openingHours[currentDay];

    if (!todayHours || !todayHours.enabled) return "closed";

    const openTime = todayHours.open;
    const closeTime = todayHours.close;

    if (currentTime >= openTime && currentTime <= closeTime) {
      return "open";
    }

    return "closed";
  };

  // Fetch restaurant data for the logged-in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const restaurantQuery = query(
            collection(db, "restaurants"),
            where("userId", "==", user.uid)
          );
          const querySnapshot = await getDocs(restaurantQuery);

          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const restaurantData = docSnap.data();
            setRestaurant(restaurantData);

            // Calculate and set the restaurant status
            const status = getRestaurantStatus(
              restaurantData.openingHours,
              restaurantData.status
            );
            setRestaurantStatus(status);

            // Fetch all orders for this restaurant
            const orderQuery = query(
              collection(db, "orders"),
              where("restaurantId", "==", restaurantData.restaurantId)
            );
            const orderSnapshot = await getDocs(orderQuery);

            let income = 0;
            let completed = 0;
            let cancelled = 0;
            let itemCountMap = {};
            let dailyMap = {};
            const fetchedOrders = [];

            orderSnapshot.forEach((doc) => {
              const data = doc.data();
              fetchedOrders.push({ id: doc.id, ...data });

              // Only count orders with total value
              if (data.total) {
                const dateStr = new Date(data.time).toLocaleDateString();

                if (data.status === "Picked Up") {
                  income += parseFloat(data.total);
                  completed++;
                  dailyMap[dateStr] =
                    (dailyMap[dateStr] || 0) + parseFloat(data.total);
                } else if (data.status === "Cancelled") {
                  cancelled++;
                }

                // Count items for top sold
                if (data.items?.length) {
                  data.items.forEach((item) => {
                    const name = item.name;
                    itemCountMap[name] =
                      (itemCountMap[name] || 0) + item.quantity;
                  });
                }
              }
            });

            // Top 3 sold items
            const topItems = Object.entries(itemCountMap)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([name, quantity]) => ({ name, quantity }));

            // Daily totals sorted by date descending
            const dailyTotals = Object.entries(dailyMap)
              .map(([date, total]) => ({ date, total }))
              .sort((a, b) => new Date(b.date) - new Date(a.date));

            // Group by week & month
            let weekMap = {};
            let monthMap = {};
            let totalOrders = 0;

            orderSnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.status === "Picked Up" && data.total) {
                const time = new Date(data.time);
                const weekKey = `${time.getFullYear()}-W${Math.ceil(
                  time.getDate() / 7
                )}`;
                const monthKey = `${time.getFullYear()}-${(time.getMonth() + 1)
                  .toString()
                  .padStart(2, "0")}`;

                weekMap[weekKey] =
                  (weekMap[weekKey] || 0) + parseFloat(data.total);
                monthMap[monthKey] =
                  (monthMap[monthKey] || 0) + parseFloat(data.total);
                totalOrders++;
              }
            });

            setOrders(fetchedOrders);

            setOrderStats({
              totalIncome: income,
              completedOrders: completed,
              cancelledOrders: cancelled,
              topItems,
              dailyTotals,
              weeklyTotals: Object.entries(weekMap),
              monthlyTotals: Object.entries(monthMap),
              totalOrders,
              avgTicket: completed ? income / completed : 0,
            });
          } else {
            setError("No restaurant found for this user.");
          }
        } catch (err) {
          setError("Error fetching restaurant data: " + err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setError("User not authenticated.");
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  if (error) {
    return (
      <div className="min-vh-100 container-fluid">
        <div
          className=" container-fluid float-start alert alert-danger text-center my-5 py-5 fs-5"
          role="alert"
        >
          {error}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="alert alert-warning text-center mt-5" role="alert">
        No restaurant data available.
      </div>
    );
  }

  return (
    <div className="d-flex container justify-content-center align-items-center mb-4 ">
      <div className="w-100 ">
        <p className="mt-2 text-center fs-2 fw-bold">
          Restaurant Status & Reports
        </p>

        {/* Restaurant Status Section */}
        <section className="mb-5 ">
          <h2 className="mb-4">
            <FontAwesomeIcon icon={faChartLine} className="me-2" />
            Restaurant Status
          </h2>
          <div className="card shadow-sm hover_effect">
            <div className="card-body fs-6">
              <div className="justify-content-between d-flex align-items-center">
                <h5 className="card-title text-primary fw-bold">
                  {restaurant.name}
                </h5>
                <div>
                  <span
                    className={`badge py-3 ${
                      restaurantStatus === "open"
                        ? "bg-success"
                        : restaurantStatus === "busy"
                        ? "bg-warning"
                        : "bg-danger"
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={
                        restaurantStatus === "open"
                          ? faDoorOpen
                          : restaurantStatus === "busy"
                          ? faHourglass
                          : faDoorClosed
                      }
                      className="me-2"
                    />
                    {restaurantStatus}
                  </span>
                </div>
              </div>

              <hr />

              <div className="row">
                <div className="col-12 col-md-6 mb-3">
                  <p className="card-text">
                    <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                    <strong>Email:</strong> {restaurant.email}
                  </p>
                  <p className="card-text">
                    <FontAwesomeIcon icon={faPhone} className="me-2" />
                    <strong>Phone:</strong> {restaurant.phone}
                  </p>
                  <p className="card-text">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    <strong>Location:</strong> {restaurant.location}
                  </p>
                </div>
                <div className="col-md-6">
                  <p className="card-text">
                    <FontAwesomeIcon icon={faStore} className="me-2" />
                    <strong>Approval Status:</strong>{" "}
                    <span
                      className={`badge p-2 ${
                        restaurant.approvalStatus === "approved"
                          ? "bg-success"
                          : restaurant.approvalStatus === "pending"
                          ? "bg-warning"
                          : "bg-danger"
                      }`}
                    >
                      {restaurant.approvalStatus === "approved" && (
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="me-1"
                        />
                      )}
                      {restaurant.approvalStatus === "pending" && (
                        <FontAwesomeIcon icon={faHourglass} className="me-1" />
                      )}
                      {restaurant.approvalStatus === "rejected" && (
                        <FontAwesomeIcon
                          icon={faTimesCircle}
                          className="me-1"
                        />
                      )}
                      {restaurant.approvalStatus}
                    </span>
                  </p>
                  <p className="card-text">
                    <FontAwesomeIcon icon={faClock} className="me-2" />
                    <strong>Created At:</strong>{" "}
                    {restaurant.createdAt?.toDate().toLocaleString()}
                  </p>
                  <p className="card-text">
                    <FontAwesomeIcon icon={faStickyNote} className="me-2" />
                    <strong>Remark:</strong> {restaurant.remark || "N/A"}
                  </p>
                </div>
              </div>
              <hr />
              <div style={{ paddingLeft: "20px" }}>
                <h6>
                  <FontAwesomeIcon icon={faCalendarDays} className="me-2" />
                  Opening Hours
                </h6>
                <ul className="list-unstyled row">
                  {Object.entries(restaurant.openingHours || {})
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
                      <li key={day} className="col-md-4 mb-2">
                        <strong>{day}:</strong>{" "}
                        {hours && hours.enabled && hours.open && hours.close ? (
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
            </div>
          </div>
        </section>

        {/* Reports Section (Placeholder) */}
        <section>
          <h2 className="mb-4">
            <FontAwesomeIcon icon={faChartLine} className="me-2" />
            Reports
          </h2>
          {orders.length > 0 && (
            <div className="text-end mb-3">
              <button
                className="btn btn-outline-dark"
                onClick={() => downloadCSV(orders)}
              >
                Export All Orders to CSV
              </button>
            </div>
          )}
          <div className="row mb-3 g-2">
            <div className="col-md-4">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button
                className="btn btn-danger w-100"
                onClick={() => downloadCSV(orders)}
              >
                Export to CSV
              </button>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <div className="card shadow-sm border-success hover_effect">
                <div className="card-body text-success text-center">
                  <h5>Total Income</h5>
                  <h3 className="fw-bold">
                  RM {typeof orderStats.totalIncome === "number" ? orderStats.totalIncome.toFixed(2) : "0.00"}
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm border-primary hover_effect">
                <div className="card-body text-primary text-center">
                  <h5>Completed Orders</h5>
                  <h3 className="fw-bold">{orderStats.completedOrders}</h3>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm border-danger hover_effect">
                <div className="card-body text-danger text-center">
                  <h5>Cancelled Orders</h5>
                  <h3 className="fw-bold">{orderStats.cancelledOrders}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h4>Top 3 Sold Items</h4>
            <ul className="list-group">
              {orderStats.topItems.length === 0 ? (
                <li className="list-group-item text-muted">No data</li>
              ) : (
                orderStats.topItems.map((item, idx) => (
                  <li
                    key={idx}
                    className="list-group-item d-flex justify-content-between"
                  >
                    <strong>{item.name}</strong>
                    <span>{item.quantity} sold</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-5">
            <h4>Daily Income Summary</h4>
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Date</th>
                  <th>Total Income</th>
                </tr>
              </thead>
              <tbody>
                {orderStats.dailyTotals.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-muted text-center">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  orderStats.dailyTotals.map((day, idx) => (
                    <tr key={idx}>
                    <td>{day.date}</td>
                    <td>RM {typeof day.total === "number" ? day.total.toFixed(2) : "0.00"}</td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="row mt-4 g-3">
            <div className="col-md-6">
              <div className="card shadow-sm border-info hover_effect">
                <div className="card-body text-info text-center">
                  <h5>Total Orders</h5>
                  <h3 className="fw-bold">{orderStats.totalOrders}</h3>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card shadow-sm border-secondary hover_effect">
                <div className="card-body text-secondary text-center">
                  <h5>Avg Ticket Size</h5>
                  <h3 className="fw-bold">
                  RM {typeof orderStats.avgTicket === "number" ? orderStats.avgTicket.toFixed(2) : "0.00"}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h4>Weekly Income Summary</h4>
            <table className="table table-striped table-hover">
              <thead className="table-secondary">
                <tr>
                  <th>Week</th>
                  <th>Total Income</th>
                </tr>
              </thead>
              <tbody>
                {orderStats.weeklyTotals.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-muted text-center">
                      No weekly data.
                    </td>
                  </tr>
                ) : (
                  orderStats.weeklyTotals.map(([week, total], idx) => (
                    <tr key={idx}>
                    <td>{week}</td>
                    <td>RM {typeof total === "number" ? total.toFixed(2) : "0.00"}</td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <h4>Monthly Income Summary</h4>
            <table className="table table-striped table-hover">
              <thead className="table-secondary">
                <tr>
                  <th>Month</th>
                  <th>Total Income</th>
                </tr>
              </thead>
              <tbody>
                {orderStats.monthlyTotals.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-muted text-center">
                      No monthly data.
                    </td>
                  </tr>
                ) : (
                  orderStats.monthlyTotals.map(([month, total], idx) => (
                    <tr key={idx}>
                    <td>{month}</td>
                    <td>RM {typeof total === "number" ? total.toFixed(2) : "0.00"}</td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RestaurantStatusReports;
