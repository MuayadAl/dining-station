
function Footer() {
  return (
    <footer className="mt-auto">
      <div className="footer_section layout_padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="footer_social_icon my-2">
                <ul>
                  <li>
                    <a
                      href="https://www.facebook.com/apuniversity"
                      target="_blank"
                    >
                      <i className="fa fa-facebook" aria-hidden="true"></i>
                    </a>
                  </li>
                  <li>
                    <a href="https://x.com/AsiaPacificU" target="_blank">
                      <i className="fa fa-twitter" aria-hidden="true"></i>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://my.linkedin.com/in/muayad-alsweydan"
                      target="_blank"
                    >
                      <i className="fa fa-linkedin" aria-hidden="true"></i>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.instagram.com/asiapacificuniversity/"
                      target="_blank"
                    >
                      <i className="fa fa-instagram" aria-hidden="true"></i>
                    </a>
                  </li>
                </ul>
              </div>
              <div className="location_text">
                <ul>
                  <li>
                    <a href="tel:+60176593534">
                      <i className="fa fa-phone" aria-hidden="true"></i>
                      <span className="padding_left_10">+60176593534</span>
                    </a>
                  </li>
                  <li>
                    <a href="mailto:mjssw24@gmail.com">
                      <i className="fa fa-envelope" aria-hidden="true"></i>
                      <span className="padding_left_10">mjssw24@gmail.com</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        {/* footer section end  */}
        {/* copyright section start  */}
        <div className="copyright_section">
          <div className="container">
            <div className="row">
              <div className="col-sm-12">
                <p className="copyright_text m-2 p-2 text-wrap">
                  &copy; {new Date().getFullYear()} All Rights Reserved.
                  Designed by Muayad Alsweydan for the Final Year Project
                  in Software Engineering at APU University, Malaysia.
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* copyright section end  */}
      </div>
    </footer>
  );
}
export default Footer;
