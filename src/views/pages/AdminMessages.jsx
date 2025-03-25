import React, { useState, useEffect } from "react";
import "../style/styleSheet.css";
import "../style/responsive.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { db } from "../../models/firebase"; // Import Firebase
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import useAlert from "../../hooks/userAlert"; // ✅ Import the alert hook

function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const { showError } = useAlert(); // ✅ Use alert functions

  // ✅ Fetch messages from Firestore
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const messagesRef = collection(db, "messages");
        const q = query(messagesRef, orderBy("timestamp", "desc")); // Order by latest messages
        const querySnapshot = await getDocs(q);

        const messagesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMessages(messagesData);
      } catch (error) {
        console.error("Error fetching messages:", error);
        showError("Failed to fetch messages. Please try again.");
      }
      setLoading(false);
    };

    fetchMessages();
  }, []);

  return (
    <div className="container-fluid float-start px-5 min-vh-100">
      <h1 className="text-center my-4">User Messages</h1>
      <form className="d-flex my-2 w-50 mx-auto" role="search">
        <input
          className="form-control me-2"
          type="search"
          placeholder="Search"
          aria-label="Search"
        />
        <button className="btn btn-outline-success" type="submit">
          Search
        </button>
      </form>

      {loading ? (
        <div className="  justify-content-center align-items-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <p className="text-center text-muted">No messages available.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-dark">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id}>
                  <td>{msg.name}</td>
                  <td>{msg.email}</td>
                  <td>{msg.phone}</td>
                  <td>{msg.subject}</td>
                  <td>{msg.message}</td>
                  <td>{new Date(msg.timestamp.toDate()).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminMessages;
