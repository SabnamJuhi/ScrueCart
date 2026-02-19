const express = require("express");
const router = express.Router();
const {
  sendContactEnquiry,
} = require("../../controllers/contact/contact.controller");

router.post("/", sendContactEnquiry);

module.exports = router;
