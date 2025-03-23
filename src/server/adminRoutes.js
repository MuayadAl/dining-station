const express = require('express');
const router = express.Router();
const { createUserAsAdmin } = require('../controllers/adminController'); 

router.post('/create-user', createUserAsAdmin);

module.exports = router;
