const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservation.controller');

// Create new reservation
router.post('/', reservationController.createReservation);

// Get all reservations
router.get('/', reservationController.getAllReservations);

// Get reservation by ID
router.get('/:id', reservationController.getReservation);

// Update reservation status
router.patch('/:id/status', reservationController.updateReservationStatus);

module.exports = router;