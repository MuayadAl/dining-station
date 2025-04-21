import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../models/firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faFileCsv,
  faCalendarDays,
} from "@fortawesome/free-solid-svg-icons";

import "../style/styleSheet.css";

const AdminReportPage = () => {
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalOrders: 0,
    cancelledOrders: 0,
    topRestaurants: [],
    topItems: [],
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("daily");
  const [userStats, setUserStats] = useState({
    total: 0,
    admin: 0,
    restaurant: 0,
    restaurantStaff: 0,
    users: 0,
    latest: [],
  });
  const [groupedTotals, setGroupedTotals] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const orderSnap = await getDocs(collection(db, "orders"));
      const restaurantSnap = await getDocs(collection(db, "restaurants"));

      const allOrders = orderSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const allRestaurants = restaurantSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setOrders(allOrders);
      setRestaurants(allRestaurants);

      processStats(allOrders, allRestaurants);
      const userSnap = await getDocs(collection(db, "users"));
      const latestUsers = [];
      let roleCount = {
        admin: 0,
        "restaurant-owner": 0,
        "restaurant-staff": 0,
        customer: 0,
      };

      userSnap.forEach((doc) => {
        const data = doc.data();
        if (data.userRole && roleCount[data.userRole] !== undefined) {
          roleCount[data.userRole]++;
        }
        latestUsers.push({ id: doc.id, ...data });
      });

      setUserStats({
        total: latestUsers.length,
        admin: roleCount.admin,
        restaurant: roleCount["restaurant-owner"],
        restaurantStaff: roleCount["restaurant-staff"],
        users: roleCount.customer,
        latest: latestUsers
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5),
      });

      setLoading(false);
    };

    fetchData();
  }, []);

  const processStats = (orders, restaurants) => {
    let totalIncome = 0;
    let totalOrders = 0;
    let cancelledOrders = 0;
    let restaurantRevenueMap = {};
    let itemCountMap = {};

    orders.forEach((order) => {
      const date = new Date(order.time);
      if (
        (startDate && date < new Date(startDate)) ||
        (endDate && date > new Date(endDate))
      )
        return;

      if (order.status === "Picked Up") {
        totalIncome += parseFloat(order.total || 0);
        totalOrders++;
        // Group by restaurant
        if (restaurantRevenueMap[order.restaurantId]) {
          restaurantRevenueMap[order.restaurantId] += parseFloat(
            order.total || 0
          );
        } else {
          restaurantRevenueMap[order.restaurantId] = parseFloat(
            order.total || 0
          );
        }

        // Group by item
        order.items?.forEach((item) => {
          itemCountMap[item.name] =
            (itemCountMap[item.name] || 0) + item.quantity;
        });
      } else if (order.status === "Cancelled") {
        cancelledOrders++;
      }
    });
    let groupedTotals = {};

    orders.forEach((order) => {
      const date = new Date(order.time);
      if (
        (startDate && date < new Date(startDate)) ||
        (endDate && date > new Date(endDate))
      )
        return;

      if (order.status === "Picked Up" && order.total) {
        let key;

        if (groupBy === "daily") {
          key = date.toLocaleDateString();
        } else if (groupBy === "weekly") {
          const week = Math.ceil(date.getDate() / 7);
          key = `${date.getFullYear()}-W${week}`;
        } else if (groupBy === "monthly") {
          key = `${date.getFullYear()}-${(date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`;
        }

        groupedTotals[key] =
          (groupedTotals[key] || 0) + parseFloat(order.total);
      }
      setGroupedTotals(groupedTotals); // ✅ Save it to state
    });

    const topRestaurants = Object.entries(restaurantRevenueMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, total]) => {
        const rest = restaurants.find((r) => r.restaurantId === id);
        return {
          name: rest?.name || "Unknown",
          total: total.toFixed(2),
        };
      });

    const topItems = Object.entries(itemCountMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, qty]) => ({ name, quantity: qty }));

    setStats({
      totalIncome,
      totalOrders,
      cancelledOrders,
      topRestaurants,
      topItems,
    });
  };

  const exportCSV = () => {
    const headers = [
      "Order ID",
      "Date",
      "Customer",
      "Restaurant",
      "Total",
      "Status",
      "Items",
    ];
    const rows = orders
      .filter((order) => {
        const date = new Date(order.time);
        return (
          (!startDate || date >= new Date(startDate)) &&
          (!endDate || date <= new Date(endDate))
        );
      })
      .map((order) => {
        const restaurant = restaurants.find(
          (r) => r.restaurantId === order.restaurantId
        );
        const itemList = order.items
          ?.map((item) => `${item.name} x${item.quantity}`)
          .join(" | ");
        return [
          order.id,
          new Date(order.time).toLocaleDateString(),
          order.userName,
          restaurant?.name || "Unknown",
          `RM${order.total?.toFixed(2)}`,
          order.status,
          itemList,
        ];
      });

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin_orders_report.csv";
    a.click();
  };

  return (
    <div className="d-flex container justify-content-center align-items-center ">
      <div className="w-100 my-3">
        <h1>
          <FontAwesomeIcon icon={faChartBar} className="me-2" />
          Admin Reports
        </h1>

        {/* Date Range Filter */}
        <div className="row my-4 shadow p-3 bg-body rounded-3 hover_effect g-2">
          <div className="col-md-4">
            <label>Start Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label>End Date</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <button className="btn btn-danger w-100" onClick={exportCSV}>
              <FontAwesomeIcon icon={faFileCsv} className="me-2" />
              Export to CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="row mb-4 g-3 shadow pb-3 px-3 bg-body rounded-3 ">
          <div className="col-md-4">
            <div className="card shadow-sm border-success hover_effect ">
              <div className="card-body text-success text-center ">
                <h5>Total Income</h5>
                {loading ? (
                  <div className="placeholder-glow">
                    <span className="placeholder col-6"></span>
                  </div>
                ) : (
                  <h3 className="fw-bold">RM {stats.totalIncome.toFixed(2)}</h3>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card shadow-sm border-primary hover_effect">
              <div className="card-body text-primary text-center">
                <h5>Completed Orders</h5>
                {loading ? (
                  <div className="placeholder-glow">
                    <span className="placeholder col-6"></span>
                  </div>
                ) : (
                  <h3 className="fw-bold">{stats.totalOrders}</h3>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card shadow-sm border-danger hover_effect">
              <div className="card-body text-danger text-center">
                <h5>Cancelled Orders</h5>
                {loading ? (
                  <div className="placeholder-glow">
                    <span className="placeholder col-6"></span>
                  </div>
                ) : (
                  <h3 className="fw-bold">{stats.cancelledOrders}</h3>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 mt-3">
          <label>Group Orders By</label>
          <select
            className="form-select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="my-3 shadow p-3 bg-body rounded-3 hover_effect ">
          <h4>
            {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} Income Summary
          </h4>
          {loading ? (
            <div className="placeholder-glow">
              <span class="placeholder w-75"></span>
              <span class="placeholder w-25 "></span>
              <span class="placeholder w-50"></span>
            </div>
          ) : (
            <table className="table table-striped">
              <thead className="table-light">
                <tr>
                  <th>{groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</th>
                  <th>Total Income</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedTotals).map(([key, total], idx) => (
                  <tr key={idx}>
                    <td>{key}</td>
                    <td>RM {total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top Restaurants */}
        <div className="mb-4 shadow p-3 bg-body rounded-3 hover_effect">
          <h4>Top Restaurants by Revenue</h4>
          {loading ? (
            <div className="placeholder-glow">
              <span class="placeholder w-100"></span>
            </div>
          ) : (
            <ul className="list-group">
              {stats.topRestaurants.map((rest, idx) => (
                <li
                  key={idx}
                  className="list-group-item d-flex justify-content-between"
                >
                  <strong>{rest.name}</strong>
                  <span>RM {rest.total}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Items */}
        <div className="mb-5 shadow p-3 bg-body rounded-3 hover_effect">
          <h4>Top 5 Sold Items</h4>
          {loading ? (
            <div className="placeholder-glow">
              <span class="placeholder w-100"></span>
              <span class="placeholder w-75"></span>
              <span class="placeholder w-50"></span>
            </div>
          ) : (
            <ul className="list-group">
              {stats.topItems.map((item, idx) => (
                <li
                  key={idx}
                  className="list-group-item d-flex justify-content-between"
                >
                  <strong>{item.name}</strong>
                  <span>{item.quantity} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Summary Users */}
        <h4>User Summary</h4>
        <div className="mt-2 shadow p-3 bg-body rounded-3 hover_effect">
          <div className="row g-3 justify-content-between d-flex">
            <div className="col-md-2 ">
              <div className="card text-center border-dark hover_effect">
                <div className="card-body ">
                  <h6>Total Users</h6>
                  {loading ? (
                    <div className="placeholder-glow">
                      <span class="placeholder col-6"></span>
                    </div>
                  ) : (
                    <h3>{userStats.total}</h3>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card text-center border-primary hover_effect">
                <div className="card-body">
                  <h6>Admins</h6>
                  {loading ? (
                    <div className="placeholder-glow">
                      <span class="placeholder col-6"></span>
                    </div>
                  ) : (
                    <h3>{userStats.admin}</h3>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card text-center border-warning hover_effect">
                <div className="card-body">
                  <h6>Restaurants</h6>
                  {loading ? (
                    <div className="placeholder-glow">
                      <span class="placeholder col-6"></span>
                    </div>
                  ) : (
                    <h3>{userStats.restaurant}</h3>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card text-center border-secondary hover_effect">
                <div className="card-body">
                  <h6>Restaurant Staff</h6>
                  {loading ? (
                    <div className="placeholder-glow">
                      <span className="placeholder col-6"></span>
                    </div>
                  ) : (
                    <h3>{userStats.restaurantStaff}</h3>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-2">
              <div className="card text-center border-info hover_effect">
                <div className="card-body">
                  <h6>Regular Users</h6>
                  {loading ? (
                    <div className="placeholder-glow">
                      <span class="placeholder col-6"></span>
                    </div>
                  ) : (
                    <h3>{userStats.users}</h3>
                  )}
                </div>
              </div>
            </div>
          </div>

          <h5 className="mt-4">Latest Registered Users</h5>
          {loading ? (
            <div className="placeholder-glow">
              <span class="placeholder col-6"></span>
              <span class="placeholder col-12"></span>
              <span class="placeholder col-6"></span>
              <span class="placeholder col-4"></span>
            </div>
          ) : (
            <ul className="list-group">
              {userStats.latest.map((user, idx) => (
                <li
                  key={idx}
                  className="list-group-item d-flex justify-content-between"
                >
                  <span>{user.name}</span>
                  <span className="text-muted">{user.userRole}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReportPage;
