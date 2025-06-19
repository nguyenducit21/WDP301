const express = require('express');
const router = express.Router();
const {
    getAreas,
    getAreaById,
    createArea,
    updateArea,
    deleteArea
} = require('../controllers/area.controller');

// Lấy tất cả khu vực
router.get('/', getAreas);

// Lấy chi tiết khu vực
router.get('/:id', getAreaById);

// Tạo khu vực mới
router.post('/', createArea);

// Cập nhật khu vực
router.put('/:id', updateArea);

// Xóa khu vực
router.delete('/:id', deleteArea);

module.exports = router;
