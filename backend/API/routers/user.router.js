const express = require("express");


const router = new express.Router();
const controller = require("../../controller/user.controller");

router.get("/test", controller.test);
router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/logout", controller.logout);



module.exports = router;