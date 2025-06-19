const BookingSlot = require('../models/BookingSlot');

// Lấy tất cả booking slots
const getBookingSlots = async (req, res) => {
    try {
        const bookingSlots = await BookingSlot.find()
            .sort({ number: 1 });

        res.status(200).json({
            success: true,
            data: bookingSlots
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách khung giờ',
            error: error.message
        });
    }
};

// Lấy chi tiết booking slot
const getBookingSlotById = async (req, res) => {
    try {
        const bookingSlot = await BookingSlot.findById(req.params.id);

        if (!bookingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy khung giờ'
            });
        }

        res.status(200).json({
            success: true,
            data: bookingSlot
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin khung giờ',
            error: error.message
        });
    }
};

// Tạo booking slot mới
const createBookingSlot = async (req, res) => {
    try {
        const { number, name, start_time, end_time, description } = req.body;

        // Kiểm tra thông tin bắt buộc
        if (!number || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        // Kiểm tra trùng lặp
        const existingSlot = await BookingSlot.findOne({
            $or: [
                { number },
                { start_time, end_time }
            ]
        });

        if (existingSlot) {
            return res.status(400).json({
                success: false,
                message: 'Khung giờ đã tồn tại'
            });
        }

        const bookingSlot = new BookingSlot({
            number,
            name: name || `Slot ${number}`,
            start_time,
            end_time,
            description
        });

        await bookingSlot.save();

        res.status(201).json({
            success: true,
            message: 'Tạo khung giờ thành công',
            data: bookingSlot
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo khung giờ',
            error: error.message
        });
    }
};

// Cập nhật booking slot
const updateBookingSlot = async (req, res) => {
    try {
        const { number, name, start_time, end_time, description } = req.body;

        // Kiểm tra quyền admin/manager
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền thực hiện thao tác này'
            });
        }

        const bookingSlot = await BookingSlot.findById(req.params.id);
        if (!bookingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy khung giờ'
            });
        }

        // Kiểm tra trùng lặp
        if (number && number !== bookingSlot.number) {
            const existingSlot = await BookingSlot.findOne({
                number,
                _id: { $ne: req.params.id }
            });

            if (existingSlot) {
                return res.status(400).json({
                    success: false,
                    message: 'Số thứ tự khung giờ đã tồn tại'
                });
            }
        }

        if (start_time && end_time && (start_time !== bookingSlot.start_time || end_time !== bookingSlot.end_time)) {
            const existingSlot = await BookingSlot.findOne({
                start_time,
                end_time,
                _id: { $ne: req.params.id }
            });

            if (existingSlot) {
                return res.status(400).json({
                    success: false,
                    message: 'Khung giờ đã tồn tại'
                });
            }
        }

        const updatedBookingSlot = await BookingSlot.findByIdAndUpdate(
            req.params.id,
            {
                ...(number && { number }),
                ...(name && { name }),
                ...(start_time && { start_time }),
                ...(end_time && { end_time }),
                ...(description !== undefined && { description }),
                updated_at: new Date()
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Cập nhật khung giờ thành công',
            data: updatedBookingSlot
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật khung giờ',
            error: error.message
        });
    }
};

// Xóa booking slot
const deleteBookingSlot = async (req, res) => {
    try {
        // Kiểm tra quyền admin
        if (!['admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ admin mới có quyền xóa khung giờ'
            });
        }

        const bookingSlot = await BookingSlot.findById(req.params.id);
        if (!bookingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy khung giờ'
            });
        }

        // Kiểm tra xem có reservation nào đang sử dụng slot này không
        const Reservation = require('../models/reservation.model');
        const hasReservations = await Reservation.findOne({ slot_id: req.params.id });

        if (hasReservations) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa khung giờ đã có đặt bàn'
            });
        }

        await BookingSlot.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Xóa khung giờ thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa khung giờ',
            error: error.message
        });
    }
};

module.exports = {
    getBookingSlots,
    getBookingSlotById,
    createBookingSlot,
    updateBookingSlot,
    deleteBookingSlot
}; 