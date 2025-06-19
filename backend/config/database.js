const mongoose = require("mongoose");

module.exports.connectToDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("successfully connect to database");
    } catch (error) {
        console.log(error);
    }
};