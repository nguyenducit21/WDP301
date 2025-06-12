const Reservation = require('../models/reservation.model');
const Table = require('../models/table.model');
const Area = require('../models/area.model');
const MenuItem = require('../models/menuItem.model');
const Log = require('../models/log.model');
const Order = require('../models/order.model')
const mongoose = require('mongoose');

// Lấy tất cả đặt bàn
const getReservations = async (req, res) => {
    try {
        const {
            status,
            date,
            table_id,
            page = 1,
            limit = 1000, // FIXED: Tăng limit để frontend không bị thiếu data
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
            .populate('table_id', 'name capacity area_id')
            .populate('created_by_staff', 'username full_name') // FIXED: Thêm populate staff
            .populate({
                path: 'pre_order_items.menu_item_id',
                select: 'name price category_id description' // FIXED: Populate đầy đủ thông tin menu item
            })
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
            .populate('pre_order_items.menu_item_id', 'name price category')
            .populate({
                path: 'pre_order_items.menu_item_id',
                select: 'name price category_id description'
            });

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
        const { area_id, date, time, guest_count, type } = req.query;

        if (!date || !time) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp ngày và giờ đặt bàn'
            });
        }

        // Tạo thời gian đặt bàn
        const reservationDateTime = new Date(`${date}T${time}`);

        // Tìm các bàn đã được đặt trong khoảng thời gian này
        const existingReservations = await Reservation.find({
            date: date,
            time: time,
            status: { $in: ['pending', 'confirmed'] }
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
            customer_id,
            table_id,
            date,
            time,
            guest_count,
            contact_name,
            contact_phone,
            contact_email,
            pre_order_items,
            notes
        } = req.body;

        // Kiểm tra thông tin bắt buộc
        if (!table_id || !date || !time || !contact_name || !contact_phone) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        // Validate guest_count
        if (!guest_count || guest_count < 1) {
            return res.status(400).json({
                success: false,
                message: 'Số khách phải lớn hơn 0'
            });
        }

        const table = await Table.findById(table_id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
            });
        }

        if (table.status !== 'available') {
            return res.status(400).json({
                success: false,
                message: 'Bàn này hiện không khả dụng'
            });
        }

        if (guest_count > table.capacity) {
            return res.status(400).json({
                success: false,
                message: `Bàn chỉ có thể chứa tối đa ${table.capacity} người`
            });
        }

        const reservationDate = new Date(date);
        const startOfDay = new Date(reservationDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(reservationDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingReservation = await Reservation.findOne({
            table_id,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            time,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingReservation) {
            return res.status(400).json({
                success: false,
                message: 'Bàn đã được đặt trong thời gian này'
            });
        }

        let processedPreOrderItems = [];
        if (pre_order_items && Array.isArray(pre_order_items) && pre_order_items.length > 0) {
            for (const item of pre_order_items) {
                if (!item.menu_item_id || !item.quantity || item.quantity <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Thông tin món đặt trước không hợp lệ'
                    });
                }

                const menuItem = await MenuItem.findById(item.menu_item_id);
                if (!menuItem) {
                    return res.status(400).json({
                        success: false,
                        message: `Không tìm thấy món ăn với ID: ${item.menu_item_id}`
                    });
                }

                processedPreOrderItems.push({
                    menu_item_id: item.menu_item_id,
                    quantity: item.quantity
                });
            }
        }

        // Tạo đặt bàn mới
        const reservationData = {
            table_id,
            date: reservationDate,
            time,
            guest_count: parseInt(guest_count),
            contact_name: contact_name.trim(),
            contact_phone: contact_phone.trim(),
            contact_email: contact_email ? contact_email.trim() : '',
            pre_order_items: processedPreOrderItems,
            notes: notes ? notes.trim() : '',
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
        };

        if (customer_id) {
            try {
                reservationData.customer_id = new mongoose.Types.ObjectId(customer_id);
            } catch (error) {
                console.log('Invalid customer_id, skipping...', error);
            }
        }

        if (req.user && req.user.userId) {
            const userRole = req.user.role || req.user.user?.role;
            if (['admin', 'manager', 'staff', 'waiter'].includes(userRole)) {
                reservationData.created_by_staff = req.user.userId;
            }
        }

        console.log('Creating reservation with data:', reservationData); // ✅ THÊM DEBUG

        const reservation = new Reservation(reservationData);
        await reservation.save();

        // Cập nhật trạng thái bàn
        await Table.findByIdAndUpdate(table_id, {
            status: 'reserved',
            updated_at: new Date()
        });

        try {
            await reservation.populate([
                { path: 'table_id', select: 'name capacity area_id' },
                { path: 'customer_id', select: 'username full_name email phone' },
                { path: 'created_by_staff', select: 'username full_name' },
                {
                    path: 'pre_order_items.menu_item_id',
                    select: 'name price category_id description'
                }
            ]);
        } catch (populateError) {
            console.log('Populate error (non-critical):', populateError);
        }

        res.status(201).json({
            success: true,
            message: 'Đặt bàn thành công',
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
        const reservation = await Reservation.findById(req.params.id)
            .populate('table_id', 'name capacity area_id status');

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        if (reservation.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Đặt bàn đã được hủy trước đó'
            });
        }

        if (['completed', 'no_show'].includes(reservation.status)) {
            return res.status(400).json({
                success: false,
                message: 'Không thể hủy đặt bàn đã hoàn thành hoặc không có mặt'
            });
        }

        // Cập nhật trạng thái reservation
        reservation.status = 'cancelled';
        reservation.updated_at = new Date();
        await reservation.save();

        // Cập nhật trạng thái bàn về available (chỉ khi bàn còn tồn tại)
        if (reservation.table_id) {
            await Table.findByIdAndUpdate(reservation.table_id._id, {
                status: 'available',
                updated_at: new Date()
            });
        }

        // Populate lại thông tin để trả về
        await reservation.populate([
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'created_by_staff', select: 'username full_name' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Hủy đặt bàn thành công',
            data: reservation
        });
    } catch (error) {
        console.error('Error in cancelReservation:', error);
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

        if (!new_table_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID bàn mới'
            });
        }

        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        // Kiểm tra bàn mới có tồn tại và available
        const newTable = await Table.findById(new_table_id);
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

        const oldTableId = reservation.table_id;

        // Cập nhật reservation
        reservation.table_id = new_table_id;
        reservation.updated_at = new Date();
        await reservation.save();

        // Cập nhật trạng thái bàn
        await Table.findByIdAndUpdate(oldTableId, {
            status: 'available',
            updated_at: new Date()
        });

        await Table.findByIdAndUpdate(new_table_id, {
            status: 'reserved',
            updated_at: new Date()
        });

        // Populate thông tin
        await reservation.populate([
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'created_by_staff', select: 'username full_name' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Chuyển bàn thành công',
            data: reservation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi chuyển bàn',
            error: error.message
        });
    }
};

const getInvoiceData = async (req, res) => {
    try {
        const { reservationId } = req.params;

        // Lấy thông tin reservation
        const reservation = await Reservation.findById(reservationId)
            .populate('table_id', 'name capacity area_id')
            .populate('customer_id', 'username full_name email phone')
            .populate('created_by_staff', 'username full_name')
            .populate({
                path: 'pre_order_items.menu_item_id',
                select: 'name price category_id description'
            });

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        // Lấy thông tin order liên quan
        const order = await Order.findOne({
            $or: [
                { reservation_id: reservationId },
                { table_id: reservation.table_id._id }
            ]
        }).populate({
            path: 'order_items.menu_item_id',
            select: 'name price category_id description'
        }).sort({ created_at: -1 });

        // Xử lý pre-order items
        const preOrderItems = reservation.pre_order_items?.map(item => ({
            name: item.menu_item_id?.name || 'Món không xác định',
            quantity: item.quantity,
            price: item.menu_item_id?.price || 0
        })) || [];

        // Xử lý order items
        const orderItems = order?.order_items?.map(item => ({
            name: item.menu_item_id?.name || 'Món không xác định',
            quantity: item.quantity,
            price: item.price || item.menu_item_id?.price || 0
        })) || [];

        // Tính toán tổng tiền
        const preOrderTotal = preOrderItems.reduce((total, item) =>
            total + (item.price * item.quantity), 0);

        const orderTotal = orderItems.reduce((total, item) =>
            total + (item.price * item.quantity), 0);

        const subtotal = preOrderTotal + orderTotal;
        const tax = Math.round(subtotal * 0.1);
        const total = subtotal + tax;
        const remaining = orderTotal; // Số tiền còn lại phải thanh toán

        const totals = {
            preOrderTotal,
            orderTotal,
            subtotal,
            discount: 0,
            tax,
            total,
            remaining
        };

        // Thông tin nhà hàng
        const restaurant = {
            name: 'Nhà Hàng Hương Sen',
            address: 'Số 8, Số 2 Tôn Thất Tùng, Đống Đa - Hà Nội',
            phone: '1900300060',
            email: 'support@elise.vn'
        };

        const invoiceData = {
            reservation,
            order,
            table: reservation.table_id,
            preOrderItems,
            orderItems,
            totals,
            restaurant
        };

        res.status(200).json({
            success: true,
            data: invoiceData
        });
    } catch (error) {
        console.error('Error getting invoice data:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin hóa đơn',
            error: error.message
        });
    }
};


// Xác nhận đặt bàn
const confirmReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        if (reservation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể xác nhận đặt bàn đang chờ xác nhận'
            });
        }

        // Cập nhật reservation
        reservation.status = 'confirmed';
        reservation.updated_at = new Date();
        await reservation.save();

        // Cập nhật trạng thái bàn từ available → reserved
        await Table.findByIdAndUpdate(reservation.table_id, {
            status: 'reserved',
            updated_at: new Date()
        });

        await reservation.populate([
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'created_by_staff', select: 'username full_name' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Xác nhận đặt bàn thành công',
            data: reservation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xác nhận đặt bàn',
            error: error.message
        });
    }
};

// Khách vào bàn
const seatCustomer = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        if (reservation.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể đưa khách vào bàn đã được xác nhận'
            });
        }

        // Cập nhật reservation
        reservation.status = 'seated';
        reservation.updated_at = new Date();
        await reservation.save();

        // Cập nhật trạng thái bàn từ reserved → occupied
        await Table.findByIdAndUpdate(reservation.table_id, {
            status: 'occupied',
            updated_at: new Date()
        });

        await reservation.populate([
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'created_by_staff', select: 'username full_name' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Khách đã vào bàn',
            data: reservation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái',
            error: error.message
        });
    }
};

// Hoàn thành đặt bàn
const completeReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        if (reservation.status !== 'seated') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể hoàn thành đặt bàn đang phục vụ'
            });
        }

        // Cập nhật reservation
        reservation.status = 'completed';
        reservation.payment_status = 'paid'; // Đánh dấu đã thanh toán
        reservation.updated_at = new Date();
        await reservation.save();

        // Cập nhật trạng thái bàn từ occupied → cleaning (hoặc available)
        await Table.findByIdAndUpdate(reservation.table_id, {
            status: 'cleaning', // Hoặc 'available' nếu không cần dọn
            updated_at: new Date()
        });

        await reservation.populate([
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'created_by_staff', select: 'username full_name' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Đặt bàn đã hoàn thành',
            data: reservation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hoàn thành đặt bàn',
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
    getCustomerReservations,
    getInvoiceData,
    confirmReservation,
    seatCustomer,
    completeReservation
};
