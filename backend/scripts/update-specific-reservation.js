const mongoose = require('mongoose');
const Reservation = require('../models/reservation.model');
require('dotenv').config();

async function updateSpecificReservation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db');
        console.log('Connected to MongoDB');

        const reservationId = '685470a8e6b683098107876a';
        const tableIds = ['6854553f2e8c2015775548b8', '685455432e8c2015775548c4'];

        const reservation = await Reservation.findById(reservationId);
        if (reservation) {
            reservation.table_ids = tableIds;
            await reservation.save();
            console.log('Updated reservation:', reservationId);
            console.log('table_ids:', reservation.table_ids);
        } else {
            console.log('Reservation not found');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

updateSpecificReservation(); 