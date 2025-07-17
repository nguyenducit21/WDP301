const Permission = require('../models/permission.model');
const Role = require('../models/role.model');

// Lấy tất cả permissions
const getAllPermissions = async (req, res) => {
    try {
        const { module = '', resource = '' } = req.query;
        
        const filter = {};
        if (module) filter.module = module;
        if (resource) filter.resource = resource;
        
        const permissions = await Permission.find(filter).sort({ module: 1, resource: 1, action: 1 });
        
        // Group permissions by module
        const groupedPermissions = permissions.reduce((acc, permission) => {
            if (!acc[permission.module]) {
                acc[permission.module] = [];
            }
            acc[permission.module].push(permission);
            return acc;
        }, {});
        
        res.status(200).json({
            success: true,
            data: {
                permissions,
                grouped: groupedPermissions
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách permissions',
            error: error.message
        });
    }
};

// Lấy tất cả roles với permissions
const getAllRoles = async (req, res) => {
    try {
        const roles = await Role.find()
            .populate('permissions', 'name resource action module description')
            .sort({ name: 1 });
        
        res.status(200).json({
            success: true,
            data: roles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách roles',
            error: error.message
        });
    }
};

// Lấy thông tin chi tiết một role
const getRoleById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const role = await Role.findById(id)
            .populate('permissions', 'name resource action module description');
        
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy role'
            });
        }
        
        res.status(200).json({
            success: true,
            data: role
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin role',
            error: error.message
        });
    }
};

// Tạo role mới
const createRole = async (req, res) => {
    try {
        const { name, description, permission_ids = [] } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Tên role là bắt buộc'
            });
        }
        
        // Kiểm tra role đã tồn tại chưa
        const existingRole = await Role.findOne({ name });
        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: 'Role đã tồn tại'
            });
        }
        
        // Kiểm tra permissions có tồn tại không
        if (permission_ids.length > 0) {
            const permissions = await Permission.find({ _id: { $in: permission_ids } });
            if (permissions.length !== permission_ids.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Một số permissions không tồn tại'
                });
            }
        }
        
        // Tạo role mới
        const newRole = new Role({
            name,
            description,
            permissions: permission_ids,
            is_system_role: false
        });
        
        await newRole.save();
        
        // Lấy thông tin role vừa tạo
        const role = await Role.findById(newRole._id)
            .populate('permissions', 'name resource action module description');
        
        res.status(201).json({
            success: true,
            message: 'Tạo role thành công',
            data: role
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo role',
            error: error.message
        });
    }
};

// Cập nhật role
const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permission_ids, status } = req.body;
        
        // Kiểm tra role có tồn tại không
        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy role'
            });
        }
        
        // Không cho phép sửa system role
        if (role.is_system_role && name && name !== role.name) {
            return res.status(400).json({
                success: false,
                message: 'Không thể thay đổi tên của system role'
            });
        }
        
        // Kiểm tra tên role đã tồn tại chưa (nếu thay đổi tên)
        if (name && name !== role.name) {
            const existingRole = await Role.findOne({ name });
            if (existingRole) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên role đã tồn tại'
                });
            }
        }
        
        // Kiểm tra permissions có tồn tại không
        if (permission_ids && permission_ids.length > 0) {
            const permissions = await Permission.find({ _id: { $in: permission_ids } });
            if (permissions.length !== permission_ids.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Một số permissions không tồn tại'
                });
            }
        }
        
        // Chuẩn bị dữ liệu cập nhật
        const updateData = { updated_at: new Date() };
        
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (permission_ids !== undefined) updateData.permissions = permission_ids;
        if (status) updateData.status = status;
        
        // Cập nhật role
        const updatedRole = await Role.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('permissions', 'name resource action module description');
        
        res.status(200).json({
            success: true,
            message: 'Cập nhật role thành công',
            data: updatedRole
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật role',
            error: error.message
        });
    }
};

// Xóa role
const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra role có tồn tại không
        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy role'
            });
        }
        
        // Không cho phép xóa system role
        if (role.is_system_role) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa system role'
            });
        }
        
        // Kiểm tra có user nào đang sử dụng role này không
        const User = require('../models/user.model');
        const usersWithRole = await User.countDocuments({ role_id: id });
        
        if (usersWithRole > 0) {
            return res.status(400).json({
                success: false,
                message: `Không thể xóa role vì có ${usersWithRole} người dùng đang sử dụng`
            });
        }
        
        // Xóa role
        await Role.findByIdAndDelete(id);
        
        res.status(200).json({
            success: true,
            message: 'Xóa role thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa role',
            error: error.message
        });
    }
};

// Gán permissions cho role
const assignPermissionsToRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { permission_ids } = req.body;
        
        if (!permission_ids || !Array.isArray(permission_ids)) {
            return res.status(400).json({
                success: false,
                message: 'Danh sách permissions không hợp lệ'
            });
        }
        
        // Kiểm tra role có tồn tại không
        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy role'
            });
        }
        
        // Kiểm tra permissions có tồn tại không
        const permissions = await Permission.find({ _id: { $in: permission_ids } });
        if (permissions.length !== permission_ids.length) {
            return res.status(400).json({
                success: false,
                message: 'Một số permissions không tồn tại'
            });
        }
        
        // Cập nhật permissions cho role
        const updatedRole = await Role.findByIdAndUpdate(
            id,
            { 
                permissions: permission_ids,
                updated_at: new Date()
            },
            { new: true }
        ).populate('permissions', 'name resource action module description');
        
        res.status(200).json({
            success: true,
            message: 'Gán permissions thành công',
            data: updatedRole
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi gán permissions',
            error: error.message
        });
    }
};

// Lấy permissions matrix (tất cả permissions và roles)
const getPermissionsMatrix = async (req, res) => {
    try {
        const [permissions, roles] = await Promise.all([
            Permission.find().sort({ module: 1, resource: 1, action: 1 }),
            Role.find().populate('permissions').sort({ name: 1 })
        ]);
        
        // Tạo matrix
        const matrix = roles.map(role => {
            const rolePermissions = role.permissions.map(p => p._id.toString());
            return {
                role: {
                    id: role._id,
                    name: role.name,
                    description: role.description,
                    is_system_role: role.is_system_role
                },
                permissions: permissions.map(permission => ({
                    permission: {
                        id: permission._id,
                        name: permission.name,
                        resource: permission.resource,
                        action: permission.action,
                        module: permission.module,
                        description: permission.description
                    },
                    has_permission: rolePermissions.includes(permission._id.toString())
                }))
            };
        });
        
        res.status(200).json({
            success: true,
            data: {
                permissions,
                roles,
                matrix
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy permissions matrix',
            error: error.message
        });
    }
};

module.exports = {
    getAllPermissions,
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    assignPermissionsToRole,
    getPermissionsMatrix
};
