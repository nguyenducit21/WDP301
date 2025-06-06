const Reservation = require('../models/reservation.model');
const Table = require('../models/table.model');
const User = require('../models/user.model');
const MenuItem = require('../models/menuItem.model');

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

const getCustomerReservations = async (req, res) => {
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

        // Nếu là customer, chỉ lấy đặt bàn của mình
        if (req.user.role === 'customer') {
            filter.customer_id = req.user.userId;
        } else {
            // Admin/Manager/Waiter có thể filter theo customer_id
            if (req.query.customer_id) {
                filter.customer_id = req.query.customer_id;
            }
        }

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

// Tạo đặt bàn mới
const createReservation = async (req, res) => {
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
            pre_order_items,
            deposit_amount,
            notes
        } = req.body;

        // Xác định ai tạo reservation
        let finalCustomerId = null;
        let createdByStaff = null;

        const userRole = req.user.role;

        if (['admin', 'manager', 'staff'].includes(userRole)) {
            // NHÂN VIÊN đặt cho khách
            createdByStaff = req.user.userId;
            finalCustomerId = customer_id || null; // Có thể null nếu khách chưa có tài khoản
        } else if (userRole === 'customer') {
            // KHÁCH tự đặt
            finalCustomerId = req.user.userId;
            createdByStaff = null;
        } else {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền thực hiện thao tác này'
            });
        }

        // Validation cơ bản
        if (!contact_name || !contact_phone || !guest_count) {
            return res.status(400).json({
                success: false,
                message: 'Tên, số điện thoại và số lượng khách là bắt buộc'
            });
        }

        // Kiểm tra bàn
        const table = await Table.findById(table_id);
        if (!table) {
            return res.status(400).json({
                success: false,
                message: 'Bàn không tồn tại'
            });
        }

        if (table.status !== 'available') {
            return res.status(400).json({
                success: false,
                message: 'Bàn không khả dụng'
            });
        }

        if (guest_count > table.capacity) {
            return res.status(400).json({
                success: false,
                message: `Bàn chỉ có thể chứa tối đa ${table.capacity} người`
            });
        }

        // Kiểm tra trùng thời gian
        const reservationDate = new Date(date);
        const existingReservation = await Reservation.findOne({
            table_id,
            date: reservationDate,
            time,
            status: { $in: ['confirmed', 'pending'] }
        });

        if (existingReservation) {
            return res.status(400).json({
                success: false,
                message: 'Bàn đã được đặt vào thời gian này'
            });
        }

        // Tạo reservation
        const reservation = new Reservation({
            customer_id: finalCustomerId,
            table_id,
            date: reservationDate,
            time,
            guest_count,
            contact_name,
            contact_phone,
            contact_email,
            created_by_staff: createdByStaff,
            pre_order_items: pre_order_items || [],
            deposit_amount: deposit_amount || 0,
            notes,
            // Nhân viên đặt thì tự động confirmed, khách đặt thì pending
            status: createdByStaff ? 'confirmed' : 'pending'
        });

        await reservation.save();

        // Cập nhật trạng thái bàn
        await Table.findByIdAndUpdate(table_id, {
            status: 'reserved',
            updated_at: new Date()
        });

        // Populate thông tin
        await reservation.populate([
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'created_by_staff', select: 'username full_name' },
            { path: 'pre_order_items.menu_item_id', select: 'name price' }
        ]);

        res.status(201).json({
            success: true,
            message: createdByStaff
                ? 'Nhân viên đặt bàn cho khách thành công'
                : 'Khách đặt bàn thành công',
            data: reservation
        });
    } catch (error) {
        console.error('Error in createReservation:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đặt bàn',
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


// Xóa đặt bàn
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
    getCustomerReservations,
    getReservationById,
    createReservation,
    updateReservation,
    cancelReservation,
    moveReservation
};
