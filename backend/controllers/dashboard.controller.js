// controller/dashboard.controller.js
const mongoose = require('mongoose');
const MenuItem = require('../models/menuItems.model');
const Category = require('../models/category.model');
const Order = require('../models/order.model');
const Reservation = require('../models/reservation.model');
const User = require('../models/user.model');
const Table = require('../models/table.model');
const Role = require('../models/role.model');

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
  
      case 'custom':
        queryStart = new Date(startDate);
        queryEnd = new Date(endDate);
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
  
    // 👉 Return cả dạng current/previous và start/end (để backward compatible)
    return {
      start: queryStart,
      end: queryEnd,
      current: { start: queryStart, end: queryEnd },
      previous: { start: previousStart, end: previousEnd }
    };
  };
//   const calculateDateRange = (period, startDate = null, endDate = null) => {
//     const today = new Date();
//     let queryStart, queryEnd, previousStart, previousEnd;

//     switch (period) {
//         case 'today':
//             queryStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
//             queryEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
//             previousStart = new Date(queryStart.getTime() - 24 * 60 * 60 * 1000);
//             previousEnd = new Date(queryStart);
//             break;
        
//         case 'week':
//             queryEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
//             queryStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
//             previousEnd = new Date(queryStart);
//             previousStart = new Date(queryStart.getTime() - 7 * 24 * 60 * 60 * 1000);
//             break;
        
//         case 'month':
//             queryEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
//             queryStart = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
//             previousEnd = new Date(queryStart);
//             previousStart = new Date(queryStart.getTime() - 30 * 24 * 60 * 60 * 1000);
//             break;
        
//         case 'custom':
//             queryStart = new Date(startDate);
//             queryEnd = new Date(endDate);
//             queryEnd.setDate(queryEnd.getDate() + 1);
//             const diffDays = Math.ceil((queryEnd - queryStart) / (24 * 60 * 60 * 1000));
//             previousEnd = new Date(queryStart);
//             previousStart = new Date(queryStart.getTime() - diffDays * 24 * 60 * 60 * 1000);
//             break;
        
//         default:
//             queryStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
//             queryEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
//             previousStart = new Date(queryStart.getTime() - 24 * 60 * 60 * 1000);
//             previousEnd = new Date(queryStart);
//     }

//     return {
//         current: { start: queryStart, end: queryEnd },
//         previous: { start: previousStart, end: previousEnd }
//     };
// };
  // Admin Dashboard - Hoá đơn, doanh thu, khách hàng, biểu đồ
  const adminStats = async (req, res) => {
    try {
      const { period = 'today', startDate, endDate } = req.query;
      const dateRange = calculateDateRange(period, startDate, endDate);
  
      // Doanh thu từ Orders
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
      ]).catch(() => [{ totalRevenue: 0, totalOrders: 0 }]);
  
      // Doanh thu từ Reservations
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
      ]).catch(() => [{ totalRevenue: 0, totalReservations: 0 }]);
  
      const orderRev = ordersRevenue || { totalRevenue: 0, totalOrders: 0 };
      const reservationRev = reservationsRevenue || { totalRevenue: 0, totalReservations: 0 };
  
      const totalRevenue = (orderRev.totalRevenue || 0) + (reservationRev.totalRevenue || 0);
      const totalInvoices = (orderRev.totalOrders || 0) + (reservationRev.totalReservations || 0);
  
      // Khách hàng mới
      const orderCustomerIds = await Order.find({
        created_at: { $gte: dateRange.start, $lt: dateRange.end },
        customer_id: { $exists: true, $ne: null }
      }).distinct('customer_id');
  
      const reservationCustomerIds = await Reservation.find({
        date: { $gte: dateRange.start, $lt: dateRange.end },
        customer_id: { $exists: true, $ne: null }
      }).distinct('customer_id');
  
      const allCustomerIds = Array.from(new Set([...orderCustomerIds, ...reservationCustomerIds]));
  
      const newCustomers = await User.countDocuments({
        _id: { $in: allCustomerIds.map(id => new mongoose.Types.ObjectId(id)) },
        created_at: { $gte: dateRange.start, $lt: dateRange.end }
      });
  
      // Chart data (gộp từ order & reservation)
      const chartMap = {};
  
      const orders = await Order.find({
        created_at: { $gte: dateRange.start, $lt: dateRange.end },
        status: { $in: ['completed', 'served'] },
        order_items: { $exists: true, $ne: [] }
      });
      orders.forEach(order => {
        const dateStr = new Date(order.created_at).toISOString().slice(0, 10);
        const revenue = order.order_items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        chartMap[dateStr] = (chartMap[dateStr] || 0) + revenue;
      });
  
      const reservations = await Reservation.find({
        date: { $gte: dateRange.start, $lt: dateRange.end },
        payment_status: 'paid',
        pre_order_items: { $exists: true, $ne: [] }
      }).populate('pre_order_items.menu_item_id');
      reservations.forEach(rsv => {
        const dateStr = new Date(rsv.date).toISOString().slice(0, 10);
        const revenue = rsv.pre_order_items.reduce((sum, item) => {
          return sum + item.quantity * (item.menu_item_id?.price || 0);
        }, 0);
        chartMap[dateStr] = (chartMap[dateStr] || 0) + revenue;
      });
  
      const chartData = Object.entries(chartMap).map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
  
      res.json({
        success: true,
        data: {
          totalInvoices,
          totalRevenue,
          newCustomers,
          chartData
        }
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

        // 1. Từ Reservation (pre-order)
        const reservationData = await Reservation.aggregate([
            {
                $match: {
                    assigned_staff: { $ne: null },
                    status: 'completed',
                    updated_at: { $gte: start, $lt: end }
                }
            },
            {
                $group: {
                    _id: '$assigned_staff',
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total_amount' }
                }
            }
        ]);

        // 2. Từ Order (gọi món thêm)
        const orderData = await Order.aggregate([
            {
                $match: {
                    staff_id: { $ne: null },
                    status: 'completed',
                    updated_at: { $gte: start, $lt: end }
                }
            },
            { $unwind: '$order_items' },
            {
                $group: {
                    _id: '$staff_id',
                    orders: { $sum: 1 }, // mỗi đơn là 1 order
                    revenue: {
                        $sum: {
                            $multiply: ['$order_items.quantity', '$order_items.price']
                        }
                    }
                }
            }
        ]);

        // 3. Gộp dữ liệu theo staff
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

        // 4. Lấy thông tin nhân viên
        const staffIds = Array.from(combinedMap.keys()).map(id => new mongoose.Types.ObjectId(id));
        const staffs = await User.find({ _id: { $in: staffIds } });

        const results = staffs.map(staff => {
            const id = staff._id.toString();
            const data = combinedMap.get(id) || { orders: 0, revenue: 0 };

            return {
                staffId: id,
                staffName: staff.full_name || staff.username,
                orders: data.orders,
                revenue: data.revenue
            };
        });

        // 5. Sắp xếp theo doanh thu
        results.sort((a, b) => b.revenue - a.revenue);

        res.json({ success: true, data: results.slice(0, 10) }); // top 10
    } catch (error) {
        console.error('Admin Employee Performance Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

  const adminTopProducts = async (req, res) => {
    try {
      const { period = 'today', startDate, endDate, limit = 5 } = req.query;
      const { start, end } = calculateDateRange(period, startDate, endDate);
  
      // Từ đơn hàng
      const orderItems = await Order.aggregate([
        { $match: { created_at: { $gte: start, $lte: end }, status: { $in: ['completed', 'served'] } } },
        { $unwind: '$order_items' },
        {
          $group: {
            _id: '$order_items.menu_item_id',
            quantitySold: { $sum: '$order_items.quantity' }
          }
        }
      ]);
  
      // Từ đặt bàn
      const reservationItems = await Reservation.aggregate([
        { $match: { date: { $gte: start, $lte: end }, payment_status: 'paid' } },
        { $unwind: '$pre_order_items' },
        {
          $group: {
            _id: '$pre_order_items.menu_item_id',
            quantitySold: { $sum: '$pre_order_items.quantity' }
          }
        }
      ]);
  
      const combinedMap = new Map();
      [...orderItems, ...reservationItems].forEach(item => {
        const id = item._id?.toString();
        if (!id) return;
        combinedMap.set(id, (combinedMap.get(id) || 0) + item.quantitySold);
      });
  
      const itemIds = Array.from(combinedMap.keys()).map(id => new mongoose.Types.ObjectId(id));
      const menuItems = await MenuItem.find({ _id: { $in: itemIds } }).populate('category_id');
  
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
            updated_at: { $gte: dateRange.current.start, $lt: dateRange.current.end } // Dựa vào ngày hoàn thành
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
    switch(status) {
        case 'pending': return 'urgent';    // Chờ xác nhận = khẩn cấp
        case 'confirmed': return 'high';    // Đã xác nhận, chờ khách đến = cao
        case 'seated': return 'normal';     // Khách đã vào bàn = bình thường
        default: return 'normal';
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
    adminTopProducts
}