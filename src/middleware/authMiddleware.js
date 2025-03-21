// Dummy auth middleware – replace with Firebase Auth integration if needed
function isRestaurant(req, res, next) {
    if (req.user && req.user.role === "restaurant") {
        return next();
    }
    return res.status(403).json({ error: "Access denied: Restaurant only" });
}

function isAdmin(req, res, next) {
    if (req.user && req.user.role === "admin") {
        return next();
    }
    return res.status(403).json({ error: "Access denied: Admin only" });
}

module.exports = {
    isRestaurant,
    isAdmin
};
