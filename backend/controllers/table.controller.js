const Table = require('../models/table.model');

// Get all tables
exports.getAllTables = async (req, res) => {
    try {
        const tables = await Table.find()
            .populate('area_id', 'name')
            .sort({ name: 1 });
        res.json(tables);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get tables by area
exports.getTablesByArea = async (req, res) => {
    try {
        const tables = await Table.find({ area_id: req.params.areaId })
            .populate('area_id', 'name')
            .sort({ name: 1 });
        res.json(tables);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get table by ID
exports.getTable = async (req, res) => {
    try {
        const table = await Table.findById(req.params.id)
            .populate('area_id', 'name');

        if (!table) {
            return res.status(404).json({ message: 'Không tìm thấy bàn' });
        }

        res.json(table);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update table status
exports.updateTableStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const table = await Table.findById(req.params.id);

        if (!table) {
            return res.status(404).json({ message: 'Không tìm thấy bàn' });
        }

        table.status = status;
        await table.save();

        res.json(table);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};