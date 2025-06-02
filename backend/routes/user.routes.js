const express = require("express");


const router = new express.Router();
const controller = require("../controller/user.controller");

router.get("/test", controller.test);



module.exports = router;