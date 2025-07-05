const Order = require('../models/order.model');
const Table = require('../models/table.model');
const MenuItem = require('../models/menuItems.model');
const Reservation = require('../models/reservation.model');

// Lấy tất cả đơn hàng
const getOrders = async (req, res) => {
    try {
        const {
            status,
            table_id,
            customer_id,
            page = 1,
            limit = 100,
            sort = '-created_at'
        } = req.query;

        let filter = {};
        if (status) filter.status = status;
        if (table_id) filter.table_id = table_id;
        if (customer_id) filter.customer_id = customer_id;

        const orders = await Order.find(filter)
            .populate('table_id', 'name capacity area_id')
            .populate('customer_id', 'username full_name email phone')
            .populate('staff_id', 'username full_name')
            .populate('reservation_id', 'contact_name contact_phone date time')
            .populate({
                path: 'order_items.menu_item_id',
                select: 'name price category_id description'
            })
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Order.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalOrders: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đơn hàng',
            error: error.message
        });
    }
};


// Lấy chi tiết đơn hàng
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('table_id', 'name capacity area_id')
            .populate('customer_id', 'username full_name email phone')
            .populate('staff_id', 'username full_name')
            .populate('reservation_id', 'contact_name contact_phone date time')
            .populate('order_items.menu_item_id', 'name price category_id');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin đơn hàng',
            error: error.message
        });
    }
};

// Tạo đơn hàng mới
const createOrder = async (req, res) => {
    try {
        const {
            reservation_id,
            table_id,
            customer_id, // Optional
            order_items,
            combo_items,
            note
        } = req.body;

        // Validation
        if (!table_id || !order_items || order_items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc (table_id, order_items)'
            });
        }

        // Kiểm tra bàn có tồn tại
        const table = await Table.findById(table_id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
            });
        }

        // Tự động tìm reservation_id nếu bàn có đặt bàn active
        let finalReservationId = reservation_id;
        let finalCustomerId = customer_id;

        if (!finalReservationId) {
            const activeReservation = await Reservation.findOne({
                table_id: table_id,
                status: { $in: ['pending', 'confirmed', 'seated'] }
            }).sort({ created_at: -1 });

            if (activeReservation) {
                finalReservationId = activeReservation._id;
                // Lấy customer_id từ reservation nếu không có
                if (!finalCustomerId && activeReservation.customer_id) {
                    finalCustomerId = activeReservation.customer_id;
                }
            }
        } else {
            // Kiểm tra nếu reservation_id được cung cấp, đảm bảo nó là đặt bàn đang active
            const reservationCheck = await Reservation.findById(finalReservationId);
            if (!reservationCheck || !['pending', 'confirmed', 'seated'].includes(reservationCheck.status)) {
                // Nếu không phải đặt bàn active, tìm đặt bàn active khác cho bàn này
                const activeReservation = await Reservation.findOne({
                    table_id: table_id,
                    status: { $in: ['pending', 'confirmed', 'seated'] }
                }).sort({ created_at: -1 });

                if (activeReservation) {
                    finalReservationId = activeReservation._id;
                    if (!finalCustomerId && activeReservation.customer_id) {
                        finalCustomerId = activeReservation.customer_id;
                    }
                } else {
                    // Nếu không có đặt bàn active nào, không sử dụng reservation_id
                    finalReservationId = null;
                }
            }
        }

        // Xử lý order_items với validation đầy đủ
        let processedOrderItems = [];
        for (const item of order_items) {
            if (!item.menu_item_id || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Thông tin món ăn không hợp lệ'
                });
            }

            const menuItem = await MenuItem.findById(item.menu_item_id);
            if (!menuItem) {
                return res.status(400).json({
                    success: false,
                    message: `Không tìm thấy món ăn với ID: ${item.menu_item_id}`
                });
            }

            processedOrderItems.push({
                menu_item_id: item.menu_item_id,
                quantity: item.quantity,
                price: item.price || menuItem.price
            });
        }

        // Tạo đơn hàng mới
        const orderData = {
            table_id,
            staff_id: req.user?.userId || null,
            order_items: processedOrderItems,
            combo_items: combo_items || [],
            status: 'pending',
            note: note || '',
            created_at: new Date(),
            updated_at: new Date()
        };

        // Thêm reservation_id và customer_id nếu có
        if (finalReservationId) {
            orderData.reservation_id = finalReservationId;
        }
        if (finalCustomerId) {
            orderData.customer_id = finalCustomerId;
        }

        const order = new Order(orderData);
        await order.save();

        // Bỏ phần cập nhật trạng thái bàn, vì trạng thái bàn đã được quản lý bởi reservation

        await order.populate([
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'staff_id', select: 'username full_name' },
            { path: 'reservation_id', select: 'contact_name contact_phone date time' },
            { path: 'order_items.menu_item_id', select: 'name price category_id' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Tạo đơn hàng thành công',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đơn hàng',
            error: error.message
        });
    }
};



// Cập nhật đơn hàng
const updateOrder = async (req, res) => {
    try {
        const {
            order_items,
            combo_items,
            status,
            note
        } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Nếu cập nhật order_items, validate lại
        if (order_items && order_items.length > 0) {
            let processedOrderItems = [];

            for (const item of order_items) {
                const menuItem = await MenuItem.findById(item.menu_item_id);
                if (!menuItem) {
                    return res.status(400).json({
                        success: false,
                        message: `Không tìm thấy món ăn với ID: ${item.menu_item_id}`
                    });
                }

                processedOrderItems.push({
                    menu_item_id: item.menu_item_id,
                    quantity: item.quantity,
                    price: item.price || menuItem.price
                });
            }

            order.order_items = processedOrderItems;
        }

        // Cập nhật các trường khác
        if (combo_items) order.combo_items = combo_items;
        if (status) order.status = status;
        if (note !== undefined) order.note = note;

        order.updated_at = new Date();
        await order.save();

        // Populate thông tin
        await order.populate([
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'staff_id', select: 'username full_name' },
            { path: 'reservation_id', select: 'contact_name contact_phone date time' },
            { path: 'order_items.menu_item_id', select: 'name price category_id' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Cập nhật đơn hàng thành công',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật đơn hàng',
            error: error.message
        });
    }
};

// Cập nhật trạng thái đơn hàng
const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['pending', 'preparing', 'served', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ'
            });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        order.status = status;
        order.updated_at = new Date();
        await order.save();

        // Populate thông tin
        await order.populate([
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'staff_id', select: 'username full_name' }
        ]);

        // Notify waiters if order is completed
        if (status === 'completed' && global.io) {
            global.io.to('waiters').emit('order_completed', {
                id: order._id,
                table: order.table_id?.name || '',
                items: order.order_items?.map(item => ({
                    name: item.menu_item_id?.name || '',
                    quantity: item.quantity
                })) || [],
                customer: order.customer_id?.full_name || order.customer_id?.username || 'Khách lẻ',
                staff: order.staff_id?.full_name || order.staff_id?.username || '',
                time: order.updated_at,
                note: order.note || ''
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái đơn hàng thành công',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái đơn hàng',
            error: error.message
        });
    }
};

// Cập nhật trạng thái thanh toán
const updateOrderPayment = async (req, res) => {
    try {
        const { payment_method, status } = req.body;

        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin phương thức thanh toán'
            });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Cập nhật trạng thái thanh toán
        order.paid = true;
        order.payment_method = payment_method;
        order.status = status || 'completed';
        order.payment_date = new Date();
        order.updated_at = new Date();
        await order.save();

        // Cập nhật trạng thái đặt bàn thành hoàn thành nếu có
        if (order.reservation_id) {
            const reservation = await Reservation.findById(order.reservation_id);
            if (reservation && ['confirmed', 'seated'].includes(reservation.status)) {
                reservation.status = 'completed';
                reservation.payment_status = 'paid';
                reservation.updated_at = new Date();
                await reservation.save();
            }
        }

        // Cập nhật trạng thái bàn thành cleaning
        await Table.findByIdAndUpdate(
            order.table_id,
            {
                status: 'cleaning',
                updated_at: new Date()
            }
        );

        await order.populate([
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'staff_id', select: 'username full_name' },
            { path: 'reservation_id', select: 'contact_name contact_phone date time' },
            { path: 'order_items.menu_item_id', select: 'name price category_id' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Cập nhật thanh toán thành công',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật thanh toán',
            error: error.message
        });
    }
};

// Hủy đơn hàng
const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        if (order.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Không thể hủy đơn hàng đã hoàn thành'
            });
        }

        order.status = 'cancelled';
        order.updated_at = new Date();
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Hủy đơn hàng thành công',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy đơn hàng',
            error: error.message
        });
    }
};

// Lấy orders cho chef (pre-orders đã thanh toán + orders được đặt bởi staff)
const getChefOrders = async (req, res) => {
    try {
        // 1. Lấy pre-orders đã thanh toán từ Reservation
        const paidPreOrders = await Reservation.find({
            payment_status: 'paid',
            'pre_order_items.0': { $exists: true }, // Có ít nhất 1 pre_order_item
            status: { $in: ['pending', 'confirmed', 'seated'] }
        })
            .populate('customer_id', 'full_name phone')
            .populate('table_ids', 'name')
            .populate('pre_order_items.menu_item_id', 'name price image')
            .sort({ created_at: -1 });

        // 2. Lấy orders được đặt bởi staff
        const staffOrders = await Order.find({
            staff_id: { $exists: true, $ne: null },
            status: { $in: ['pending', 'preparing'] }
        })
            .populate('table_id', 'name')
            .populate('customer_id', 'full_name phone')
            .populate('staff_id', 'full_name')
            .populate('order_items.menu_item_id', 'name price image')
            .sort({ created_at: -1 });

        // 3. Format dữ liệu pre-orders
        const formattedPreOrders = paidPreOrders.map(reservation => ({
            id: reservation._id,
            type: 'pre_order',
            customer_name: reservation.contact_name,
            customer_phone: reservation.contact_phone,
            tables: reservation.table_ids?.map(table => table.name).join(', ') || 'N/A',
            items: reservation.pre_order_items.map(item => ({
                menu_item: item.menu_item_id,
                quantity: item.quantity
            })),
            total_amount: reservation.total_amount,
            created_at: reservation.created_at,
            status: 'preparing', // Pre-orders luôn ở trạng thái preparing
            note: reservation.notes || ''
        }));

        // 4. Format dữ liệu staff orders
        const formattedStaffOrders = staffOrders.map(order => ({
            id: order._id,
            type: 'staff_order',
            customer_name: order.customer_id?.full_name || 'Khách lẻ',
            customer_phone: order.customer_id?.phone || 'N/A',
            tables: order.table_id?.name || 'N/A',
            items: order.order_items.map(item => ({
                menu_item: item.menu_item_id,
                quantity: item.quantity
            })),
            total_amount: order.order_items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            created_at: order.created_at,
            status: order.status,
            note: order.note || '',
            staff_name: order.staff_id?.full_name || 'N/A'
        }));

        // 5. Kết hợp và sắp xếp theo thời gian tạo
        const allOrders = [...formattedPreOrders, ...formattedStaffOrders]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.status(200).json({
            success: true,
            data: {
                pre_orders: formattedPreOrders,
                staff_orders: formattedStaffOrders,
                all_orders: allOrders
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách orders cho chef',
            error: error.message
        });
    }
};

module.exports = {
    getOrders,
    getOrderById,
    createOrder,
    updateOrder,
    updateOrderStatus,
    updateOrderPayment,
    cancelOrder,
    getChefOrders
};
