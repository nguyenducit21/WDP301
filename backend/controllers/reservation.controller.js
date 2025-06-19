const Reservation = require('../models/reservation.model');
const Table = require('../models/table.model');
const Area = require('../models/area.model');
const MenuItem = require('../models/menuItems.model');
const Log = require('../models/log.model');
const mongoose = require('mongoose');

// Lấy tất cả đặt bàn
const getReservations = async (req, res) => {
    try {
        const {
            status,
            date,
            table_id,
            page = 1,
            limit = 10,
            sort = '-created_at'
        } = req.query;

        let filter = {};
        if (status) filter.status = status;
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            filter.date = { $gte: startDate, $lt: endDate };
        }
        if (table_id) filter.table_id = table_id;

        const reservations = await Reservation.find(filter)
            .populate('customer_id', 'username full_name email phone')
            .populate('table_id', 'name capacity')
            .populate('pre_order_items.menu_item_id', 'name price')
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Reservation.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: reservations,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalReservations: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đặt bàn',
            error: error.message
        });
    }
};

// Lấy chi tiết đặt bàn
const getReservationById = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id)
            .populate('customer_id', 'username full_name email phone')
            .populate('table_id', 'name capacity area_id')
            .populate('pre_order_items.menu_item_id', 'name price category');

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        res.status(200).json({
            success: true,
            data: reservation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin đặt bàn',
            error: error.message
        });
    }
};

// Lấy danh sách bàn có sẵn theo khu vực và thời gian
const getAvailableTables = async (req, res) => {
    try {
        const { area_id, date, time, end_time, guest_count, type } = req.query;

        if (!date || !time || !end_time) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp ngày, giờ bắt đầu và giờ kết thúc đặt bàn'
            });
        }

        // Tìm các bàn đã được đặt trùng khung giờ
        const existingReservations = await Reservation.find({
            date: date,
            status: { $in: ['pending', 'confirmed'] },
            $expr: {
                $and: [
                    { $lt: ["$time", end_time] }, // reservation.time < new end_time
                    { $gt: ["$end_time", time] }  // reservation.end_time > new time
                ]
            }
        }).select('table_id');

        const reservedTableIds = existingReservations.map(r => r.table_id);

        // Tìm các bàn có sẵn
        let query = {
            _id: { $nin: reservedTableIds },
            status: 'available'
        };

        if (area_id) {
            query.area_id = area_id;
        }

        if (guest_count) {
            query.capacity = { $gte: parseInt(guest_count) };
        }

        if (type) {
            query.type = type;
        }

        const availableTables = await Table.find(query)
            .populate('area_id', 'name description')
            .sort({ capacity: 1 });

        res.status(200).json({
            success: true,
            data: availableTables
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bàn có sẵn',
            error: error.message
        });
    }
};

// Tạo đặt bàn mới
const createReservation = async (req, res) => {
    try {
        const {
            table_id,
            date,
            time,
            end_time,
            guest_count,
            contact_name,
            contact_phone,
            contact_email,
            pre_order_items,
            notes
        } = req.body;

        // Kiểm tra thông tin bắt buộc
        if (!table_id || !date || !time || !end_time || !contact_name || !contact_phone) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        // Kiểm tra bàn có tồn tại và có sẵn không
        const table = await Table.findById(table_id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
            });
        }

        // Kiểm tra bàn có bị đặt trùng khung giờ không
        const overlapReservation = await Reservation.findOne({
            table_id,
            date,
            status: { $in: ['pending', 'confirmed'] },
            $expr: {
                $and: [
                    { $lt: ["$time", end_time] }, // reservation.time < new end_time
                    { $gt: ["$end_time", time] }  // reservation.end_time > new time
                ]
            }
        });

        if (overlapReservation) {
            return res.status(400).json({
                success: false,
                message: 'Bàn đã được đặt trong khung giờ này'
            });
        }

        // Kiểm tra pre-order items nếu có
        if (pre_order_items && pre_order_items.length > 0) {
            for (const item of pre_order_items) {
                const menuItem = await MenuItem.findById(item.menu_item_id);
                if (!menuItem) {
                    return res.status(400).json({
                        success: false,
                        message: `Không tìm thấy món ăn với ID: ${item.menu_item_id}`
                    });
                }
            }
        }

        // Tạo đặt bàn mới
        const reservation = new Reservation({
            customer_id: new mongoose.Types.ObjectId(req.body.customer_id),
            table_id,
            date,
            time,
            end_time,
            guest_count,
            contact_name,
            contact_phone,
            contact_email,
            pre_order_items,
            notes,
            status: 'pending'
        });

        await reservation.save();

        // Cập nhật trạng thái bàn
        await Table.findByIdAndUpdate(table_id, { status: 'reserved' });

        // Ghi log
        // await new Log({
        //     user_id: req.user._id,
        //     action: 'create',
        //     target_type: 'reservation',
        //     target_id: reservation._id,
        //     detail: 'Tạo đặt bàn mới'
        // }).save();

        // Populate thông tin bàn và khu vực
        await reservation.populate([
            { path: 'table_id', populate: { path: 'area_id' } },
            { path: 'pre_order_items.menu_item_id' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Đặt bàn thành công',
            data: reservation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đặt bàn',
            error: error.message
        });
    }
};

// Lấy danh sách đặt bàn của khách hàng
const getCustomerReservations = async (req, res) => {
    try {
        const reservations = await Reservation.find({ customer_id: req.user._id })
            .populate([
                { path: 'table_id', populate: { path: 'area_id' } },
                { path: 'pre_order_items.menu_item_id' }
            ])
            .sort({ date: -1, time: -1 });

        res.status(200).json({
            success: true,
            data: reservations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đặt bàn',
            error: error.message
        });
    }
};

// Cập nhật đặt bàn
const updateReservation = async (req, res) => {
    try {
        const {
            customer_id,
            table_id,
            date,
            time,
            guest_count,
            contact_name,
            contact_phone,
            contact_email,
            status,
            pre_order_items,
            deposit_amount,
            payment_status,
            notes
        } = req.body;

        const reservation = await Reservation.findById(req.params.id).populate('table_id');
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        // Kiểm tra quyền sửa đặt bàn
        const userRole = req.user.role;
        const userId = req.user.userId;

        if (userRole === 'customer') {
            if (reservation.customer_id && reservation.customer_id.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn chỉ có thể sửa đặt bàn của mình'
                });
            }
        }

        // Validation cơ bản
        if (contact_name && !contact_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Tên khách hàng không được để trống'
            });
        }

        if (contact_phone && !contact_phone.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại không được để trống'
            });
        }

        if (guest_count && guest_count < 1) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng khách phải lớn hơn 0'
            });
        }

        const finalGuestCount = guest_count || reservation.guest_count;
        const currentTable = reservation.table_id;

        // FIXED: Kiểm tra sức chứa của bàn hiện tại
        if (finalGuestCount > currentTable.capacity) {
            return res.status(400).json({
                success: false,
                message: `Bàn hiện tại chỉ có thể chứa tối đa ${currentTable.capacity} người`
            });
        }

        // FIXED: Chỉ kiểm tra "bàn mới" khi thực sự thay đổi bàn
        const currentTableId = reservation.table_id._id.toString();
        const isChangingTable = table_id && table_id !== currentTableId;

        if (isChangingTable) {
            const newTable = await Table.findById(table_id);
            if (!newTable) {
                return res.status(400).json({
                    success: false,
                    message: 'Bàn mới không tồn tại'
                });
            }

            if (newTable.status !== 'available') {
                return res.status(400).json({
                    success: false,
                    message: 'Bàn mới không khả dụng'
                });
            }

            // Kiểm tra sức chứa bàn mới
            if (finalGuestCount > newTable.capacity) {
                return res.status(400).json({
                    success: false,
                    message: `Bàn mới chỉ có thể chứa tối đa ${newTable.capacity} người`
                });
            }

            // Kiểm tra trùng thời gian với bàn mới
            const reservationDate = date ? new Date(date) : reservation.date;
            const reservationTime = time || reservation.time;

            const existingReservation = await Reservation.findOne({
                _id: { $ne: req.params.id },
                table_id: table_id,
                date: reservationDate,
                time: reservationTime,
                status: { $in: ['confirmed', 'pending'] }
            });

            if (existingReservation) {
                return res.status(400).json({
                    success: false,
                    message: 'Bàn mới đã được đặt vào thời gian này'
                });
            }

            // Cập nhật trạng thái bàn cũ và mới
            await Table.findByIdAndUpdate(currentTableId, {
                status: 'available',
                updated_at: new Date()
            });
            await Table.findByIdAndUpdate(table_id, {
                status: 'reserved',
                updated_at: new Date()
            });
        }

        // FIXED: Nếu hủy đặt bàn, cập nhật trạng thái bàn (chỉ khi không đổi bàn)
        if (status && ['cancelled', 'no_show'].includes(status) && !isChangingTable) {
            await Table.findByIdAndUpdate(currentTableId, {
                status: 'available',
                updated_at: new Date()
            });
        }

        // Xác định data cần update
        let updateData = {
            ...(customer_id !== undefined && { customer_id }),
            ...(isChangingTable && { table_id }), // Chỉ update table_id khi thực sự đổi bàn
            ...(date && { date: new Date(date) }),
            ...(time && { time }),
            ...(guest_count && { guest_count }),
            ...(contact_name && { contact_name }),
            ...(contact_phone && { contact_phone }),
            ...(contact_email !== undefined && { contact_email }),
            ...(status && { status }),
            ...(pre_order_items && { pre_order_items }),
            ...(deposit_amount !== undefined && { deposit_amount }),
            ...(payment_status && { payment_status }),
            ...(notes !== undefined && { notes }),
            updated_at: new Date()
        };

        // Nếu nhân viên update, ghi nhận thông tin
        if (['admin', 'manager', 'staff'].includes(userRole)) {
            if (!reservation.created_by_staff) {
                updateData.created_by_staff = userId;
            }
        }

        const updatedReservation = await Reservation.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate([
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'created_by_staff', select: 'username full_name' },
            { path: 'pre_order_items.menu_item_id', select: 'name price' }
        ]);

        res.status(200).json({
            success: true,
            message: ['admin', 'manager', 'waiter'].includes(userRole)
                ? 'Nhân viên cập nhật đặt bàn thành công'
                : 'Cập nhật đặt bàn thành công',
            data: updatedReservation
        });
    } catch (error) {
        console.error('Error in updateReservation:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật đặt bàn',
            error: error.message
        });
    }
};

// Hủy đặt bàn
const cancelReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        // Kiểm tra quyền hủy đặt bàn
        const userRole = req.user.role;
        const userId = req.user.userId;

        if (userRole === 'customer') {
            // Khách chỉ có thể hủy đặt bàn của mình
            if (reservation.customer_id && reservation.customer_id.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn chỉ có thể hủy đặt bàn của mình'
                });
            }

            // Khách chỉ có thể hủy đặt bàn có status pending hoặc confirmed
            if (!['pending', 'confirmed'].includes(reservation.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể hủy đặt bàn này'
                });
            }

            // Khách không thể hủy đặt bàn quá gần giờ đặt (ví dụ: trước 2 tiếng)
            const reservationDateTime = new Date(`${reservation.date.toISOString().split('T')[0]}T${reservation.time}`);
            const now = new Date();
            const timeDiff = reservationDateTime.getTime() - now.getTime();
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (hoursDiff < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể hủy đặt bàn trong vòng 2 tiếng trước giờ đặt'
                });
            }
        }

        // Nhân viên có thể hủy tất cả đặt bàn
        // Kiểm tra đặt bàn đã bị hủy chưa
        if (reservation.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Đặt bàn này đã được hủy trước đó'
            });
        }

        // Chỉ có thể hủy đặt bàn có status pending, confirmed
        if (!['pending', 'confirmed'].includes(reservation.status)) {
            return res.status(400).json({
                success: false,
                message: 'Không thể hủy đặt bàn này do trạng thái hiện tại'
            });
        }

        // Cập nhật trạng thái bàn về available (chỉ khi bàn đang reserved)
        if (reservation.table_id) {
            const table = await Table.findById(reservation.table_id);
            if (table && table.status === 'reserved') {
                await Table.findByIdAndUpdate(reservation.table_id, {
                    status: 'available',
                    updated_at: new Date()
                });
            }
        }

        // TẤT CẢ đều chỉ update status thành cancelled, KHÔNG XÓA
        const updatedReservation = await Reservation.findByIdAndUpdate(
            req.params.id,
            {
                status: 'cancelled',
                updated_at: new Date()
            },
            { new: true }
        ).populate([
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'created_by_staff', select: 'username full_name' }
        ]);

        res.status(200).json({
            success: true,
            message: userRole === 'customer'
                ? 'Hủy đặt bàn thành công'
                : 'Nhân viên hủy đặt bàn thành công',
            data: updatedReservation
        });
    } catch (error) {
        console.error('Error in deleteReservation:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy đặt bàn',
            error: error.message
        });
    }
};

// Chuyển bàn
const moveReservation = async (req, res) => {
    try {
        const { new_table_id } = req.body;

        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        // Chỉ nhân viên mới có thể chuyển bàn
        const userRole = req.user.role;
        if (!['admin', 'manager', 'staff'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ nhân viên mới có thể chuyển bàn'
            });
        }

        // Kiểm tra bàn mới
        const newTable = await Table.findById(new_table_id);
        if (!newTable || newTable.status !== 'available') {
            return res.status(400).json({
                success: false,
                message: 'Bàn mới không khả dụng'
            });
        }

        if (reservation.guest_count > newTable.capacity) {
            return res.status(400).json({
                success: false,
                message: `Bàn mới chỉ có thể chứa tối đa ${newTable.capacity} người`
            });
        }

        // Cập nhật trạng thái bàn
        await Table.findByIdAndUpdate(reservation.table_id, {
            status: 'available',
            updated_at: new Date()
        });
        await Table.findByIdAndUpdate(new_table_id, {
            status: 'reserved',
            updated_at: new Date()
        });

        // Cập nhật reservation
        const updatedReservation = await Reservation.findByIdAndUpdate(
            req.params.id,
            {
                table_id: new_table_id,
                updated_at: new Date()
            },
            { new: true }
        ).populate([
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'created_by_staff', select: 'username full_name' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Chuyển bàn thành công',
            data: updatedReservation
        });
    } catch (error) {
        console.error('Error in moveReservation:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi chuyển bàn',
            error: error.message
        });
    }
};

module.exports = {
    getReservations,
    getReservationById,
    getAvailableTables,
    createReservation,
    updateReservation,
    cancelReservation,
    moveReservation,
    getCustomerReservations
};
