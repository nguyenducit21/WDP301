const Table = require('../models/table.model');
const Area = require('../models/area.model');
const Reservation = require('../models/reservation.model');
const Order = require('../models/order.model');

// Lấy tất cả bàn theo khu vực
const getTables = async (req, res) => {
    try {
        const { area_id, date, page = 1, limit = 18 } = req.query;

        let filter = {};
        if (area_id) {
            filter.area_id = area_id;
        }

        const tables = await Table.find(filter)
            .populate('area_id', 'name')
            .sort({ name: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        //  Nếu có ngày được chọn, kiểm tra trạng thái reservation cho ngày đó
        let tablesWithStatus = tables;
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            // Lấy tất cả reservation của ngày được chọn
            const reservations = await Reservation.find({
                date: { $gte: startDate, $lte: endDate },
                status: { $in: ['pending', 'confirmed', 'seated'] }
            }).select('table_id');

            const reservedTableIds = new Set(reservations.map(r => r.table_id.toString()));

            // Thêm trạng thái isReserved cho từng bàn
            tablesWithStatus = tables.map(table => ({
                ...table.toObject(),
                isReserved: reservedTableIds.has(table._id.toString())
            }));
        } else {
            // Nếu không có ngày, trả về trạng thái bàn hiện tại
            tablesWithStatus = tables.map(table => ({
                ...table.toObject(),
                isReserved: false // Mặc định không có reservation
            }));
        }

        const total = await Table.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: tablesWithStatus,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalTables: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bàn',
            error: error.message
        });
    }
};


// Lấy chi tiết một bàn
const getTableById = async (req, res) => {
    try {
        const table = await Table.findById(req.params.id)
            .populate('area_id', 'name description');

        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
            });
        }

        // Lấy thông tin đặt bàn hiện tại
        const currentReservations = await Reservation.find({
            table_id: req.params.id,
            status: { $in: ['confirmed', 'pending'] }
        }).populate('customer_id', 'name email phone');

        res.status(200).json({
            success: true,
            data: {
                table,
                reservations: currentReservations
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin bàn',
            error: error.message
        });
    }
};

// Tạo bàn mới
const createTable = async (req, res) => {
    try {
        const { name, area_id, type, capacity, description } = req.body;

        // Kiểm tra area_id có tồn tại
        const area = await Area.findById(area_id);
        if (!area) {
            return res.status(400).json({
                success: false,
                message: 'Khu vực không tồn tại'
            });
        }
        if (!name || !area_id || !type || !capacity) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc',
                received: req.body
            });
        }

        // Kiểm tra tên bàn đã tồn tại trong khu vực
        const existingTable = await Table.findOne({ name, area_id });
        if (existingTable) {
            return res.status(400).json({
                success: false,
                message: 'Tên bàn đã tồn tại trong khu vực này'
            });
        }

        const table = new Table({
            name,
            area_id,
            type,
            capacity,
            description,
            status: 'available'
        });

        await table.save();
        await table.populate('area_id', 'name');

        res.status(201).json({
            success: true,
            message: 'Tạo bàn thành công',
            data: table
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo bàn',
            error: error.message
        });
    }
};

// Cập nhật thông tin bàn
const updateTable = async (req, res) => {
    try {
        const { name, type, capacity, description, status } = req.body;

        // Kiểm tra quyền admin/manager
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền thực hiện thao tác này'
            });
        }

        const table = await Table.findById(req.params.id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
            });
        }

        // Kiểm tra nếu đổi tên bàn thì không trùng với bàn khác trong cùng khu vực
        if (name && name !== table.name) {
            const existingTable = await Table.findOne({
                name,
                area_id: table.area_id,
                _id: { $ne: req.params.id }
            });
            if (existingTable) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên bàn đã tồn tại trong khu vực này'
                });
            }
        }

        const updatedTable = await Table.findByIdAndUpdate(
            req.params.id,
            {
                ...(name && { name }),
                ...(type && { type }),
                ...(capacity && { capacity }),
                ...(description !== undefined && { description }),
                ...(status && { status }),
                updated_at: new Date()
            },
            { new: true, runValidators: true }
        ).populate('area_id', 'name');

        res.status(200).json({
            success: true,
            message: 'Cập nhật bàn thành công',
            data: updatedTable
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật bàn',
            error: error.message
        });
    }
};

// Xóa bàn
const deleteTable = async (req, res) => {
    try {
        // Kiểm tra quyền admin/manager
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền thực hiện thao tác này'
            });
        }

        const table = await Table.findById(req.params.id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
            });
        }

        //  Chỉ kiểm tra đặt bàn từ hôm nay trở đi
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureReservations = await Reservation.find({
            table_id: req.params.id,
            date: { $gte: today },
            status: { $in: ['confirmed', 'pending', 'seated'] }
        });

        if (futureReservations.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa bàn vì có đặt bàn trong tương lai'
            });
        }

        await Table.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Xóa bàn thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa bàn',
            error: error.message
        });
    }
};

const cleaningCompleted = async (req, res) => {
    try {
        const table = await Table.findById(req.params.id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
            });
        }

        if (table.status !== 'cleaning') {
            return res.status(400).json({
                success: false,
                message: 'Bàn không đang trong trạng thái dọn dẹp'
            });
        }

        // Cập nhật trạng thái về available
        table.status = 'available';
        table.updated_at = new Date();
        await table.save();

        await table.populate('area_id', 'name');

        res.status(200).json({
            success: true,
            message: 'Đã hoàn thành dọn bàn',
            data: table
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái bàn',
            error: error.message
        });
    }
};

// Cập nhật trạng thái bàn
const updateTableStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['available', 'reserved', 'occupied', 'maintenance'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái bàn không hợp lệ'
            });
        }

        const table = await Table.findByIdAndUpdate(
            req.params.id,
            {
                status,
                updated_at: new Date()
            },
            { new: true }
        ).populate('area_id', 'name');

        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái bàn thành công',
            data: table
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái bàn',
            error: error.message
        });
    }
};

module.exports = {
    getTables,
    getTableById,
    createTable,
    updateTable,
    deleteTable,
    updateTableStatus,
    cleaningCompleted
};
