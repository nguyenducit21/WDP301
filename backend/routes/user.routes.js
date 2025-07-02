const express = require("express");


const router = new express.Router();
const controller = require("../controllers/user.controller");

router.get("/test", controller.test);
router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/logout", controller.logout);
router.put("/update-profile", controller.updateProfile);
router.put("/change-password", controller.changePassword);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);

module.exports = router;