#!/usr/bin/env node

/**
 * Auto-cancel expired reservations script
 * 
 * Chạy script này định kỳ để tự động hủy các đặt bàn hết hạn
 * 
 * Usage:
 * node auto-cancel-expired-reservations.js
 * 
  * Cron job example (chạy mỗi 15 phút):
 * 0,15,30,45 * * * * cd /path/to/backend && node scripts/auto-cancel-expired-reservations.js >> logs/auto-cancel.log 2>&1
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Import models
const Reservation = require('../models/reservation.model');
const Table = require('../models/table.model');

// Import controller function
const { autoCancelExpiredReservations } = require('../controllers/reservation.controller');

async function runAutoCancelJob() {
    try {
        console.log('🚀 Starting auto-cancel job...');
        console.log('⏰ Time:', new Date().toLocaleString('vi-VN'));

        // Connect to database
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant', {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('✅ Connected to MongoDB');
        }

        // Run the auto-cancel function
        const result = await autoCancelExpiredReservations();

        if (result.success) {
            console.log(`📊 Job completed successfully - Cancelled: ${result.cancelledCount} reservations`);

            if (result.details && result.details.length > 0) {
                console.log('📋 Cancelled reservations details:');
                result.details.forEach(detail => {
                    console.log(`  - ${detail.customer || detail.contact_name} (${detail.date}) ${detail.slot || ''}`);
                });
            }
        } else {
            console.log('❌ Job failed:', result.message);
        }

        // Close database connection
        await mongoose.connection.close();
        console.log('📴 MongoDB connection closed');

        process.exit(0);

    } catch (error) {
        console.error('💥 Auto-cancel job failed:', error);

        // Close database connection on error
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }

        process.exit(1);
    }
}

// Handle process signals
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, gracefully shutting down...');
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, gracefully shutting down...');
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }
    process.exit(0);
});

// Run the job
runAutoCancelJob(); 