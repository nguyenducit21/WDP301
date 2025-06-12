const Order = require('../models/order.model');
const Table = require('../models/table.model');
const MenuItem = require('../models/menuItem.model');
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

        // FIXED: Tự động tìm reservation_id nếu bàn có đặt bàn active
        let finalReservationId = reservation_id;
        let finalCustomerId = customer_id;

        if (!finalReservationId && table.status === 'reserved') {
            const activeReservation = await Reservation.findOne({
                table_id: table_id,
                status: { $in: ['pending', 'confirmed'] }
            }).sort({ created_at: -1 });

            if (activeReservation) {
                finalReservationId = activeReservation._id;
                // Lấy customer_id từ reservation nếu không có
                if (!finalCustomerId && activeReservation.customer_id) {
                    finalCustomerId = activeReservation.customer_id;
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

        // FIXED: Thêm reservation_id và customer_id nếu có
        if (finalReservationId) {
            orderData.reservation_id = finalReservationId;
        }
        if (finalCustomerId) {
            orderData.customer_id = finalCustomerId;
        }

        const order = new Order(orderData);
        await order.save();

        // FIXED: Populate đầy đủ thông tin
        await order.populate([
            {
                path: 'table_id',
                select: 'name capacity area_id',
                populate: { path: 'area_id', select: 'name' }
            },
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'staff_id', select: 'username full_name' },
            {
                path: 'reservation_id',
                select: 'contact_name contact_phone date time guest_count'
            },
            {
                path: 'order_items.menu_item_id',
                select: 'name price category_id description'
            }
        ]);

        res.status(201).json({
            success: true,
            message: 'Tạo đơn hàng thành công',
            data: order
        });
    } catch (error) {
        console.error('Error in createOrder:', error);
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

// Cập nhật thanh toán (sử dụng status completed)
const updateOrderPayment = async (req, res) => {
    try {
        const { payment_method, status } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Cập nhật trạng thái thành completed khi thanh toán
        order.status = status || 'completed';
        order.updated_at = new Date();

        // Có thể thêm trường payment_method vào note hoặc mở rộng model
        if (payment_method) {
            order.note = order.note ?
                `${order.note} | Thanh toán: ${payment_method}` :
                `Thanh toán: ${payment_method}`;
        }

        await order.save();

        // Populate thông tin
        await order.populate([
            { path: 'table_id', select: 'name capacity area_id' },
            { path: 'customer_id', select: 'username full_name email phone' },
            { path: 'staff_id', select: 'username full_name' }
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

module.exports = {
    getOrders,
    getOrderById,
    createOrder,
    updateOrder,
    updateOrderStatus,
    updateOrderPayment,
    cancelOrder
};
