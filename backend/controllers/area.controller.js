const Area = require('../models/area.model');
const Table = require('../models/table.model');

// Lấy tất cả khu vực
const getAreas = async (req, res) => {
    try {
        const areas = await Area.find().sort({ name: 1 });

        // Đếm số bàn trong mỗi khu vực
        const areasWithTableCount = await Promise.all(
            areas.map(async (area) => {
                const tableCount = await Table.countDocuments({ area_id: area._id });
                return {
                    ...area.toObject(),
                    tableCount
                };
            })
        );

        res.status(200).json({
            success: true,
            data: areasWithTableCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách khu vực',
            error: error.message
        });
    }
};

// Lấy chi tiết khu vực
const getAreaById = async (req, res) => {
    try {
        const area = await Area.findById(req.params.id);
        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy khu vực'
            });
        }

        // Lấy danh sách bàn trong khu vực
        const tables = await Table.find({ area_id: req.params.id }).sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: {
                area,
                tables
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin khu vực',
            error: error.message
        });
    }
};

// Tạo khu vực mới
const createArea = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Kiểm tra quyền admin/manager
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền thực hiện thao tác này'
            });
        }

        const existingArea = await Area.findOne({ name });
        if (existingArea) {
            return res.status(400).json({
                success: false,
                message: 'Tên khu vực đã tồn tại'
            });
        }

        const area = new Area({
            name,
            description
        });

        await area.save();

        res.status(201).json({
            success: true,
            message: 'Tạo khu vực thành công',
            data: area
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo khu vực',
            error: error.message
        });
    }
};

// Cập nhật khu vực
const updateArea = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Kiểm tra quyền admin/manager
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền thực hiện thao tác này'
            });
        }

        const area = await Area.findById(req.params.id);
        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy khu vực'
            });
        }

        // Kiểm tra tên không trùng với khu vực khác
        if (name && name !== area.name) {
            const existingArea = await Area.findOne({
                name,
                _id: { $ne: req.params.id }
            });
            if (existingArea) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên khu vực đã tồn tại'
                });
            }
        }

        const updatedArea = await Area.findByIdAndUpdate(
            req.params.id,
            {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                updated_at: new Date()
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Cập nhật khu vực thành công',
            data: updatedArea
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật khu vực',
            error: error.message
        });
    }
};

// Xóa khu vực
const deleteArea = async (req, res) => {
    try {
        // Kiểm tra quyền admin/manager
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền thực hiện thao tác này'
            });
        }

        const area = await Area.findById(req.params.id);
        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy khu vực'
            });
        }

        // Kiểm tra có bàn nào trong khu vực không
        const tableCount = await Table.countDocuments({ area_id: req.params.id });
        if (tableCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa khu vực vì còn có bàn'
            });
        }

        await Area.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Xóa khu vực thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa khu vực',
            error: error.message
        });
    }
};

module.exports = {
    getAreas,
    getAreaById,
    createArea,
    updateArea,
    deleteArea
};
