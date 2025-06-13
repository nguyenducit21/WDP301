const express = require('express');
const router = express.Router();
const MenuItem = require("../models/menuItems.model");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
    deleteMany
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

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads");
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});

const upload = multer({ storage: storage });

// Image upload route
router.post('/upload', upload.array("images"), async (req, res) => {
    try {
        const uploadedUrls = [];
        for (let i = 0; i < req.files.length; i++) {
            const options = {
                use_filename: true,
                unique_filename: false,
                overwrite: false,
                folder: "menu_items"
            };

            const result = await cloudinary.uploader.upload(req.files[i].path, options);
            uploadedUrls.push(result.secure_url);
            // Clean up the temporary file
            fs.unlinkSync(req.files[i].path);
        }

        res.status(200).json({
            success: true,
            data: uploadedUrls
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
router.get('/deleted', authMiddleware, roleMiddleware(['chef']), (req, res, next) => {
    req.query.deleted = 'true';
    next();
}, getAllMenuItems);
router.delete('/:id', authMiddleware, roleMiddleware(['chef']), deleteMenuItem);
router.put('/:id', authMiddleware, roleMiddleware(['chef']), upload.single('image'), updateMenuItem);
router.get('/:id', authMiddleware, roleMiddleware(['chef']), getMenuItemById);
router.post('/delete-many', authMiddleware, roleMiddleware(['chef']), deleteMany);
router.put('/:id/restore', authMiddleware, roleMiddleware(['chef']), restoreMenuItem);

module.exports = router;