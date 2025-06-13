const express = require('express');
const router = express.Router();
const MenuItem = require("../models/menuItems.model");
const multer = require('multer');
const cloudinary = require("cloudinary").v2;
const {
    getAllMenuItems,
    getMenuItemById,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getFeaturedMenuItems,
    getMenuItemsByCategory,
    restoreMenuItem,
    deleteMany,
    getMenuItemDeleted
} = require('../controllers/menuItem.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.cloudinary_Config_Cloud_Name,
    api_key: process.env.cloudinary_Config_api_key,
    api_secret: process.env.cloudinary_Config_api_secret,
    secure: true
});

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Image upload route
router.post('/upload', upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: "menu_items",
            use_filename: true,
            unique_filename: true,
            overwrite: false,
        });

        res.status(200).json({
            success: true,
            data: result.secure_url
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ROUTE PUBLIC (cho KH xem)
router.get('/', getAllMenuItems);
router.get('/featured/items', getFeaturedMenuItems);
router.get('/category/:categoryId', getMenuItemsByCategory);

// ROUTE CHEF
router.post('/', authMiddleware, roleMiddleware(['chef']), upload.single('image'), createMenuItem);
router.get('/deleted', authMiddleware, roleMiddleware(['chef']), getMenuItemDeleted);
router.delete('/:id', authMiddleware, roleMiddleware(['chef']), deleteMenuItem);
router.put('/:id', authMiddleware, roleMiddleware(['chef']), upload.single('image'), updateMenuItem);
router.get('/:id', authMiddleware, roleMiddleware(['chef']), getMenuItemById);
router.post('/delete-many', authMiddleware, roleMiddleware(['chef']), deleteMany);
router.put('/:id/restore', authMiddleware, roleMiddleware(['chef']), restoreMenuItem);

module.exports = router;