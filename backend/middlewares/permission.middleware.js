const User = require('../models/user.model');
const Role = require('../models/role.model');
const Permission = require('../models/permission.model');

/**
 * Middleware kiểm tra quyền chi tiết dựa trên permissions
 * @param {String|Array} requiredPermissions - Permission hoặc mảng permissions cần thiết
 * @param {Object} options - Tùy chọn bổ sung
 * @param {Boolean} options.requireAll - Yêu cầu có tất cả permissions (default: false - chỉ cần 1)
 */
const permissionMiddleware = (requiredPermissions, options = {}) => {
    return async (req, res, next) => {
        try {
            // Lấy thông tin user từ authMiddleware
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Không tìm thấy thông tin người dùng"
                });
            }

            // Lấy thông tin user đầy đủ với role và permissions
            const fullUser = await User.findById(user.userId)
                .populate({
                    path: 'role_id',
                    populate: {
                        path: 'permissions',
                        model: 'Permission'
                    }
                });

            if (!fullUser || !fullUser.role_id) {
                return res.status(401).json({
                    success: false,
                    message: "Không tìm thấy thông tin vai trò"
                });
            }

            // Admin có tất cả quyền
            if (fullUser.role_id.name === 'admin') {
                req.userPermissions = fullUser.role_id.permissions;
                return next();
            }

            // Lấy danh sách permissions của user
            const userPermissions = fullUser.role_id.permissions || [];
            const userPermissionNames = userPermissions.map(p => p.name);

            // Chuẩn hóa requiredPermissions thành array
            const requiredPerms = Array.isArray(requiredPermissions) 
                ? requiredPermissions 
                : [requiredPermissions];

            // Kiểm tra quyền
            let hasPermission = false;
            
            if (options.requireAll) {
                // Yêu cầu có tất cả permissions
                hasPermission = requiredPerms.every(perm => userPermissionNames.includes(perm));
            } else {
                // Chỉ cần có ít nhất 1 permission
                hasPermission = requiredPerms.some(perm => userPermissionNames.includes(perm));
            }

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Bạn không có quyền thực hiện hành động này. Cần quyền: ${requiredPerms.join(', ')}`
                });
            }

            // Thêm thông tin permissions vào req để controller có thể sử dụng
            req.userPermissions = userPermissions;
            req.userPermissionNames = userPermissionNames;

            next();
        } catch (error) {
            console.error('Lỗi kiểm tra quyền:', error);
            return res.status(500).json({
                success: false,
                message: "Lỗi server khi kiểm tra quyền",
                error: error.message
            });
        }
    };
};

/**
 * Middleware kiểm tra quyền dựa trên resource và action
 * @param {String} resource - Tài nguyên (users, menu_items, orders, etc.)
 * @param {String} action - Hành động (create, read, update, delete, manage)
 */
const resourcePermissionMiddleware = (resource, action) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Không tìm thấy thông tin người dùng"
                });
            }

            // Lấy thông tin user đầy đủ với role và permissions
            const fullUser = await User.findById(user.userId)
                .populate({
                    path: 'role_id',
                    populate: {
                        path: 'permissions',
                        model: 'Permission'
                    }
                });

            if (!fullUser || !fullUser.role_id) {
                return res.status(401).json({
                    success: false,
                    message: "Không tìm thấy thông tin vai trò"
                });
            }

            // Admin có tất cả quyền
            if (fullUser.role_id.name === 'admin') {
                req.userPermissions = fullUser.role_id.permissions;
                return next();
            }

            // Lấy danh sách permissions của user
            const userPermissions = fullUser.role_id.permissions || [];

            // Kiểm tra quyền cụ thể cho resource và action
            const hasPermission = userPermissions.some(permission => {
                return (permission.resource === resource && 
                       (permission.action === action || permission.action === 'manage'));
            });

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Bạn không có quyền ${action} trên ${resource}`
                });
            }

            // Thêm thông tin permissions vào req
            req.userPermissions = userPermissions;

            next();
        } catch (error) {
            console.error('Lỗi kiểm tra quyền resource:', error);
            return res.status(500).json({
                success: false,
                message: "Lỗi server khi kiểm tra quyền",
                error: error.message
            });
        }
    };
};

/**
 * Helper function để kiểm tra user có permission cụ thể không
 * @param {Object} user - User object với role và permissions
 * @param {String} permissionName - Tên permission cần kiểm tra
 * @returns {Boolean}
 */
const hasPermission = (user, permissionName) => {
    if (!user || !user.role_id || !user.role_id.permissions) {
        return false;
    }

    // Admin có tất cả quyền
    if (user.role_id.name === 'admin') {
        return true;
    }

    return user.role_id.permissions.some(p => p.name === permissionName);
};

/**
 * Helper function để kiểm tra user có quyền trên resource và action không
 * @param {Object} user - User object với role và permissions
 * @param {String} resource - Tài nguyên
 * @param {String} action - Hành động
 * @returns {Boolean}
 */
const hasResourcePermission = (user, resource, action) => {
    if (!user || !user.role_id || !user.role_id.permissions) {
        return false;
    }

    // Admin có tất cả quyền
    if (user.role_id.name === 'admin') {
        return true;
    }

    return user.role_id.permissions.some(permission => {
        return (permission.resource === resource && 
               (permission.action === action || permission.action === 'manage'));
    });
};

module.exports = {
    permissionMiddleware,
    resourcePermissionMiddleware,
    hasPermission,
    hasResourcePermission
};
