import React, { useState, useEffect } from "react";
import "../style/styleSheet.css";
import "../style/responsive.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { db } from "../../models/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import useAlert from "../../hooks/userAlert";

function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("new"); // 'new' | 'responded'
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' | 'desc'

  const { showError, showSuccess } = useAlert();

  const fetchMessages = async (order = "desc") => {
    setLoading(true);
    try {
      const messagesRef = collection(db, "messages");
      const q = query(messagesRef, orderBy("timestamp", order));
      const querySnapshot = await getDocs(q);

      const messagesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        responded: false,
        ...doc.data(),
      }));

      setMessages(messagesData);
    } catch (error) {
      console.error("Error fetching messages:", error);
      showError("Failed to fetch messages. Please try again.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages(sortOrder);
  }, [sortOrder]);

  const handleMarkAsResponded = async (msgId) => {
    try {
      const msgRef = doc(db, "messages", msgId);
      await updateDoc(msgRef, { responded: true });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === msgId ? { ...msg, responded: true } : msg
        )
      );
      showSuccess("Message marked as responded.");
    } catch (error) {
      console.error("Error updating message:", error);
      showError("Failed to update message status.");
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const searchMatch = [msg.name, msg.email, msg.subject].some((field) =>
      field?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const tabFilter =
      activeTab === "responded"
        ? msg.responded === true
        : msg.responded !== true;
    return searchMatch && tabFilter;
  });

  return (
    <div className="container-fluid px-4 py-4">
      <h2 className="text-center mb-4">User Messages</h2>

      {/* Search Section - Full Width */}
      <div className="d-flex justify-content-center align-items-center mb-3">
        <div className="input-group w-50">
          <input
            className="form-control"
            type="text"
            placeholder="Search by name, email, or subject"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="input-group-text bg-dark text-white">
            <i className="fa fa-search"></i>
          </span>
        </div>
      </div>

      {/* Sort Section - Separate Line, Aligned Left */}
      <div
        className="mb-4 d-flex align-items-center"
        style={{ maxWidth: "200px" }}
      >
        <label className="form-label fw-semibold me-2 mb-0 d-flex align-items-center">
          <i
            className={`me-1 ${
              sortOrder === "desc"
                ? "fa fa-sort-amount-down"
                : "fa fa-sort-amount-up"
            }`}
          ></i>
          Sort
        </label>
        <select
          className="form-select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs justify-content-center mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "new" ? "active" : ""}`}
            onClick={() => setActiveTab("new")}
          >
            New Messages
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "responded" ? "active" : ""}`}
            onClick={() => setActiveTab("responded")}
          >
            Responded Messages
          </button>
        </li>
      </ul>

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : filteredMessages.length === 0 ? (
        <p className="text-center text-muted">No messages found.</p>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 g-4">
          {filteredMessages.map((msg) => (
            <div className="col" key={msg.id}>
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">{msg.subject}</h5>
                  <p className="card-text mb-1">
                    <strong>Name:</strong> {msg.name}
                  </p>
                  <p className="card-text mb-1">
                    <strong>Email:</strong> {msg.email}
                  </p>
                  <p className="card-text mb-1">
                    <strong>Phone:</strong> {msg.phone}
                  </p>
                  <p className="card-text">
                    <strong>Message:</strong> {msg.message}
                  </p>
                  <p className="text-muted small">
                    {new Date(msg.timestamp?.toDate()).toLocaleString()}
                  </p>
                </div>
                <div className="card-footer bg-transparent border-top-0">
                  {msg.responded ? (
                    <span className="badge bg-success">Responded</span>
                  ) : (
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleMarkAsResponded(msg.id)}
                    >
                      Mark as Responded
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminMessages;
