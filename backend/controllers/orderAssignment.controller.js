const OrderAssignment = require('../models/orderAssignment.model');
const User = require('../models/user.model');
const Reservation = require('../models/reservation.model');
const Order = require('../models/order.model');
const { getIO } = require('../socket/socket');

// Lấy danh sách orders đang chờ assignment
const getPendingOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const employeeId = req.user.userId;

        // Lấy assignments đang chờ hoặc đã được assign cho user hiện tại
        const assignments = await OrderAssignment.find({
            $or: [
                { status: 'processing' },
                { assigned_to: employeeId, status: 'processing' }
            ]
        })
            .populate({
                path: 'order_id',
                populate: [
                    { path: 'customer_id', select: 'full_name username phone' },
                    { path: 'created_by_staff', select: 'full_name' },
                    { path: 'table_ids', select: 'name' },
                    { path: 'pre_order_items.menu_item_id', select: 'name price image' }
                ]
            })
            .populate('assigned_to', 'full_name username')
            .sort({ priority: -1, created_at: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Build lại order_details từ reservation mới nhất
        const formattedOrders = assignments.map(assignment => {
            const reservation = assignment.order_id;
            let orderDetails = {};
            if (reservation) {
                const hasPreOrder = reservation.pre_order_items && reservation.pre_order_items.length > 0;
                orderDetails = {
                    customer_name: reservation.contact_name,
                    customer_phone: reservation.contact_phone,
                    tables: reservation.table_ids?.map(t => t && t.name).filter(Boolean).join(', ') || 'N/A',
                    guest_count: reservation.guest_count,
                    items: reservation.pre_order_items || [],
                    notes: reservation.notes || '',
                    created_at: reservation.created_at,
                    date: reservation.date,
                    slot_id: reservation.slot_id,
                    slot_start_time: reservation.slot_start_time,
                    slot_end_time: reservation.slot_end_time,
                    has_pre_order: hasPreOrder,
                    reservation_type: hasPreOrder ? 'pre_order' : 'table_booking',
                        status: reservation.status, // Thêm dòng này để truyền status sang frontend
                };
            }
            return {
                assignment_id: assignment._id,
                order_id: reservation && reservation._id ? reservation._id : null,
                order_type: assignment.order_type,
                status: assignment.status,
                assigned_to: assignment.assigned_to,
                priority: assignment.priority,
                can_take: assignment.status === 'waiting' && !assignment.rejected_by.some(r => r.employee_id.toString() === employeeId),
                is_mine: assignment.assigned_to && assignment.assigned_to._id.toString() === employeeId,
                order_details: orderDetails,
                created_at: assignment.created_at,
                assigned_at: assignment.assigned_at
            };
        });

        res.status(200).json({
            success: true,
            data: formattedOrders,
            pagination: {
                currentPage: parseInt(page),
                totalItems: await OrderAssignment.countDocuments({
                    $or: [
                        { status: 'waiting' },
                        { assigned_to: employeeId, status: 'processing' }
                    ]
                })
            }
        });
    } catch (error) {
        console.error('Error getting pending orders:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đơn hàng',
            error: error.message
        });
    }
};

// Nhận đơn hàng (claim order)
const claimOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const employeeId = req.user.userId;

        // Tìm assignment
        const assignment = await OrderAssignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra xem đơn có đang chờ không
        if (assignment.status !== 'waiting') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng này đã được xử lý hoặc đã có người nhận'
            });
        }

        // BỎ kiểm tra đã từ chối (cho phép nhận lại)
        // const hasRejected = assignment.rejected_by.some(r =>
        //     r.employee_id.toString() === employeeId
        // );
        // if (hasRejected) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Bạn đã từ chối đơn hàng này trước đó'
        //     });
        // }

        // Atomic update để tránh race condition
        const updatedAssignment = await OrderAssignment.findOneAndUpdate(
            {
                _id: assignmentId,
                status: 'waiting',
                assigned_to: null
            },
            {
                assigned_to: employeeId,
                status: 'processing',
                assigned_at: new Date()
            },
            { new: true }
        ).populate('assigned_to', 'full_name username')
            .populate('order_id');

        if (!updatedAssignment) {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã được người khác nhận'
            });
        }

        // Nếu là assignment cho reservation, cập nhật status reservation thành 'confirmed' và gán assigned_staff
        if (updatedAssignment.order_type === 'reservation' && updatedAssignment.order_id) {
            const Reservation = require('../models/reservation.model');
            const reservation = await Reservation.findById(updatedAssignment.order_id._id || updatedAssignment.order_id);
            if (reservation) {
                reservation.status = 'confirmed';
                reservation.assigned_staff = employeeId;
                reservation.updated_at = new Date();
                await reservation.save();
            }
        }

        // Gửi thông báo real-time cho tất cả nhân viên
        const io = getIO();
        io.to('staff-room').emit('order_claimed', {
            assignment_id: assignmentId,
            assigned_to: {
                id: employeeId,
                full_name: updatedAssignment.assigned_to.full_name
            },
            order_id: updatedAssignment.order_id._id
        });

        res.status(200).json({
            success: true,
            message: 'Đã nhận đơn hàng thành công',
            data: updatedAssignment
        });

    } catch (error) {
        console.error('Error claiming order:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi nhận đơn hàng',
            error: error.message
        });
    }
};

// Trả lại đơn hàng (release order)
const releaseOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { reason = '' } = req.body;
        const employeeId = req.user.userId;

        // Tìm assignment
        const assignment = await OrderAssignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra quyền
        if (assignment.assigned_to.toString() !== employeeId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền trả lại đơn hàng này'
            });
        }

        // Cập nhật assignment
        assignment.assigned_to = null;
        assignment.status = 'waiting';
        assignment.assigned_at = null;
        if (reason) {
            assignment.rejected_by.push({
                employee_id: employeeId,
                reason: reason
            });
        }
        await assignment.save();

        // Gửi thông báo real-time cho tất cả nhân viên khác
        const io = getIO();
        io.to('staff-room').emit('order_released', {
            assignment_id: assignmentId,
            released_by: employeeId,
            reason: reason,
            order_id: assignment.order_id
        });

        res.status(200).json({
            success: true,
            message: 'Đã trả lại đơn hàng thành công'
        });

    } catch (error) {
        console.error('Error releasing order:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi trả lại đơn hàng',
            error: error.message
        });
    }
};

// Hoàn thành đơn hàng
const completeOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const employeeId = req.user.userId;

        // Cập nhật assignment
        const updatedAssignment = await OrderAssignment.findOneAndUpdate(
            {
                _id: assignmentId,
                assigned_to: employeeId,
                status: 'processing'
            },
            {
                status: 'completed',
                completed_at: new Date()
            },
            { new: true }
        );

        if (!updatedAssignment) {
            return res.status(400).json({
                success: false,
                message: 'Không thể hoàn thành đơn hàng'
            });
        }

        // Nếu là assignment cho reservation, cập nhật status reservation thành 'completed' và payment_status = 'paid'
        if (updatedAssignment.order_type === 'reservation' && updatedAssignment.order_id) {
            const Reservation = require('../models/reservation.model');
            const reservation = await Reservation.findById(updatedAssignment.order_id._id || updatedAssignment.order_id);
            if (reservation) {
                reservation.status = 'completed';
                if (reservation.payment_status !== 'paid') {
                    reservation.payment_status = 'paid';
                }
                reservation.updated_at = new Date();
                await reservation.save();
            }
        }

        // Gửi thông báo real-time
        const io = getIO();
        io.to('staff-room').emit('order_completed', {
            assignment_id: assignmentId,
            completed_by: employeeId,
            order_id: updatedAssignment.order_id
        });

        res.status(200).json({
            success: true,
            message: 'Đã hoàn thành đơn hàng',
            data: updatedAssignment
        });

    } catch (error) {
        console.error('Error completing order:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hoàn thành đơn hàng',
            error: error.message
        });
    }
};

// Xác nhận khách đã đến bàn (seated)
const confirmArrived = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const employeeId = req.user.userId;
        // Tìm assignment
        const assignment = await OrderAssignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy assignment' });
        }
        if (assignment.order_type === 'reservation' && assignment.order_id) {
            const Reservation = require('../models/reservation.model');
            const reservation = await Reservation.findById(assignment.order_id._id || assignment.order_id);
            if (reservation) {
                reservation.status = 'seated';
                reservation.updated_at = new Date();
                await reservation.save();
                // Update assignment: assign to this employee, set status to completed, set completed_at
                assignment.assigned_to = employeeId;
                assignment.status = 'completed';
                assignment.completed_at = new Date();
                await assignment.save();
                return res.status(200).json({ success: true, message: 'Đã xác nhận khách đã đến bàn', data: { reservation, assignment } });
            }
        }
        return res.status(400).json({ success: false, message: 'Không thể xác nhận khách đã đến cho loại đơn này' });
    } catch (error) {
        console.error('Error in confirmArrived:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xác nhận khách đã đến', error: error.message });
    }
};

// Tạo assignment cho đơn hàng mới
const createOrderAssignment = async (orderId, orderType, priority = 1) => {
    try {
        console.log(`Creating order assignment for ${orderType}:`, orderId);

        // Kiểm tra xem đã có assignment cho order này chưa
        const existingAssignment = await OrderAssignment.findOne({
            order_id: orderId,
            order_type: orderType
        });

        if (existingAssignment) {
            console.log('Assignment already exists:', existingAssignment._id);
            return existingAssignment;
        }

        // Tạo assignment mới
        const assignment = new OrderAssignment({
            order_id: orderId,
            order_type: orderType,
            priority: priority,
            timeout_at: new Date(Date.now() + 30 * 60 * 1000) // 30 phút timeout
        });

        await assignment.save();
        console.log('Created new assignment:', assignment._id);

        // Lấy thông tin order/reservation tùy theo type
        let orderDetails = {};

        if (orderType === 'reservation') {
            const reservation = await Reservation.findById(orderId)
                .populate('customer_id', 'full_name username phone')
                .populate('created_by_staff', 'full_name')
                .populate('table_ids', 'name')
                .populate('pre_order_items.menu_item_id', 'name price image');

            if (reservation) {
                const hasPreOrder = reservation.pre_order_items && reservation.pre_order_items.length > 0;
                orderDetails = {
                    customer_name: reservation.contact_name,
                    customer_phone: reservation.contact_phone,
                    tables: reservation.table_ids?.map(t => t.name).join(', ') || 'N/A',
                    guest_count: reservation.guest_count,
                    items: reservation.pre_order_items || [],
                    notes: reservation.notes,
                    created_at: reservation.created_at,
                    has_pre_order: hasPreOrder,
                    reservation_type: hasPreOrder ? 'pre_order' : 'table_booking'
                };
            }
        } else if (orderType === 'order') {
            const order = await Order.findById(orderId)
                .populate('customer_id', 'full_name username phone')
                .populate('staff_id', 'full_name')
                .populate('table_id', 'name')
                .populate('order_items.menu_item_id', 'name price image');

            if (order) {
                orderDetails = {
                    customer_name: order.customer_id?.full_name || order.customer_id?.username || 'Khách lẻ',
                    customer_phone: order.customer_id?.phone || 'N/A',
                    tables: order.table_id?.name || 'N/A',
                    guest_count: order.guest_count || 1,
                    items: order.order_items || [],
                    notes: order.note,
                    created_at: order.created_at
                };
            }
        }

        console.log('Order details for assignment:', orderDetails);

        // Gửi thông báo real-time cho tất cả nhân viên
        const io = getIO();
        const assignmentData = {
            assignment_id: assignment._id,
            order_type: orderType,
            priority: priority,
            order_details: orderDetails,
            created_at: assignment.created_at
        };

        console.log('Emitting new_order_assignment:', assignmentData);
        io.to('staff-room').emit('new_order_assignment', assignmentData);

        return assignment;

    } catch (error) {
        console.error('Error creating order assignment:', error);
        throw error;
    }
};

// Lấy thống kê hiệu suất nhân viên
const getEmployeeStats = async (req, res) => {
    try {
        const { employeeId, startDate, endDate } = req.query;
        const targetEmployeeId = employeeId || req.user.userId;

        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                created_at: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }

        // Thống kê tổng quan
        const stats = await OrderAssignment.aggregate([
            {
                $match: {
                    assigned_to: targetEmployeeId,
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgProcessingTime: {
                        $avg: {
                            $subtract: ['$completed_at', '$assigned_at']
                        }
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                employee_id: targetEmployeeId,
                stats: stats,
                period: { startDate, endDate }
            }
        });

    } catch (error) {
        console.error('Error getting employee stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê nhân viên',
            error: error.message
        });
    }
};

// Cập nhật assignment khi reservation items thay đổi
const updateOrderAssignment = async (orderId, orderType, newItems) => {
    try {
        console.log(`🔄 Updating order assignment for ${orderType}:`, orderId, 'New items count:', newItems?.length || 0);

        // Tìm assignment hiện tại
        const assignment = await OrderAssignment.findOne({
            order_id: orderId,
            order_type: orderType,
            status: { $in: ['waiting', 'processing'] } // Chỉ update những assignment chưa complete
        });

        if (!assignment) {
            console.log('⚠️ No active assignment found to update');
            return null;
        }

        // Lấy thông tin order/reservation mới
        let orderDetails = {};

        if (orderType === 'reservation') {
            const reservation = await Reservation.findById(orderId)
                .populate('customer_id', 'full_name username phone')
                .populate('created_by_staff', 'full_name')
                .populate('table_ids', 'name')
                .populate('pre_order_items.menu_item_id', 'name price image');

            if (reservation) {
                const hasPreOrder = reservation.pre_order_items && reservation.pre_order_items.length > 0;
                orderDetails = {
                    customer_name: reservation.contact_name,
                    customer_phone: reservation.contact_phone,
                    tables: reservation.table_ids?.map(t => t.name).join(', ') || 'N/A',
                    guest_count: reservation.guest_count,
                    items: reservation.pre_order_items || [],
                    notes: reservation.notes,
                    created_at: reservation.created_at,
                    has_pre_order: hasPreOrder,
                    reservation_type: hasPreOrder ? 'pre_order' : 'table_booking'
                };

                // Cập nhật priority dựa trên việc có pre_order_items không
                const newPriority = hasPreOrder ? 2 : 1;
                if (assignment.priority !== newPriority) {
                    assignment.priority = newPriority;
                    console.log(`📈 Updated priority from ${assignment.priority} to ${newPriority}`);
                }
            }
        }

        // Cập nhật assignment
        assignment.updated_at = new Date();
        await assignment.save();

        console.log('✅ Assignment updated successfully');

        // Gửi thông báo real-time cho tất cả nhân viên
        const io = getIO();
        const updateData = {
            assignment_id: assignment._id,
            order_type: orderType,
            priority: assignment.priority,
            order_details: orderDetails,
            updated_at: assignment.updated_at,
            status: assignment.status,
            assigned_to: assignment.assigned_to
        };

        console.log('📡 Broadcasting assignment update:', updateData);
        io.to('staff-room').emit('order_assignment_updated', updateData);

        return assignment;

    } catch (error) {
        console.error('Error updating order assignment:', error);
        throw error;
    }
};

module.exports = {
    getPendingOrders,
    claimOrder,
    releaseOrder,
    completeOrder,
    confirmArrived,
    createOrderAssignment,
    updateOrderAssignment,
    getEmployeeStats
}; 