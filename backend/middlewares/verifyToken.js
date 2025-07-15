const jwt = require('jsonwebtoken');
const httpErrors = require('http-errors');
const User = require('../models/user.model');

const verifyToken = async (req, res, next) => {
    try {
        const receiveToken = req.headers["x-access-token"] || req.headers["authorization"]?.split(" ")[1];

        if (!receiveToken) {
            throw httpErrors.BadRequest("No token provide");
        }

        jwt.verify(receiveToken, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).send({ message: "Unauthorized!" });
            }

            // Check if user is active
            const user = await User.findById(decoded.userId);
            if (!user || user.status === 'inactive') {
                return res.status(403).send({
                    message: "Tài khoản của bạn đã bị khóa",
                    inactive: true
                });
            }

            req.userId = decoded.userId;
            // req.role = decoded.role;
            next();
        })
    } catch (error) {
        next(httpErrors.Unauthorized());
    }
};

module.exports = verifyToken;