import { useState } from "react";
import "../style/styleSheet.css";
import aboutPic from "../../assets/my-pic.jpeg";
import "bootstrap/dist/css/bootstrap.min.css";

function About() {
    const [showMore, setShowMore] = useState(false);

    const toggleReadMore = (e) => {
        e.preventDefault();
        setShowMore(!showMore);
    };

    return (
        <div className="about_section layout_padding">
            <div className="container">
                <div className="about_section_2">
                    <div className="row">
                        <div className="col-md-6"> 
                            <div className="about_taital_box">
                                <h1 className="about_taital">About my FYP</h1>
                                <h1 className="about_taital_1">Dining Station'</h1>
                                <p className="about_text">
                                    Dining Station is a web-based food ordering system developed to improve dining efficiency at Asia Pacific University of Technology & Innovation (APU). It allows students and staff to pre-order meals, track order status in real-time, and pay at the restaurant using their university ID card or credit card. The system helps reduce queues, manage resources better, and improve the overall dining experience.
                                    {showMore && (
                                        <>
                                            {" "}
                                            It was built using React and Firebase Firestore, allowing real-time updates and secure access. Admins can manage restaurants, menu items, and access reports, while restaurant staff handle orders and payments with minimal delays. The system supports APU's commitment to innovation, accessibility, and operational efficiency, and aligns with SDG 9 by promoting sustainable infrastructure.
                                        </>
                                    )}
                                </p>
                                <div className="readmore_btn">
                                    <a href="#" onClick={toggleReadMore}>
                                        {showMore ? "Read Less" : "Read More"}
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6"> 
                            <div className="">
                                <img src={aboutPic} className="about_img" alt="About Dining Station" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default About;
