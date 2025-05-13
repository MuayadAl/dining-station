function CardSkeletonFallback() {
  return (
    <div className="container p-5 text-center">
      <div className="row justify-content-center">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="col-lg-3 col-md-6 mb-4 shimmer">
            <div className="restaurant_card placeholder-glow">
              <div className="restaurant_img bg-secondary placeholder" style={{ height: "200px", width: "100%" }}></div>
              <div className="restaurant_box mt-2">
                <h3 className="types_text placeholder bg-secondary" style={{ height: "20px", width: "70%" }}></h3>
                <p className="looking_text placeholder bg-secondary" style={{ height: "14px", width: "90%" }}></p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CardSkeletonFallback;
