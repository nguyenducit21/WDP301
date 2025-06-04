const User = require("../models/user.model");

const test = async (req, res) => {
    try {
        res.status(200).json("test api")
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

module.exports = { test }