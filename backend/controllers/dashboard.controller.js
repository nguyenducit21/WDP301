// controller/dashboard.controller.js
const mongoose = require('mongoose');
const MenuItem = require('../models/menuItems.model');
const Category = require('../models/category.model');
const Order = require('../models/order.model');
const Reservation = require('../models/reservation.model');
const User = require('../models/user.model');
const Table = require('../models/table.model');
const Role = require('../models/role.model');
const Promotion = require('../models/promotion.model');

const chefDashboard = async (req, res) => {
    try {
        // Tổng số món chưa ngừng kinh doanh
        const totalItems = await MenuItem.countDocuments({ is_deleted: false });

        // Số món ngừng kinh doanh
        const stoppedItems = await MenuItem.countDocuments({ is_deleted: true });

        // Số danh mục
        const totalCategories = await Category.countDocuments();

        // Có sẵn (chỉ món chưa ngừng kinh doanh)
        const available = await MenuItem.countDocuments({ is_deleted: false, is_available: true });
        // Hết hàng (chỉ món chưa ngừng kinh doanh)
        const outOfStock = await MenuItem.countDocuments({ is_deleted: false, is_available: false });

        // 5 món vừa thêm gần nhất (chưa ngừng KD)
        const recentItems = await MenuItem.find({ is_deleted: false })
            .sort({ created_at: -1 })
            .limit(5)
            .populate('category_id', 'name')
            .select('name category_id is_available image');

        res.json({
            totalItems,
            available,
            outOfStock,
            stoppedItems,
            totalCategories,
            recentItems,
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


// Manager Dashboard - Tính doanh thu từ orders và reservations
// Helper function để tính toán khoảng thời gian
const calculateDateRange = (period, startDate = null, endDate = null) => {
    const today = new Date();
    let queryStart, queryEnd, previousStart, previousEnd;

    switch (period) {
        case 'today':
            queryStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            queryEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            previousStart = new Date(queryStart.getTime() - 24 * 60 * 60 * 1000);
            previousEnd = new Date(queryStart);
            break;
        case 'week':
            queryEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            queryStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
            previousEnd = new Date(queryStart);
            previousStart = new Date(queryStart.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            queryEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            queryStart = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
            previousEnd = new Date(queryStart);
            previousStart = new Date(queryStart.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'year':
            queryStart = new Date(today.getFullYear(), 0, 1);
            queryEnd = new Date(today.getFullYear() + 1, 0, 1);
            previousStart = new Date(today.getFullYear() - 1, 0, 1);
            previousEnd = new Date(today.getFullYear(), 0, 1);
            break;
        case 'custom':
            queryStart = startDate ? new Date(startDate) : new Date(today.getFullYear(), today.getMonth(), today.getDate());
            queryEnd = endDate ? new Date(endDate) : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            queryEnd.setDate(queryEnd.getDate() + 1);
            const diffDays = Math.ceil((queryEnd - queryStart) / (24 * 60 * 60 * 1000));
            previousEnd = new Date(queryStart);
            previousStart = new Date(queryStart.getTime() - diffDays * 24 * 60 * 60 * 1000);
            break;
        default:
            queryStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            queryEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            previousStart = new Date(queryStart.getTime() - 24 * 60 * 60 * 1000);
            previousEnd = new Date(queryStart);
    }

    if (isNaN(queryStart.getTime()) || isNaN(queryEnd.getTime())) {
        console.error(`Invalid date range: start=${startDate}, end=${endDate}`);
        throw new Error('Invalid date range provided');
    }

    return {
        start: queryStart,
        end: queryEnd,
        current: { start: queryStart, end: queryEnd },
        previous: { start: previousStart, end: previousEnd }
    };
};

const adminStats = async (req, res) => {
    try {
        const { period = 'today', startDate, endDate } = req.query;
        const dateRange = calculateDateRange(period, startDate, endDate);

        console.log(`adminStats: period=${period}, start=${dateRange.start}, end=${dateRange.end}`);

        // Kiểm tra collection orders và reservations
        const collections = await mongoose.connection.db.listCollections().toArray();
        const hasOrders = collections.some(c => c.name === 'orders');
        const hasReservations = collections.some(c => c.name === 'reservations');

        if (!hasOrders || !hasReservations) {
            console.warn(`Missing collections: orders=${hasOrders}, reservations=${hasReservations}`);
        }

        // Doanh thu từ Orders - chỉ tính các đơn trong khoảng thời gian đã chọn
        const [ordersRevenue] = await Order.aggregate([
            {
                $match: {
                    created_at: { $gte: dateRange.start, $lt: dateRange.end },
                    status: { $in: ['completed', 'served'] },
                    order_items: { $exists: true, $ne: [] }
                }
            },
            { $unwind: '$order_items' },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$order_items.quantity', '$order_items.price'] } },
                    orderIds: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    totalRevenue: 1,
                    totalOrders: { $size: '$orderIds' }
                }
            }
        ]).catch(err => {
            console.error('Error in ordersRevenue aggregation:', err);
            return [{ totalRevenue: 0, totalOrders: 0 }];
        });

        // Doanh thu từ Reservations - chỉ tính các đơn trong khoảng thời gian đã chọn
        // Tính từ pre_order_items
        const [reservationsRevenue] = await Reservation.aggregate([
            {
                $match: {
                    date: { $gte: dateRange.start, $lt: dateRange.end },
                    payment_status: 'paid',
                    pre_order_items: { $exists: true, $ne: [] }
                }
            },
            { $unwind: '$pre_order_items' },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: 'pre_order_items.menu_item_id',
                    foreignField: '_id',
                    as: 'menuItem'
                }
            },
            { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { 
                        $sum: { 
                            $multiply: [
                                '$pre_order_items.quantity',
                                { $ifNull: ['$menuItem.price', 0] }
                            ] 
                        }
                    },
                    reservationIds: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    totalRevenue: 1,
                    totalReservations: { $size: '$reservationIds' }
                }
            }
        ]).catch(err => {
            console.error('Error in reservationsRevenue aggregation:', err);
            return [{ totalRevenue: 0, totalReservations: 0 }];
        });

        // Doanh thu từ tổng số tiền của reservation (nếu có)
        // Chỉ tính các đơn có total_amount nhưng không có pre_order_items
        const [reservationsTotalAmountRevenue] = await Reservation.aggregate([
            {
                $match: {
                    date: { $gte: dateRange.start, $lt: dateRange.end },
                    payment_status: 'paid',
                    total_amount: { $exists: true, $gt: 0 },
                    $or: [
                        { pre_order_items: { $exists: false } },
                        { pre_order_items: { $size: 0 } }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total_amount' },
                    reservationIds: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    totalRevenue: 1,
                    totalReservations: { $size: '$reservationIds' }
                }
            }
        ]).catch(err => {
            console.error('Error in reservationsTotalAmountRevenue aggregation:', err);
            return [{ totalRevenue: 0, totalReservations: 0 }];
        });

        // Đếm tổng số reservation trong khoảng thời gian
        const totalReservationsCount = await Reservation.countDocuments({
            date: { $gte: dateRange.start, $lt: dateRange.end }
        }).catch(err => {
            console.error('Error counting total reservations:', err);
            return 0;
        });

        const orderRev = ordersRevenue || { totalRevenue: 0, totalOrders: 0 };
        const reservationRev = reservationsRevenue || { totalRevenue: 0, totalReservations: 0 };
        const reservationTotalAmountRev = reservationsTotalAmountRevenue || { totalRevenue: 0, totalReservations: 0 };

        const totalRevenue = (orderRev.totalRevenue || 0) + (reservationRev.totalRevenue || 0) + (reservationTotalAmountRev.totalRevenue || 0);
        const totalInvoices = (orderRev.totalOrders || 0) + (reservationRev.totalReservations || 0) + (reservationTotalAmountRev.totalReservations || 0);

        console.log(`Total revenue calculation:
            Orders revenue: ${orderRev.totalRevenue}
            Reservations pre_order revenue: ${reservationRev.totalRevenue}
            Reservations total_amount revenue: ${reservationTotalAmountRev.totalRevenue}
            Total: ${totalRevenue}
            Total invoices: ${totalInvoices}
            Total reservations count: ${totalReservationsCount}
        `);

        // Tính chi phí nguyên liệu (giả định 30% doanh thu)
        const totalIngredientCost = totalRevenue * 0.3;
        
        // Tính lợi nhuận = doanh thu - chi phí nguyên liệu
        const totalProfit = totalRevenue - totalIngredientCost;

        // Khách hàng mới
        const orderCustomerIds = await Order.find({
            created_at: { $gte: dateRange.start, $lt: dateRange.end },
            customer_id: { $exists: true, $ne: null }
        }).distinct('customer_id').catch(err => {
            console.error('Error in orderCustomerIds:', err);
            return [];
        });

        const reservationCustomerIds = await Reservation.find({
            date: { $gte: dateRange.start, $lt: dateRange.end },
            customer_id: { $exists: true, $ne: null }
        }).distinct('customer_id').catch(err => {
            console.error('Error in reservationCustomerIds:', err);
            return [];
        });

        const allCustomerIds = Array.from(new Set([...orderCustomerIds, ...reservationCustomerIds]));

        const newCustomers = await User.countDocuments({
            _id: { $in: allCustomerIds.map(id => new mongoose.Types.ObjectId(id)) },
            created_at: { $gte: dateRange.start, $lt: dateRange.end }
        }).catch(err => {
            console.error('Error counting new customers:', err);
            return 0;
        });

        // Đếm số lượng đơn đặt bàn trong khoảng thời gian
        const reservationCount = await Reservation.countDocuments({
            date: { $gte: dateRange.start, $lt: dateRange.end }
        }).catch(err => {
            console.error('Error counting reservations:', err);
            return 0;
        });

        // Đếm số lượng đơn đặt bàn đã hoàn thành
        const completedReservations = await Reservation.countDocuments({
            date: { $gte: dateRange.start, $lt: dateRange.end },
            status: 'completed'
        }).catch(err => {
            console.error('Error counting completed reservations:', err);
            return 0;
        });

        // Đếm số lượng đơn đặt bàn đã hủy
        const cancelledReservations = await Reservation.countDocuments({
            date: { $gte: dateRange.start, $lt: dateRange.end },
            status: 'cancelled'
        }).catch(err => {
            console.error('Error counting cancelled reservations:', err);
            return 0;
        });

        // Chart data
        const chartMap = {};

        // Doanh thu từ orders theo ngày
        const ordersByDay = await Order.aggregate([
            {
                $match: {
                    created_at: { $gte: dateRange.start, $lt: dateRange.end },
                    status: { $in: ['completed', 'served'] },
                    order_items: { $exists: true, $ne: [] }
                }
            },
            { $unwind: '$order_items' },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                    revenue: { $sum: { $multiply: ['$order_items.quantity', '$order_items.price'] } }
                }
            },
            { $sort: { _id: 1 } }
        ]).catch(err => {
            console.error('Error in ordersByDay aggregation:', err);
            return [];
        });

        // Doanh thu từ pre_order_items của reservations theo ngày
        const reservationsByDay = await Reservation.aggregate([
            {
                $match: {
                    date: { $gte: dateRange.start, $lt: dateRange.end },
                    payment_status: 'paid',
                    pre_order_items: { $exists: true, $ne: [] }
                }
            },
            { $unwind: '$pre_order_items' },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: 'pre_order_items.menu_item_id',
                    foreignField: '_id',
                    as: 'menuItem'
                }
            },
            { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    revenue: { 
                        $sum: { 
                            $multiply: [
                                '$pre_order_items.quantity',
                                { $ifNull: ['$menuItem.price', 0] }
                            ] 
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]).catch(err => {
            console.error('Error in reservationsByDay aggregation:', err);
            return [];
        });

        // Doanh thu từ total_amount của reservations theo ngày
        const reservationsTotalAmountByDay = await Reservation.aggregate([
            {
                $match: {
                    date: { $gte: dateRange.start, $lt: dateRange.end },
                    payment_status: 'paid',
                    total_amount: { $exists: true, $gt: 0 },
                    $or: [
                        { pre_order_items: { $exists: false } },
                        { pre_order_items: { $size: 0 } }
                    ]
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    revenue: { $sum: '$total_amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]).catch(err => {
            console.error('Error in reservationsTotalAmountByDay aggregation:', err);
            return [];
        });

        // Gộp dữ liệu từ cả ba nguồn
        ordersByDay.forEach(item => {
            const dateStr = item._id;
            chartMap[dateStr] = (chartMap[dateStr] || 0) + item.revenue;
        });

        reservationsByDay.forEach(item => {
            const dateStr = item._id;
            chartMap[dateStr] = (chartMap[dateStr] || 0) + item.revenue;
        });

        reservationsTotalAmountByDay.forEach(item => {
            const dateStr = item._id;
            chartMap[dateStr] = (chartMap[dateStr] || 0) + item.revenue;
        });

        const chartData = Object.entries(chartMap).map(([date, revenue]) => {
            const ingredientCost = revenue * 0.3; // Giả định chi phí nguyên liệu là 30% doanh thu
            const profit = revenue - ingredientCost;
            
            return {
                date,
                revenue,
                ingredientCost,
                profit
            };
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({
            success: true,
            data: {
                totalInvoices,
                totalRevenue,
                totalIngredientCost,
                totalProfit,
                newCustomers,
                chartData,
                reservationCount,
                completedReservations,
                cancelledReservations
            },
            period: { from: dateRange.start, to: dateRange.end, days: Math.ceil((dateRange.end - dateRange.start) / (24 * 60 * 60 * 1000)) }
        });
    } catch (error) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

const adminEmployeePerformance = async (req, res) => {
    try {
        const { period = 'today', startDate, endDate } = req.query;
        const { start, end } = calculateDateRange(period, startDate, endDate);

        console.log(`adminEmployeePerformance: period=${period}, start=${start}, end=${end}`);

        const waiterRole = await Role.findOne({ name: 'waiter' }).catch(err => {
            console.error('Error finding waiter role:', err);
            return null;
        });
        if (!waiterRole) return res.status(404).json({ success: false, message: 'Không tìm thấy role waiter' });

        const waiters = await User.find({ role_id: waiterRole._id }).catch(err => {
            console.error('Error fetching waiters:', err);
            return [];
        });
        const waiterIds = waiters.map(w => w._id);

        const reservationData = await Reservation.aggregate([
            {
                $match: {
                    assigned_staff: { $in: waiterIds },
                    status: 'completed',
                    updated_at: { $gte: start, $lt: end }
                }
            },
            {
                $addFields: {
                    pre_order_items: { $ifNull: ['$pre_order_items', []] }
                }
            },
            { $unwind: { path: '$pre_order_items', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: 'pre_order_items.menu_item_id',
                    foreignField: '_id',
                    as: 'menuItem'
                }
            },
            { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$assigned_staff',
                    revenue: {
                        $sum: {
                            $multiply: [
                                { $ifNull: ['$pre_order_items.quantity', 0] },
                                { $ifNull: ['$menuItem.price', 0] }
                            ]
                        }
                    },
                    orderIds: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    revenue: 1,
                    orders: { $size: '$orderIds' }
                }
            }
        ]).catch(err => {
            console.error('Error in reservationData aggregation:', err);
            return [];
        });

        const orderData = await Order.aggregate([
            {
                $match: {
                    staff_id: { $in: waiterIds },
                    status: { $in: ['completed', 'served'] },
                    updated_at: { $gte: start, $lt: end }
                }
            },
            {
                $addFields: {
                    order_items: { $ifNull: ['$order_items', []] }
                }
            },
            { $unwind: { path: '$order_items', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$staff_id',
                    revenue: {
                        $sum: {
                            $multiply: [
                                { $ifNull: ['$order_items.quantity', 0] },
                                { $ifNull: ['$order_items.price', 0] }
                            ]
                        }
                    },
                    orderIds: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    revenue: 1,
                    orders: { $size: '$orderIds' }
                }
            }
        ]).catch(err => {
            console.error('Error in orderData aggregation:', err);
            return [];
        });

        const combinedMap = new Map();
        [...reservationData, ...orderData].forEach(item => {
            const id = item._id?.toString();
            if (!id) return;
            const existing = combinedMap.get(id) || { orders: 0, revenue: 0 };
            combinedMap.set(id, {
                orders: existing.orders + (item.orders || 0),
                revenue: existing.revenue + (item.revenue || 0)
            });
        });

        const results = waiters.map(staff => {
            const id = staff._id.toString();
            const data = combinedMap.get(id) || { orders: 0, revenue: 0 };
            return {
                staffId: id,
                staffName: staff.full_name || staff.username,
                orders: data.orders,
                revenue: data.revenue
            };
        });

        results.sort((a, b) => b.revenue - a.revenue);

        res.json({ success: true, data: results.slice(0, 10) });
    } catch (error) {
        console.error('Admin Employee Performance Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

const adminTopProducts = async (req, res) => {
    try {
        const { period = 'today', startDate, endDate, limit = 5 } = req.query;
        const { start, end } = calculateDateRange(period, startDate, endDate);

        console.log(`adminTopProducts: period=${period}, start=${start}, end=${end}`);

        const orderItems = await Order.aggregate([
            { $match: { created_at: { $gte: start, $lte: end }, status: { $in: ['completed', 'served'] } } },
            { $unwind: '$order_items' },
            {
                $group: {
                    _id: '$order_items.menu_item_id',
                    quantitySold: { $sum: '$order_items.quantity' }
                }
            }
        ]).catch(err => {
            console.error('Error in orderItems aggregation:', err);
            return [];
        });

        const reservationItems = await Reservation.aggregate([
            { $match: { date: { $gte: start, $lte: end }, payment_status: 'paid' } },
            { $unwind: '$pre_order_items' },
            {
                $group: {
                    _id: '$pre_order_items.menu_item_id',
                    quantitySold: { $sum: '$pre_order_items.quantity' }
                }
            }
        ]).catch(err => {
            console.error('Error in reservationItems aggregation:', err);
            return [];
        });

        const combinedMap = new Map();
        [...orderItems, ...reservationItems].forEach(item => {
            const id = item._id?.toString();
            if (!id) return;
            combinedMap.set(id, (combinedMap.get(id) || 0) + item.quantitySold);
        });

        const itemIds = Array.from(combinedMap.keys()).map(id => new mongoose.Types.ObjectId(id));
        const menuItems = await MenuItem.find({ _id: { $in: itemIds } }).populate('category_id').catch(err => {
            console.error('Error fetching menuItems:', err);
            return [];
        });

        const merged = menuItems.map(item => ({
            id: item._id,
            name: item.name,
            price: item.price,
            category: item.category_id?.name || 'Không rõ',
            quantitySold: combinedMap.get(item._id.toString()) || 0
        }));

        const sorted = merged.sort((a, b) => b.quantitySold - a.quantitySold).slice(0, parseInt(limit));

        res.json({ success: true, data: sorted });
    } catch (error) {
        console.error('Admin Top Products Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

const getBusiestBookingSlot = async (req, res) => {
    try {
        const { period = 'today', startDate, endDate } = req.query;
        const { start, end } = calculateDateRange(period, startDate, endDate);

        console.log(`getBusiestBookingSlot: period=${period}, start=${start}, end=${end}`);

        // Kiểm tra collection bookingslots
        const collections = await mongoose.connection.db.listCollections({ name: 'bookingslots' }).toArray();
        if (!collections.length) {
            console.warn('Collection "bookingslots" does not exist');
            return res.json({
                success: true,
                data: null,
                message: 'Collection "bookingslots" not found, returning null'
            });
        }

        // Kiểm tra dữ liệu slot_id trong reservations
        const validReservations = await Reservation.find({
            date: { $gte: start, $lt: end },
            status: { $in: ['completed', 'confirmed', 'seated'] },
            slot_id: { $exists: true, $ne: null }
        }).limit(1).catch(err => {
            console.error('Error checking reservations:', err);
            return [];
        });

        if (!validReservations.length) {
            console.warn('No valid reservations with slot_id found');
            return res.json({
                success: true,
                data: null,
                message: 'No reservations with valid slot_id found'
            });
        }

        const slotStats = await Reservation.aggregate([
            {
                $match: {
                    date: { $gte: start, $lt: end },
                    status: { $in: ['completed', 'confirmed', 'seated'] },
                    slot_id: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$slot_id',
                    reservations: { $sum: 1 },
                    guestCount: { $sum: '$guest_count' }
                }
            },
            {
                $lookup: {
                    from: 'bookingslots',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'slot'
                }
            },
            { $unwind: { path: '$slot', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    slot: { $ne: null } // Chỉ giữ các document có slot hợp lệ
                }
            },
            {
                $project: {
                    start_time: '$slot.start_time',
                    end_time: '$slot.end_time',
                    reservations: 1,
                    guestCount: 1
                }
            },
            { $sort: { reservations: -1 } },
            { $limit: 1 }
        ]).catch(err => {
            console.error('Error in slotStats aggregation:', err);
            return [];
        });

        const busiestSlot = slotStats[0] || null;
        
        console.log('Busiest slot found:', busiestSlot);

        res.json({
            success: true,
            data: busiestSlot,
            message: busiestSlot ? undefined : 'No matching booking slots found'
        });
    } catch (error) {
        console.error('getBusiestBookingSlot Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy khung giờ đông khách', error: error.message });
    }
};

const getPromotionStats = async (req, res) => {
    try {
        const { period = 'today', startDate, endDate } = req.query;
        const { start, end } = calculateDateRange(period, startDate, endDate);

        console.log(`getPromotionStats: period=${period}, start=${start}, end=${end}`);

        // Kiểm tra collection promotions
        const collections = await mongoose.connection.db.listCollections({ name: 'promotions' }).toArray();
        if (!collections.length) {
            console.warn('Collection "promotions" does not exist');
            return res.json({
                success: true,
                data: { total: 0, used: 0 },
                message: 'Collection "promotions" not found, returning default values'
            });
        }

        // Lấy tất cả các mã khuyến mãi trong khoảng thời gian
        const promotions = await Promotion.find({
            createdAt: { $gte: start, $lt: end }
        }).lean();

        // Tính tổng số mã và tổng số lượt sử dụng
        const totalPromotions = promotions.length;
        const totalUsedCount = promotions.reduce((sum, promo) => sum + (promo.usedCount || 0), 0);

        console.log(`Found ${totalPromotions} promotions with ${totalUsedCount} total usages`);

        // Log chi tiết từng mã để debug
        promotions.forEach(promo => {
            console.log(`Promotion ${promo.code}: usedCount = ${promo.usedCount || 0}`);
        });

        res.json({
            success: true,
            data: {
                total: totalPromotions,
                used: totalUsedCount,
                period: { from: start, to: end }
            }
        });
    } catch (error) {
        console.error('getPromotionStats Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê mã giảm giá', error: error.message });
    }
};
// Manager Dashboard - Thống kê chính
const managerDashboard = async (req, res) => {
    try {
        const { period = 'today', startDate, endDate } = req.query;
        const dateRange = calculateDateRange(period, startDate, endDate);

        console.log('Dashboard query:', { period, dateRange });

        // 1. Tính doanh thu từ Orders
        const [ordersRevenue] = await Order.aggregate([
            {
                $match: {
                    created_at: { $gte: dateRange.current.start, $lt: dateRange.current.end },
                    status: { $in: ['completed', 'served'] },
                    order_items: { $exists: true, $ne: [] }
                }
            },
            {
                $unwind: '$order_items'
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$order_items.quantity', '$order_items.price'] } },
                    orderIds: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    totalRevenue: 1,
                    totalOrders: { $size: '$orderIds' }
                }
            }
        ]).catch(() => [{ totalRevenue: 0, totalOrders: 0 }]);

        // 2. Tính doanh thu từ Reservations
        const [reservationsRevenue] = await Reservation.aggregate([
            {
                $match: {
                    date: { $gte: dateRange.current.start, $lt: dateRange.current.end },
                    payment_status: 'paid',
                    pre_order_items: { $exists: true, $ne: [] }
                }
            },
            {
                $unwind: '$pre_order_items'
            },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: 'pre_order_items.menu_item_id',
                    foreignField: '_id',
                    as: 'menuItem'
                }
            },
            {
                $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: {
                            $multiply: [
                                '$pre_order_items.quantity',
                                { $ifNull: ['$menuItem.price', 0] }
                            ]
                        }
                    },
                    reservationIds: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    totalRevenue: 1,
                    totalReservations: { $size: '$reservationIds' }
                }
            }
        ]).catch(() => [{ totalRevenue: 0, totalReservations: 0 }]);

        // 3. Tính toán kết quả
        const orderRev = ordersRevenue || { totalRevenue: 0, totalOrders: 0 };
        const reservationRev = reservationsRevenue || { totalRevenue: 0, totalReservations: 0 };

        const totalRevenue = (orderRev.totalRevenue || 0) + (reservationRev.totalRevenue || 0);
        const totalOrders = (orderRev.totalOrders || 0) + (reservationRev.totalReservations || 0);

        // 4. Đếm đơn hàng theo trạng thái
        const [pendingOrders, completedOrders] = await Promise.all([
            Reservation.countDocuments({
                date: { $gte: dateRange.current.start, $lt: dateRange.current.end },
                status: 'pending'
            }),
            Reservation.countDocuments({
                date: { $gte: dateRange.current.start, $lt: dateRange.current.end },
                status: { $in: ['completed', 'confirmed'] }
            })
        ]);

        // 5. Đếm nhân viên đang hoạt động
        const waiterRole = await Role.findOne({ name: 'waiter' });
        const activeStaff = waiterRole ?
            await User.countDocuments({ role_id: waiterRole._id, status: 'active' }) : 0;

        // 6. Tính tỷ lệ lấp đầy bàn
        const [totalTables, occupiedTables] = await Promise.all([
            Table.countDocuments(),
            Reservation.countDocuments({
                date: { $gte: dateRange.current.start, $lt: dateRange.current.end },
                status: { $in: ['confirmed', 'seated'] }
            })
        ]);

        const tableOccupancy = totalTables > 0 ?
            Math.round((occupiedTables / totalTables) * 100) : 0;

        // 7. Đánh giá khách hàng (mặc định hoặc từ review model)
        let customerSatisfaction = 4.5;
        try {
            const Review = require('../models/review.model');
            const [avgRating] = await Review.aggregate([
                {
                    $match: {
                        created_at: { $gte: dateRange.current.start, $lt: dateRange.current.end },
                        rating: { $exists: true }
                    }
                },
                { $group: { _id: null, averageRating: { $avg: '$rating' } } }
            ]);
            if (avgRating) {
                customerSatisfaction = parseFloat(avgRating.averageRating.toFixed(1));
            }
        } catch (error) {
            console.log('No review model available');
        }

        const responseData = {
            todayRevenue: Number(totalRevenue) || 0,
            todayOrders: Number(totalOrders) || 0,
            pendingOrders: Number(pendingOrders) || 0,
            completedOrders: Number(completedOrders) || 0,
            activeStaff: Number(activeStaff) || 0,
            customerSatisfaction: Number(customerSatisfaction) || 4.5,
            tableOccupancy: Number(tableOccupancy) || 0,
            period: period
        };

        console.log('Dashboard response:', responseData);

        res.json({
            success: true,
            data: responseData,
            meta: {
                period,
                dateRange: {
                    start: dateRange.current.start,
                    end: dateRange.current.end
                }
            }
        });

    } catch (error) {
        console.error('Error in managerDashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy dữ liệu dashboard manager',
            error: error.message
        });
    }
};

// Recent Reservations
const getRecentReservations = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;

        console.log('Getting recent reservations with limit:', limit);

        // Populate theo schema thực tế
        const reservations = await Reservation.find({})
            .populate('customer_id', 'full_name username')
            .populate('table_id', 'name number') // table_id cho backward compatibility
            .populate('table_ids', 'name number') // table_ids cho multiple tables
            .populate('pre_order_items.menu_item_id', 'name price')
            .populate('created_by_staff', 'full_name username')
            .sort({ created_at: -1 })
            .limit(limit);

        console.log('Found reservations:', reservations.length);

        const formattedReservations = reservations.map(reservation => {
            // Tính total amount từ pre_order_items hoặc sử dụng total_amount
            let totalAmount = 0;

            if (reservation.total_amount) {
                totalAmount = reservation.total_amount;
            } else if (reservation.pre_order_items && reservation.pre_order_items.length > 0) {
                totalAmount = reservation.pre_order_items.reduce((sum, item) => {
                    if (item.menu_item_id && item.menu_item_id.price) {
                        return sum + (item.menu_item_id.price * item.quantity);
                    }
                    return sum;
                }, 0);
            }

            // Lấy tên bàn (ưu tiên table_ids trước, sau đó table_id)
            let tableName = 'Bàn chưa xác định';
            if (reservation.table_ids && reservation.table_ids.length > 0) {
                // Nếu có nhiều bàn, hiển thị bàn đầu tiên + số lượng
                const firstTable = reservation.table_ids[0];
                if (reservation.table_ids.length === 1) {
                    tableName = firstTable.name || `Bàn ${firstTable.number || '?'}`;
                } else {
                    tableName = `${firstTable.name || `Bàn ${firstTable.number || '?'}`} +${reservation.table_ids.length - 1}`;
                }
            } else if (reservation.table_id) {
                tableName = reservation.table_id.name || `Bàn ${reservation.table_id.number || '?'}`;
            }

            // Lấy tên khách hàng
            let customerName = 'Khách vãng lai';
            if (reservation.customer_id) {
                customerName = reservation.customer_id.full_name || reservation.customer_id.username;
            } else if (reservation.contact_name) {
                customerName = reservation.contact_name;
            }

            // Thông tin thời gian đặt bàn
            const reservationDate = new Date(reservation.date);
            const reservationTimeInfo = `${reservationDate.toLocaleDateString('vi-VN')} ${reservation.slot_start_time}-${reservation.slot_end_time}`;

            return {
                id: `#${reservation._id.toString().slice(-6)}`,
                table: tableName,
                status: reservation.status,
                total: totalAmount,
                customer: customerName,
                // BỎ time: timeText - vì không cần thiết nữa
                reservationTime: reservationTimeInfo,
                guestCount: reservation.guest_count,
                phone: reservation.contact_phone,
                paymentStatus: reservation.payment_status,
                createdBy: reservation.created_by_staff ?
                    (reservation.created_by_staff.full_name || reservation.created_by_staff.username) :
                    'Khách tự đặt'
            };
        });

        console.log('Formatted reservations:', formattedReservations);

        res.json({
            success: true,
            data: formattedReservations,
            total: reservations.length
        });
    } catch (error) {
        console.error('Error getting recent reservations:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy đặt bàn gần đây',
            error: error.message
        });
    }
};




// Staff Status với filter nâng cao
const getStaffStatus = async (req, res) => {
    try {
        const { limit = 10, period = 'week', startDate, endDate } = req.query;

        const waiterRole = await Role.findOne({ name: 'waiter' });
        if (!waiterRole) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy role "waiter"'
            });
        }

        const staff = await User.find({
            role_id: waiterRole._id,
            status: 'active'
        }).populate('role_id', 'name').limit(parseInt(limit));

        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const staffWithWorkload = await Promise.all(
            staff.map(async (employee) => {
                // ĐẾM BÀN ĐANG PHỤC VỤ - từ assigned_staff
                const servingReservations = await Reservation.find({
                    assigned_staff: employee._id,
                    date: { $gte: todayStart, $lt: todayEnd },
                    status: { $in: ['confirmed', 'seated'] }
                });

                // Tính tổng số bàn (bao gồm multiple tables)
                let tablesServing = 0;
                servingReservations.forEach(reservation => {
                    if (reservation.table_ids && reservation.table_ids.length > 0) {
                        tablesServing += reservation.table_ids.length;
                    } else if (reservation.table_id) {
                        tablesServing += 1;
                    }
                });

                // ĐẾM ĐỖN HÔM NAY - từ created_by_staff
                const ordersToday = await Reservation.countDocuments({
                    $or: [
                        { created_by_staff: employee._id },
                        { assigned_staff: employee._id }
                    ],
                    date: { $gte: todayStart, $lt: todayEnd }
                }).catch(() => 0);

                return {
                    id: employee._id,
                    full_name: employee.full_name || employee.username,
                    role: employee.role_id?.name,
                    status: employee.status,
                    tablesServing: tablesServing,  // Bàn đang phục vụ (assigned_staff)
                    ordersToday: ordersToday       // Đơn hôm nay (created_by_staff)
                };
            })
        );

        res.json({
            success: true,
            data: staffWithWorkload,
            meta: {
                totalStaff: staffWithWorkload.length,
                note: "Tables serving from assigned_staff, Orders today from created_by_staff"
            }
        });

    } catch (error) {
        console.error('Error getting staff status:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy trạng thái nhân viên',
            error: error.message
        });
    }
};





module.exports = { managerDashboard };

// Admin Dashboard - Thống kê tổng quan hệ thống
const adminDashboard = async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Tổng doanh thu từ orders
        const totalOrdersRevenue = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['completed', 'served'] }
                }
            },
            {
                $unwind: '$order_items'
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: { $multiply: ['$order_items.quantity', '$order_items.price'] }
                    }
                }
            }
        ]);

        // Tổng doanh thu từ reservations
        const totalReservationsRevenue = await Reservation.aggregate([
            {
                $match: {
                    payment_status: 'paid',
                    total_amount: { $exists: true, $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total_amount' }
                }
            }
        ]);

        // Doanh thu tháng này
        const monthlyOrdersRevenue = await Order.aggregate([
            {
                $match: {
                    created_at: { $gte: startOfMonth, $lte: endOfMonth },
                    status: { $in: ['completed', 'served'] }
                }
            },
            {
                $unwind: '$order_items'
            },
            {
                $group: {
                    _id: null,
                    monthlyRevenue: {
                        $sum: { $multiply: ['$order_items.quantity', '$order_items.price'] }
                    }
                }
            }
        ]);

        const monthlyReservationsRevenue = await Reservation.aggregate([
            {
                $match: {
                    created_at: { $gte: startOfMonth, $lte: endOfMonth },
                    payment_status: 'paid',
                    total_amount: { $exists: true, $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    monthlyRevenue: { $sum: '$total_amount' }
                }
            }
        ]);

        // Tổng số đơn hàng
        const totalOrders = await Order.countDocuments();

        // Tổng số khách hàng
        const totalUsers = await User.countDocuments({
            role_id: { $exists: true }
        });

        // Tổng số nhân viên
        const totalEmployees = await User.countDocuments({
            status: 'active'
        });

        const activeEmployees = await User.countDocuments({
            status: 'active'
        });

        // Tính tổng doanh thu
        const orderRevenue = totalOrdersRevenue[0]?.totalRevenue || 0;
        const reservationRevenue = totalReservationsRevenue[0]?.totalRevenue || 0;
        const totalRevenue = orderRevenue + reservationRevenue;

        const monthlyOrderRev = monthlyOrdersRevenue[0]?.monthlyRevenue || 0;
        const monthlyReservationRev = monthlyReservationsRevenue[0]?.monthlyRevenue || 0;
        const monthlyRevenue = monthlyOrderRev + monthlyReservationRev;

        res.json({
            success: true,
            data: {
                totalUsers,
                totalRevenue,
                totalOrders,
                totalEmployees,
                monthlyRevenue,
                todayOrders: 0, // Có thể tính thêm
                activeEmployees,
                totalTables: 24 // Có thể lấy từ Table model
            }
        });
    } catch (error) {
        console.error('Error in adminDashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy dữ liệu dashboard admin',
            error: error.message
        });
    }
};

// Kitchen Staff Dashboard - Thông tin cho bếp
const kitchenStaffDashboard = async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        // Đếm đơn hàng theo trạng thái
        const totalOrders = await Order.countDocuments({
            created_at: { $gte: startOfDay, $lt: endOfDay }
        });

        const pendingCount = await Order.countDocuments({
            created_at: { $gte: startOfDay, $lt: endOfDay },
            status: 'pending'
        });

        const preparingCount = await Order.countDocuments({
            created_at: { $gte: startOfDay, $lt: endOfDay },
            status: 'preparing'
        });

        const completedToday = await Order.countDocuments({
            created_at: { $gte: startOfDay, $lt: endOfDay },
            status: { $in: ['completed', 'served'] }
        });

        // Đếm pre-orders từ reservations
        const preOrdersCount = await Reservation.countDocuments({
            created_at: { $gte: startOfDay, $lt: endOfDay },
            pre_order_items: { $exists: true, $ne: [] },
            payment_status: 'paid'
        });

        const urgentOrders = await Order.countDocuments({
            created_at: { $gte: startOfDay, $lt: endOfDay },
            status: 'pending',
            // Có thể thêm logic để xác định đơn khẩn cấp
        });

        res.json({
            success: true,
            data: {
                totalOrders: totalOrders + preOrdersCount,
                pendingCount: pendingCount + preOrdersCount,
                preparingCount,
                completedToday,
                averagePrepTime: 18, // Có thể tính từ dữ liệu thực tế
                urgentOrders
            }
        });
    } catch (error) {
        console.error('Error in kitchenStaffDashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy dữ liệu dashboard kitchen staff',
            error: error.message
        });
    }
};

// Waiter Dashboard - Thống kê cho nhân viên phục vụ
// Cập nhật waiterDashboard để nhận filter
const waiterDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { period = 'today', startDate, endDate } = req.query;
        const dateRange = calculateDateRange(period, startDate, endDate);

        // 1. Đếm số đơn đã hoàn thành (theo bộ lọc thời gian)
        const completedOrders = await Reservation.countDocuments({
            assigned_staff: userId,
            status: 'completed',
            updated_at: { $gte: dateRange.current.start, $lt: dateRange.current.end }
        });

        // 2. Tính doanh thu cá nhân (theo bộ lọc thời gian)
        const revenueData = await Reservation.aggregate([
            {
                $match: {
                    assigned_staff: new mongoose.Types.ObjectId(userId),
                    status: 'completed', // ✅ CHỈ TÍNH CÁC ĐƠN ĐÃ HOÀN THÀNH
                    updated_at: { $gte: dateRange.current.start, $lt: dateRange.current.end }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total_amount' }
                }
            }
        ]);
        const personalRevenue = revenueData[0]?.totalRevenue || 0;

        // 3. Đếm số bàn đang phục vụ (luôn là real-time, không theo filter)
        const servingNowCount = await Reservation.countDocuments({
            assigned_staff: userId,
            status: 'seated'
        });

        res.json({
            success: true,
            data: {
                servingNowCount,
                completedOrders,
                personalRevenue,
            }
        });

    } catch (error) {
        console.error('Error in waiterDashboard stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// API lấy bàn của waiter
const getWaiterTables = async (req, res) => {
    try {
        const userId = req.user.userId;
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        // Chỉ lấy các reservation có status 'seated' và được assign cho waiter này
        const servingReservations = await Reservation.find({
            assigned_staff: new mongoose.Types.ObjectId(userId),
            date: { $gte: todayStart, $lt: todayEnd },
            status: 'seated'
        }).populate('table_ids', 'name');

        const tables = servingReservations.map(reservation => {
            const tableName = reservation.table_ids.map(t => t.name).join(', ');
            return {
                id: reservation._id,
                name: tableName || 'Bàn không tên',
                customers: reservation.guest_count || 0,
                orderTime: reservation.slot_start_time,
                currentOrderValue: reservation.total_amount || 0,
                reservationId: reservation._id
            };
        });

        res.json({
            success: true,
            data: tables
        });

    } catch (error) {
        console.error('Error getting serving tables for waiter:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getWaiterOrders = async (req, res) => {
    try {
        const userId = req.user.userId;
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const reservationsNeedProcessing = await Reservation.find({
            $and: [
                { date: { $gte: todayStart, $lt: todayEnd } },
                {
                    $or: [
                        { status: 'pending' },
                        { status: 'confirmed' },
                        {
                            status: 'seated',
                            assigned_staff: new mongoose.Types.ObjectId(userId)
                        }
                    ]
                }
            ]
        })
            .populate('table_id table_ids', 'name')
            .populate('customer_id', 'full_name username phone')
            .sort({ created_at: -1 })
            .limit(20);

        const formattedReservations = reservationsNeedProcessing.map(reservation => {
            const table = reservation.table_id || (reservation.table_ids && reservation.table_ids[0]);

            // Format ngày giờ chi tiết
            const bookingDateTime = new Date(reservation.created_at).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const diningDate = new Date(reservation.date).toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            return {
                id: `#${reservation._id.toString().slice(-6)}`,
                reservationId: reservation._id,
                table: table?.name || 'Chưa có bàn',
                status: reservation.status,
                customer: reservation.customer_id?.full_name || reservation.contact_name,
                phone: reservation.contact_phone,
                bookingDateTime: bookingDateTime, // Thời gian khách đặt
                diningDate: diningDate, // Ngày ăn
                slotTime: `${reservation.slot_start_time} - ${reservation.slot_end_time}`,
                guestCount: reservation.guest_count,
                priority: getPriorityByStatus(reservation.status),
                totalValue: reservation.total_amount || 0
            };
        });

        res.json({
            success: true,
            data: formattedReservations
        });

    } catch (error) {
        console.error('Error getting waiter reservations:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đặt bàn cần xử lý',
            error: error.message
        });
    }
};

const getPriorityByStatus = (status) => {
    switch (status) {
        case 'pending': return 'urgent';    // Chờ xác nhận = khẩn cấp
        case 'confirmed': return 'high';    // Đã xác nhận, chờ khách đến = cao
        case 'seated': return 'normal';     // Khách đã vào bàn = bình thường
        default: return 'normal';
    }
};

// Thống kê tỷ lệ hoàn thành đơn và hủy đơn
const getOrderCompletionStats = async (req, res) => {
    try {
        const { period = 'month', startDate, endDate } = req.query;
        const dateRange = calculateDateRange(period, startDate, endDate);

        // Đếm số lượng đơn theo từng trạng thái
        const statusCounts = await Reservation.aggregate([
            {
                $match: {
                    created_at: { $gte: dateRange.start, $lt: dateRange.end }
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Tính tổng số đơn hàng
        const totalOrders = statusCounts.reduce((sum, item) => sum + item.count, 0);
        
        // Tạo object chứa số lượng từng trạng thái
        const statusData = {};
        statusCounts.forEach(item => {
            statusData[item._id] = {
                count: item.count,
                percentage: Math.round((item.count / totalOrders) * 100)
            };
        });

        // Tính tỷ lệ hoàn thành và hủy
        const completionRate = statusData.completed ? statusData.completed.percentage : 0;
        const cancellationRate = statusData.cancelled ? statusData.cancelled.percentage : 0;

        // Lấy thống kê theo ngày
        const dailyStats = await Reservation.aggregate([
            {
                $match: {
                    created_at: { $gte: dateRange.start, $lt: dateRange.end }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                        status: "$status"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    statuses: {
                        $push: {
                            status: "$_id.status",
                            count: "$count"
                        }
                    },
                    totalForDay: { $sum: "$count" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Format dữ liệu cho biểu đồ
        const chartData = dailyStats.map(day => {
            const result = {
                date: day._id,
                total: day.totalForDay
            };
            
            // Thêm từng trạng thái vào kết quả
            day.statuses.forEach(statusItem => {
                result[statusItem.status] = statusItem.count;
                // Tính phần trăm cho mỗi trạng thái
                result[`${statusItem.status}Percentage`] = Math.round((statusItem.count / day.totalForDay) * 100);
            });
            
            return result;
        });

        res.json({
            success: true,
            data: {
                totalOrders,
                statusData,
                completionRate,
                cancellationRate,
                chartData
            }
        });
    } catch (error) {
        console.error('Error in getOrderCompletionStats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê hoàn thành đơn',
            error: error.message
        });
    }
};


const getWaiterNotifications = async (req, res) => {
    try {
        // Fallback notifications
        const fallbackNotifications = [
            {
                id: 1,
                type: 'order_ready',
                message: 'Đơn hàng #DEMO1 đã sẵn sàng phục vụ',
                time: '2 phút trước',
                urgent: true
            },
            {
                id: 2,
                type: 'checkin_ready',
                message: 'Bàn 5 có khách đặt lúc 19:30 cần check-in',
                time: '5 phút trước',
                urgent: false
            }
        ];

        res.json({
            success: true,
            data: fallbackNotifications
        });

    } catch (error) {
        console.error('Error getting waiter notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông báo',
            error: error.message
        });
    }
};

// Thống kê khách hàng đặt nhiều đơn nhất
const getTopCustomers = async (req, res) => {
    try {
        const { period = 'month', startDate, endDate, limit = 10 } = req.query;
        const dateRange = calculateDateRange(period, startDate, endDate);
        
        console.log(`getTopCustomers: period=${period}, start=${dateRange.start}, end=${dateRange.end}`);
        
        // Thống kê theo số điện thoại từ reservations
        const reservationCustomers = await Reservation.aggregate([
            {
                $match: {
                    date: { $gte: dateRange.start, $lt: dateRange.end },
                    contact_phone: { $exists: true, $ne: "" }
                }
            },
            {
                $lookup: {
                    from: "menuitems",
                    localField: "pre_order_items.menu_item_id",
                    foreignField: "_id",
                    as: "menuItems"
                }
            },
            {
                $project: {
                    contact_phone: 1,
                    contact_name: 1,
                    total_amount: 1,
                    pre_order_items: 1,
                    menuItems: 1,
                    calculatedTotal: {
                        $reduce: {
                            input: "$pre_order_items",
                            initialValue: 0,
                            in: {
                                $sum: [
                                    "$$value",
                                    {
                                        $multiply: [
                                            "$$this.quantity",
                                            {
                                                $ifNull: [
                                                    {
                                                        $arrayElemAt: [
                                                            "$menuItems.price",
                                                            {
                                                                $indexOfArray: [
                                                                    "$menuItems._id",
                                                                    "$$this.menu_item_id"
                                                                ]
                                                            }
                                                        ]
                                                    },
                                                    0
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$contact_phone",
                    name: { $first: "$contact_name" },
                    orderCount: { $sum: 1 },
                    totalSpent: {
                        $sum: {
                            $cond: {
                                if: { $gt: ["$total_amount", 0] },
                                then: "$total_amount",
                                else: "$calculatedTotal"
                            }
                        }
                    }
                }
            }
        ]);
        
        console.log("Reservation customers:", JSON.stringify(reservationCustomers, null, 2));
        
        // Thống kê theo số điện thoại từ orders
        const orderCustomers = await Order.aggregate([
            {
                $match: {
                    created_at: { $gte: dateRange.start, $lt: dateRange.end },
                    contact_phone: { $exists: true, $ne: "" },
                    status: { $in: ['completed', 'served'] }
                }
            },
            {
                $unwind: "$order_items"
            },
            {
                $group: {
                    _id: "$contact_phone",
                    name: { $first: "$contact_name" },
                    orderCount: { $sum: 1 },
                    totalSpent: { $sum: { $multiply: ["$order_items.quantity", "$order_items.price"] } }
                }
            }
        ]);
        
        console.log("Order customers:", JSON.stringify(orderCustomers, null, 2));
        
        // Gộp dữ liệu từ cả hai nguồn
        const phoneMap = new Map();
        
        // Thêm dữ liệu từ reservations
        reservationCustomers.forEach(customer => {
            phoneMap.set(customer._id, {
                phone: customer._id,
                name: customer.name || 'Khách hàng',
                orderCount: customer.orderCount,
                totalSpent: customer.totalSpent || 0
            });
        });
        
        // Thêm hoặc cập nhật dữ liệu từ orders
        orderCustomers.forEach(customer => {
            if (phoneMap.has(customer._id)) {
                // Cập nhật nếu số điện thoại đã tồn tại
                const existing = phoneMap.get(customer._id);
                phoneMap.set(customer._id, {
                    ...existing,
                    orderCount: existing.orderCount + customer.orderCount,
                    totalSpent: existing.totalSpent + (customer.totalSpent || 0)
                });
            } else {
                // Thêm mới nếu chưa có
                phoneMap.set(customer._id, {
                    phone: customer._id,
                    name: customer.name || 'Khách hàng',
                    orderCount: customer.orderCount,
                    totalSpent: customer.totalSpent || 0
                });
            }
        });
        
        // Chuyển Map thành mảng và sắp xếp
        const combinedCustomers = Array.from(phoneMap.values())
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, parseInt(limit));

        // Log chi tiết từng khách hàng
        combinedCustomers.forEach((customer, index) => {
            console.log(`Customer ${index + 1}: ${customer.name} (${customer.phone}) - ${customer.orderCount} orders - ${customer.totalSpent} VND`);
        });

        // Tính tổng doanh thu để so sánh
        const totalRevenue = combinedCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);
        console.log(`Total customer spending: ${totalRevenue} VND`);

        res.json({
            success: true,
            data: combinedCustomers,
            period: { from: dateRange.start, to: dateRange.end }
        });
    } catch (error) {
        console.error('Error in getTopCustomers:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê khách hàng',
            error: error.message
        });
    }
};

module.exports = {
    chefDashboard,
    managerDashboard,
    adminDashboard,
    waiterDashboard,
    kitchenStaffDashboard,
    getStaffStatus,
    getRecentReservations,
    waiterDashboard,
    getWaiterTables,
    getWaiterOrders,
    getWaiterNotifications,
    adminStats,
    adminEmployeePerformance,
    adminTopProducts,
    getBusiestBookingSlot,
    getPromotionStats,
    getOrderCompletionStats,
    getTopCustomers
}