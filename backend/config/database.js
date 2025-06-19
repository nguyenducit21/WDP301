const mongoose = require("mongoose");

module.exports.connectToDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("successfully connect to database");
    } catch (error) {
        console.log(error);
    }
};