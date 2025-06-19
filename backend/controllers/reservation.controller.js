const Reservation = require('../models/reservation.model');
const Table = require('../models/table.model');
const Area = require('../models/area.model');
const MenuItem = require('../models/menuItems.model');
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
            slot_id,
            page = 1,
            limit = 1000,
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
        if (slot_id) filter.slot_id = slot_id;

        const reservations = await Reservation.find(filter)
            .populate('customer_id', 'username full_name email phone')
            .populate('table_id', 'name capacity area_id')
            .populate('created_by_staff', 'username full_name')
            .populate('slot_id', 'name start_time end_time')
            .populate({
                path: 'pre_order_items.menu_item_id',
                select: 'name price category_id description'
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

// Hàm kiểm tra xem một đặt bàn có nằm trong slot thời gian không
const isReservationInTimeSlot = (reservationTime, slotStartTime) => {
    // Lấy giờ và phút từ thời gian đặt bàn
    const [reservationHour, reservationMinute] = reservationTime.split(':').map(Number);
    const [slotStartHour, slotStartMinute] = slotStartTime.split(':').map(Number);

    // Tính thời gian kết thúc slot (2 giờ sau thời gian bắt đầu)
    let slotEndHour = slotStartHour + 2;
    const slotEndMinute = slotStartMinute;

    // Chuyển đổi thời gian sang phút để dễ so sánh
    const reservationTimeInMinutes = reservationHour * 60 + reservationMinute;
    const slotStartTimeInMinutes = slotStartHour * 60 + slotStartMinute;
    const slotEndTimeInMinutes = slotEndHour * 60 + slotEndMinute;

    // Kiểm tra xem thời gian đặt bàn có nằm trong khoảng thời gian của slot không
    return reservationTimeInMinutes >= slotStartTimeInMinutes &&
        reservationTimeInMinutes < slotEndTimeInMinutes;
};

// Lấy danh sách bàn có sẵn theo khu vực và thời gian
const getAvailableTables = async (req, res) => {
    try {
        const { area_id, date, slot_id, guest_count, type } = req.query;

        if (!date || !slot_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp ngày và slot_id'
            });
        }

        // Tạo filter ngày chính xác
        const reservationDate = new Date(date);
        const startOfDay = new Date(reservationDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(reservationDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Lấy thông tin slot
        const BookingSlot = require('../models/BookingSlot');
        const bookingSlot = await BookingSlot.findById(slot_id);

        if (!bookingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy slot thời gian'
            });
        }

        // Tìm các đơn đặt bàn trong cùng ngày và slot
        const reservationsInSlot = await Reservation.find({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            slot_id,
            status: { $in: ['pending', 'confirmed', 'seated'] }
        }).select('table_id');

        // Lấy danh sách ID bàn đã được đặt trong slot
        const reservedTableIds = reservationsInSlot.map(r => r.table_id);

        // Tìm các bàn có sẵn
        let query = {
            _id: { $nin: reservedTableIds },
            status: { $in: ['available', 'cleaning'] }
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

// Hàm validation thời gian đặt bàn
const validateBookingTime = async (date, slot_id) => {
    const now = new Date();
    const bookingDate = new Date(date);
    const BookingSlot = require('../models/BookingSlot');
    const bookingSlot = await BookingSlot.findById(slot_id);

    if (!bookingSlot) {
        throw new Error('Không tìm thấy slot thời gian');
    }

    // Không cho đặt bàn trong quá khứ
    if (bookingDate < now) {
        throw new Error('Không thể đặt bàn cho thời gian trong quá khứ');
    }

    // Nếu đặt trong ngày, kiểm tra giờ
    if (bookingDate.toDateString() === now.toDateString()) {
        const [hours, minutes] = bookingSlot.start_time.split(':');
        const slotTime = new Date(bookingDate);
        slotTime.setHours(parseInt(hours), parseInt(minutes));

        // Yêu cầu đặt bàn trước ít nhất 1 giờ
        const minBookingTime = new Date(now.getTime() + 60 * 60 * 1000);
        if (slotTime < minBookingTime) {
            throw new Error('Vui lòng đặt bàn trước ít nhất 1 giờ so với thời gian bắt đầu');
        }
    }

    // Kiểm tra giờ mở cửa (ví dụ: 6:00 - 22:00)
    const [startHours, startMinutes] = bookingSlot.start_time.split(':');
    const slotStartTime = new Date(bookingDate);
    slotStartTime.setHours(parseInt(startHours), parseInt(startMinutes));

    const [endHours, endMinutes] = bookingSlot.end_time.split(':');
    const slotEndTime = new Date(bookingDate);
    slotEndTime.setHours(parseInt(endHours), parseInt(endMinutes));

    // Kiểm tra slot có trong giờ mở cửa không
    const openingTime = new Date(bookingDate);
    openingTime.setHours(6, 0, 0, 0); // 6:00 AM

    const closingTime = new Date(bookingDate);
    closingTime.setHours(22, 0, 0, 0); // 10:00 PM

    if (slotStartTime < openingTime || slotEndTime > closingTime) {
        throw new Error('Chỉ có thể đặt bàn trong giờ mở cửa (6:00 - 22:00)');
    }
};

// Hàm gửi thông báo cho nhân viên
const notifyStaff = async (reservation) => {
    try {
        const User = require('../models/user.model');
        const sendmail = require('../helper/sendmail.helper');

        // Lấy danh sách email của nhân viên
        const staffUsers = await User.find({
            role: { $in: ['admin', 'manager', 'waiter'] }
        }).select('email full_name');

        if (staffUsers.length === 0) {
            console.log('Không tìm thấy nhân viên để gửi thông báo');
            return;
        }

        const staffEmails = staffUsers.map(staff => staff.email).join(', ');

        // Format thời gian
        const reservationDate = new Date(reservation.date);
        const formattedDate = reservationDate.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const formattedTime = `${reservation.slot_start_time} - ${reservation.slot_end_time}`;

        // Tạo nội dung email
        const emailSubject = '🔔 Có đặt bàn mới - Thông báo khẩn';

        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #e74c3c; text-align: center;">🔔 THÔNG BÁO ĐẶT BÀN MỚI</h2>

                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">📋 Thông tin đặt bàn:</h3>

                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #34495e;">👤 Khách hàng:</td>
                            <td style="padding: 8px 0;">${reservation.contact_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #34495e;">📞 Số điện thoại:</td>
                            <td style="padding: 8px 0;">${reservation.contact_phone}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #34495e;">📧 Email:</td>
                            <td style="padding: 8px 0;">${reservation.contact_email || 'Không có'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #34495e;">📅 Ngày:</td>
                            <td style="padding: 8px 0;">${formattedDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #34495e;">⏰ Thời gian:</td>
                            <td style="padding: 8px 0;">${formattedTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #34495e;">👥 Số khách:</td>
                            <td style="padding: 8px 0;">${reservation.guest_count} người</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #34495e;">🪑 Bàn:</td>
                            <td style="padding: 8px 0;">${reservation.table_id?.name || 'Chưa xác định'}</td>
                        </tr>
                    </table>
                </div>

                ${reservation.pre_order_items && reservation.pre_order_items.length > 0 ? `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <h4 style="color: #856404; margin-top: 0;">🍽️ Món đặt trước:</h4>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${reservation.pre_order_items.map(item =>
            `<li>${item.menu_item_id?.name || 'Món không xác định'} - ${item.quantity} phần</li>`
        ).join('')}
                    </ul>
                </div>
                ` : ''}

                ${reservation.notes ? `
                <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                    <h4 style="color: #0c5460; margin-top: 0;">📝 Ghi chú:</h4>
                    <p style="margin: 0;">${reservation.notes}</p>
                </div>
                ` : ''}

                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        ⚠️ Vui lòng xác nhận đặt bàn này trong hệ thống quản lý
                    </p>
                </div>

                <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">

                <div style="text-align: center; color: #95a5a6; font-size: 12px;">
                    <p>Email tự động từ hệ thống quản lý nhà hàng</p>
                    <p>Thời gian gửi: ${new Date().toLocaleString('vi-VN')}</p>
                </div>
            </div>
        `;

        // Gửi email
        sendmail.send(staffEmails, emailSubject, emailContent);

        console.log(`Đã gửi thông báo đặt bàn mới cho ${staffUsers.length} nhân viên`);

    } catch (error) {
        console.error('Lỗi khi gửi thông báo cho nhân viên:', error);
        // Không throw error để không ảnh hưởng đến quá trình đặt bàn
    }
};

// Tạo đặt bàn mới
const createReservation = async (req, res) => {
    try {
        const {
            customer_id,
            table_id,
            date,
            slot_id,
            guest_count,
            contact_name,
            contact_phone,
            contact_email,
            pre_order_items,
            notes
        } = req.body;

        // Kiểm tra thông tin bắt buộc
        if (!table_id || !date || !slot_id || !contact_name || !contact_phone) {
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

        // Validate thời gian đặt bàn
        try {
            await validateBookingTime(date, slot_id);
        } catch (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError.message
            });
        }

        // Kiểm tra slot_id có tồn tại
        const BookingSlot = require('../models/BookingSlot');
        const bookingSlot = await BookingSlot.findById(slot_id);

        if (!bookingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy slot thời gian'
            });
        }

        const table = await Table.findById(table_id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
            });
        }

        if (guest_count > table.capacity) {
            return res.status(400).json({
                success: false,
                message: `Bàn chỉ có thể chứa tối đa ${table.capacity} người`
            });
        }

        // Sửa logic check trùng lặp theo slot_id
        const reservationDate = new Date(date);
        const startOfDay = new Date(reservationDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(reservationDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Kiểm tra bàn đã được đặt trong slot này chưa
        const existingReservation = await Reservation.findOne({
            table_id,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            slot_id,
            status: { $in: ['pending', 'confirmed', 'seated'] }
        });

        if (existingReservation) {
            return res.status(400).json({
                success: false,
                message: 'Bàn đã được đặt trong khung giờ này'
            });
        }

        // Xử lý pre-order items và kiểm tra tồn kho
        let processedPreOrderItems = [];
        let inventoryWarning = false;

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
            slot_id,
            slot_start_time: bookingSlot.start_time,
            slot_end_time: bookingSlot.end_time,
            guest_count: parseInt(guest_count),
            contact_name: contact_name.trim(),
            contact_phone: contact_phone.trim(),
            contact_email: contact_email ? contact_email.trim() : '',
            pre_order_items: processedPreOrderItems,
            notes: notes ? notes.trim() : '',
            status: 'pending',
            payment_status: 'pending',
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

        const reservation = new Reservation(reservationData);
        await reservation.save();

        try {
            await reservation.populate([
                { path: 'table_id', select: 'name capacity area_id' },
                { path: 'customer_id', select: 'username full_name email phone' },
                { path: 'created_by_staff', select: 'username full_name' },
                { path: 'slot_id', select: 'name start_time end_time' },
                {
                    path: 'pre_order_items.menu_item_id',
                    select: 'name price category_id description'
                }
            ]);
        } catch (populateError) {
            console.log('Populate error (non-critical):', populateError);
        }

        // Gửi thông báo cho nhân viên
        await notifyStaff(reservation);

        res.status(201).json({
            success: true,
            message: inventoryWarning
                ? 'Đặt bàn thành công. Lưu ý: Một số món có thể thiếu nguyên liệu, nhà hàng sẽ ưu tiên chuẩn bị cho đơn đặt trước.'
                : 'Đặt bàn thành công',
            data: reservation,
            inventoryWarning
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

// Lấy danh sách đặt bàn của khách hàng theo userId
const getCustomerReservationsByUserId = async (req, res) => {
    try {
        const reservations = await Reservation.find({ customer_id: req.params.userId })
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

        // Kiểm tra sức chứa của bàn hiện tại
        if (finalGuestCount > currentTable.capacity) {
            return res.status(400).json({
                success: false,
                message: `Bàn hiện tại chỉ có thể chứa tối đa ${currentTable.capacity} người`
            });
        }

        //  Logic chuyển bàn mới với check ngày chính xác
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

            // Kiểm tra sức chứa bàn mới
            if (finalGuestCount > newTable.capacity) {
                return res.status(400).json({
                    success: false,
                    message: `Bàn mới chỉ có thể chứa tối đa ${newTable.capacity} người`
                });
            }

            //  Kiểm tra trùng thời gian với bàn mới theo ngày cụ thể
            const reservationDate = date ? new Date(date) : reservation.date;
            const reservationTime = time || reservation.time;

            const startOfDay = new Date(reservationDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(reservationDate);
            endOfDay.setHours(23, 59, 59, 999);

            const existingReservation = await Reservation.findOne({
                _id: { $ne: req.params.id },
                table_id: table_id,
                date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                },
                time: reservationTime,
                status: { $in: ['confirmed', 'pending', 'seated'] }
            });

            if (existingReservation) {
                return res.status(400).json({
                    success: false,
                    message: 'Bàn mới đã được đặt vào thời gian này'
                });
            }
        }

        // Xác định data cần update
        let updateData = {
            ...(customer_id !== undefined && { customer_id }),
            ...(isChangingTable && { table_id }),
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

        // Kiểm tra bàn mới có tồn tại
        const newTable = await Table.findById(new_table_id);
        if (!newTable) {
            return res.status(400).json({
                success: false,
                message: 'Bàn mới không tồn tại'
            });
        }

        //  Kiểm tra bàn mới có trống trong ngày và giờ của reservation không
        const startOfDay = new Date(reservation.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(reservation.date);
        endOfDay.setHours(23, 59, 59, 999);

        const conflictReservation = await Reservation.findOne({
            _id: { $ne: req.params.id },
            table_id: new_table_id,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            time: reservation.time,
            status: { $in: ['pending', 'confirmed', 'seated'] }
        });

        if (conflictReservation) {
            return res.status(400).json({
                success: false,
                message: 'Bàn mới đã được đặt vào thời gian này'
            });
        }

        // Cập nhật reservation
        reservation.table_id = new_table_id;
        reservation.updated_at = new Date();
        await reservation.save();

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

// Cập nhật trạng thái thanh toán
const updatePaymentStatus = async (req, res) => {
    try {
        const { payment_status, payment_method, payment_note, amount } = req.body;

        if (!payment_status) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu trạng thái thanh toán'
            });
        }

        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        // Kiểm tra quyền cập nhật
        const userRole = req.user?.role || req.user?.user?.role;
        if (!['admin', 'manager', 'staff', 'waiter'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền cập nhật trạng thái thanh toán'
            });
        }

        // Validate payment status
        const validStatuses = ['pending', 'partial', 'paid', 'refunded'];
        if (!validStatuses.includes(payment_status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái thanh toán không hợp lệ'
            });
        }

        //  Kiểm tra logic chuyển đổi trạng thái
        const currentStatus = reservation.payment_status || 'pending';

        // Cho phép chuyển từ pending -> partial -> paid
        // Hoặc từ partial -> paid
        // Hoặc từ bất kỳ trạng thái nào -> refunded (với quyền admin)
        if (currentStatus === 'paid' && payment_status !== 'refunded') {
            return res.status(400).json({
                success: false,
                message: 'Không thể thay đổi trạng thái của đơn đã thanh toán đầy đủ'
            });
        }

        if (payment_status === 'refunded' && !['admin', 'manager'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ admin/manager mới có thể thực hiện hoàn tiền'
            });
        }

        // Cập nhật reservation
        const updateData = {
            payment_status,
            updated_at: new Date()
        };

        if (payment_method) {
            updateData.payment_method = payment_method;
        }

        if (payment_note) {
            updateData.payment_note = payment_note;
        }

        if (amount) {
            updateData.deposit_amount = amount;
        }

        // Thêm timestamp cho thanh toán
        if (payment_status === 'paid') {
            updateData.payment_date = new Date();
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
            message: `Cập nhật trạng thái thanh toán thành công: ${payment_status}`,
            data: updatedReservation
        });

    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái thanh toán',
            error: error.message
        });
    }
};

const checkoutTable = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        if (!['seated', 'completed'].includes(reservation.status)) {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể checkout bàn đang phục vụ hoặc đã hoàn thành'
            });
        }

        // Kiểm tra thanh toán
        if (reservation.payment_status !== 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng hoàn thành thanh toán trước khi checkout'
            });
        }

        // Cập nhật reservation thành completed
        reservation.status = 'completed';
        reservation.checkout_time = new Date();
        reservation.updated_at = new Date();
        await reservation.save();

        // Cập nhật trạng thái bàn về cleaning
        await Table.findByIdAndUpdate(reservation.table_id, {
            status: 'cleaning',
            updated_at: new Date()
        });

        await reservation.populate([
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'created_by_staff', select: 'username full_name' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Checkout bàn thành công',
            data: reservation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi checkout bàn',
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
    getCustomerReservationsByUserId,
    getInvoiceData,
    confirmReservation,
    seatCustomer,
    completeReservation,
    updatePaymentStatus,
    checkoutTable
};
