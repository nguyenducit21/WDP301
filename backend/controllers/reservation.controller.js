const Reservation = require('../models/reservation.model');
const Table = require('../models/table.model');

// Create new reservation
exports.createReservation = async (req, res) => {
    try {
        const {
            table_id,
            date,
            time,
            guest_count,
            contact_name,
            contact_phone,
            contact_email,
            pre_order_items
        } = req.body;

        // Validate required fields
        if (!table_id || !date || !time || !guest_count || !contact_name || !contact_phone) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
        }

        // Check if table exists and is available
        const table = await Table.findById(table_id);
        if (!table) {
            return res.status(404).json({ message: 'Không tìm thấy bàn' });
        }

        // Check if table is available for the selected time
        const existingReservation = await Reservation.findOne({
            table_id,
            date,
            time,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingReservation) {
            return res.status(400).json({ message: 'Bàn này đã được đặt cho thời gian này' });
        }

        // Create new reservation
        const reservation = new Reservation({
            table_id,
            date,
            time,
            guest_count,
            contact_name,
            contact_phone,
            contact_email,
            pre_order_items: pre_order_items || [],
            status: 'pending',
            payment_status: 'pending'
        });

        const savedReservation = await reservation.save();

        // Update table status
        table.status = 'reserved';
        await table.save();

        res.status(201).json(savedReservation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all reservations
exports.getAllReservations = async (req, res) => {
    try {
        const reservations = await Reservation.find()
            .populate('table_id', 'name area_id')
            .populate('pre_order_items.menu_item_id', 'name price')
            .sort({ date: 1, time: 1 });
        res.json(reservations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get reservation by ID
exports.getReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id)
            .populate('table_id', 'name area_id')
            .populate('pre_order_items.menu_item_id', 'name price');

        if (!reservation) {
            return res.status(404).json({ message: 'Không tìm thấy đặt bàn' });
        }

        res.json(reservation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update reservation status
exports.updateReservationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ message: 'Không tìm thấy đặt bàn' });
        }

        // Update reservation status
        reservation.status = status;
        await reservation.save();

        // If reservation is cancelled or completed, update table status
        if (status === 'cancelled' || status === 'completed') {
            const table = await Table.findById(reservation.table_id);
            if (table) {
                table.status = 'available';
                await table.save();
            }
        }

        res.json(reservation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};