import "../style/styleSheet.css";
import "../style/responsive.css";
import "bootstrap/dist/css/bootstrap.min.css";

import React, { useState, useEffect } from "react";
import { auth, db } from "../../models/firebase"; // Import Firebase
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import useAlert from "../../hooks/userAlert"; // ✅ Import the alert hook

function Contact() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [subject, setSubject] = useState(""); // ✅ New Subject Field
  const [userMessage, setUserMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errors, setErrors] = useState({}); // ✅ Store errors for each field

  const { confirmAction, showSuccess, showError } = useAlert(); // ✅ Use alert functions

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserEmail(user.email || ""); // Get email from authentication

        try {
          // ✅ Fetch user's name from Firestore
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setUserName(userDoc.data().name || ""); // Fetch name from Firestore
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Validation Function
  const validateForm = () => {
    let newErrors = {};
    if (!userName.trim()) newErrors.userName = "Name is required.";
    if (!userEmail.trim()) newErrors.userEmail = "Email is required.";
    if (!subject.trim()) newErrors.subject = "Subject is required."; // ✅ Subject validation
    if (!userMessage.trim()) newErrors.userMessage = "Message is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Function to Send Message with Validation & Confirmation Alert
  const sendMessage = async () => {
    if (!validateForm()) {
      showError("Please fill in all required fields.");
      return;
    }

    const isConfirmed = await confirmAction(
      "Confirm Message Submission",
      "Are you sure you want to send this message?",
      "Yes, Send Message"
    );

    if (!isConfirmed) return; // ❌ Stop if user cancels

    setIsSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        name: userName,
        email: userEmail,
        phone: userPhone || "N/A",
        subject: subject, // ✅ Store subject in Firestore
        message: userMessage,
        timestamp: new Date(),
      });

      showSuccess("Message sent successfully!");
      setUserPhone("");
      setSubject(""); // ✅ Clear subject field
      setUserMessage("");
      setErrors({}); // ✅ Reset error messages
    } catch (error) {
      showError("Error sending message. Please try again.");
    }
    setIsSending(false);
  };

  return (
    <div className="contact_section layout_padding pb-2">
      <div className="container">
        <div className="row">
          <div className="col-sm-12">
            <h1 className="contact_taital">Get In Touch</h1>
          </div>
        </div>
      </div>
      <div className="container-fluid">
        <div className="contact_section_2">
          <div className="row">
            <div className="col-md-12">
              <div className="mail_section_1">
                {/* Name Field */}
                <input
                  type="text"
                  className={`mail_text ${errors.userName ? "border-danger" : ""}`}
                  placeholder="Your Name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                {errors.userName && <small className="text-danger">{errors.userName}</small>}

                {/* Email Field */}
                <input
                  type="text"
                  className={`mail_text ${errors.userEmail ? "border-danger" : ""}`}
                  placeholder="Your Email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
                {errors.userEmail && <small className="text-danger">{errors.userEmail}</small>}

                {/* Phone Field */}
                <input
                  type="text"
                  className="mail_text"
                  placeholder="Your Phone"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                />

                {/* ✅ Subject Field (New) */}
                <input
                  type="text"
                  className={`mail_text ${errors.subject ? "border-danger" : ""}`}
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                {errors.subject && <small className="text-danger">{errors.subject}</small>}

                {/* Message Field */}
                <textarea
                  className={`massage-bt ${errors.userMessage ? "border-danger" : ""}`}
                  placeholder="Message"
                  rows="5"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                ></textarea>
                {errors.userMessage && <small className="text-danger">{errors.userMessage}</small>}

                {/* Send Button */}
                <div className="send_bt">
                  <button
                    onClick={sendMessage}
                    className="btn"
                    disabled={isSending}
                  >
                    {isSending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
