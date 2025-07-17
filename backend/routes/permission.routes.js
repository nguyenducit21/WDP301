const express = require('express');
const router = express.Router();
const {
    getAllPermissions,
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    assignPermissionsToRole,
    getPermissionsMatrix
} = require('../controllers/permission.controller');

const authMiddleware = require('../middlewares/auth.middleware');
const { permissionMiddleware } = require('../middlewares/permission.middleware');

// Permission routes
router.get('/permissions', authMiddleware, permissionMiddleware('manage_permission'), getAllPermissions);
router.get('/matrix', authMiddleware, permissionMiddleware('manage_permission'), getPermissionsMatrix);

// Role routes
router.get('/roles', authMiddleware, permissionMiddleware('read_role'), getAllRoles);
router.get('/roles/:id', authMiddleware, permissionMiddleware('read_role'), getRoleById);
router.post('/roles', authMiddleware, permissionMiddleware('create_role'), createRole);
router.put('/roles/:id', authMiddleware, permissionMiddleware('update_role'), updateRole);
router.delete('/roles/:id', authMiddleware, permissionMiddleware('delete_role'), deleteRole);
router.put('/roles/:id/permissions', authMiddleware, permissionMiddleware('manage_permission'), assignPermissionsToRole);

module.exports = router;
