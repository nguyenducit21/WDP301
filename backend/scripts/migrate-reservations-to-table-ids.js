const mongoose = require('mongoose');
const Reservation = require('../models/reservation.model');
require('dotenv').config();

async function migrateReservationsToTableIds() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db');
        console.log('Connected to MongoDB');

        // Find all reservations that have table_id but no table_ids
        const reservations = await Reservation.find({
            table_id: { $exists: true, $ne: null },
            $or: [
                { table_ids: { $exists: false } },
                { table_ids: { $size: 0 } }
            ]
        });

        console.log(`Found ${reservations.length} reservations to migrate`);

        let updatedCount = 0;
        for (const reservation of reservations) {
            try {
                // Set table_ids to contain the table_id
                reservation.table_ids = [reservation.table_id];
                await reservation.save();
                updatedCount++;
                console.log(`Updated reservation ${reservation._id}: table_id ${reservation.table_id} -> table_ids [${reservation.table_id}]`);
            } catch (error) {
                console.error(`Error updating reservation ${reservation._id}:`, error.message);
            }
        }

        console.log(`Successfully migrated ${updatedCount} reservations`);

        // Also update reservations that have table_ids but no table_id (for backward compatibility)
        const reservationsWithoutTableId = await Reservation.find({
            table_ids: { $exists: true, $ne: [] },
            $or: [
                { table_id: { $exists: false } },
                { table_id: null }
            ]
        });

        console.log(`Found ${reservationsWithoutTableId.length} reservations without table_id to fix`);

        let fixedCount = 0;
        for (const reservation of reservationsWithoutTableId) {
            try {
                // Set table_id to the first table in table_ids
                reservation.table_id = reservation.table_ids[0];
                await reservation.save();
                fixedCount++;
                console.log(`Fixed reservation ${reservation._id}: table_id set to ${reservation.table_ids[0]}`);
            } catch (error) {
                console.error(`Error fixing reservation ${reservation._id}:`, error.message);
            }
        }

        console.log(`Successfully fixed ${fixedCount} reservations`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the migration
migrateReservationsToTableIds(); 