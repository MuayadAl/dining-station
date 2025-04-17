const express = require('express');
const router = express.Router();
const { createUserAsAdmin } = require('../controllers/adminController'); 
const adminController = require("../controllers/adminController");

router.post('/create-user', createUserAsAdmin);
router.post("/admin/deleteUser", adminController.deleteUserAccount); 




module.exports = router;