const User = require('../models/user.model');
const Role = require('../models/role.model');
const bcrypt = require('bcrypt');

// Lấy danh sách tất cả nhân viên (không bao gồm customer)
const getAllEmployees = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;
        
        // Tìm role customer để loại trừ
        const customerRole = await Role.findOne({ name: 'customer' });
        
        // Tạo query filter
        const filter = {
            role_id: { $ne: customerRole._id } // Loại trừ customer
        };
        
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { full_name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (role) {
            const roleObj = await Role.findOne({ name: role });
            if (roleObj) {
                filter.role_id = roleObj._id;
            }
        }
        
        if (status) {
            filter.status = status;
        }
        
        const skip = (page - 1) * limit;
        
        const employees = await User.find(filter)
            .populate('role_id', 'name description')
            .select('-password')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await User.countDocuments(filter);
        
        res.status(200).json({
            success: true,
            data: employees,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách nhân viên',
            error: error.message
        });
    }
};

// Lấy thông tin chi tiết một nhân viên
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const employee = await User.findById(id)
            .populate('role_id', 'name description permissions')
            .select('-password');
            
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }
        
        res.status(200).json({
            success: true,
            data: employee
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin nhân viên',
            error: error.message
        });
    }
};

// Tạo nhân viên mới
const createEmployee = async (req, res) => {
    try {
        const { username, email, password, full_name, phone, role_name } = req.body;
        
        // Kiểm tra dữ liệu đầu vào
        if (!username || !email || !password || !role_name) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }
        
        // Kiểm tra username và email đã tồn tại chưa
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username hoặc email đã tồn tại'
            });
        }
        
        // Kiểm tra role có tồn tại không
        const role = await Role.findOne({ name: role_name });
        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Role không tồn tại'
            });
        }
        
        // Không cho phép tạo customer qua API này
        if (role_name === 'customer') {
            return res.status(400).json({
                success: false,
                message: 'Không thể tạo customer qua API này'
            });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Tạo nhân viên mới
        const newEmployee = new User({
            username,
            email,
            password: hashedPassword,
            full_name,
            phone,
            role_id: role._id,
            status: 'active'
        });
        
        await newEmployee.save();
        
        // Lấy thông tin nhân viên vừa tạo (không bao gồm password)
        const employee = await User.findById(newEmployee._id)
            .populate('role_id', 'name description')
            .select('-password');
        
        res.status(201).json({
            success: true,
            message: 'Tạo nhân viên thành công',
            data: employee
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo nhân viên',
            error: error.message
        });
    }
};

// Cập nhật thông tin nhân viên
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, full_name, phone, role_name, status } = req.body;
        
        // Kiểm tra nhân viên có tồn tại không
        const employee = await User.findById(id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }
        
        // Kiểm tra username và email đã tồn tại chưa (trừ chính nhân viên này)
        if (username || email) {
            const existingUser = await User.findOne({
                _id: { $ne: id },
                $or: [
                    ...(username ? [{ username }] : []),
                    ...(email ? [{ email }] : [])
                ]
            });
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username hoặc email đã tồn tại'
                });
            }
        }
        
        // Chuẩn bị dữ liệu cập nhật
        const updateData = { updated_at: new Date() };
        
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (full_name) updateData.full_name = full_name;
        if (phone) updateData.phone = phone;
        if (status) updateData.status = status;
        
        // Xử lý role
        if (role_name) {
            const role = await Role.findOne({ name: role_name });
            if (!role) {
                return res.status(400).json({
                    success: false,
                    message: 'Role không tồn tại'
                });
            }
            updateData.role_id = role._id;
        }
        
        // Cập nhật nhân viên
        const updatedEmployee = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('role_id', 'name description').select('-password');
        
        res.status(200).json({
            success: true,
            message: 'Cập nhật nhân viên thành công',
            data: updatedEmployee
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật nhân viên',
            error: error.message
        });
    }
};

// Xóa nhân viên (soft delete)
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra nhân viên có tồn tại không
        const employee = await User.findById(id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }
        
        // Không cho phép xóa admin
        const role = await Role.findById(employee.role_id);
        if (role && role.name === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa tài khoản admin'
            });
        }
        
        // Soft delete - chuyển status thành inactive
        await User.findByIdAndUpdate(id, { 
            status: 'inactive',
            updated_at: new Date()
        });
        
        res.status(200).json({
            success: true,
            message: 'Xóa nhân viên thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa nhân viên',
            error: error.message
        });
    }
};

// Đổi mật khẩu nhân viên
const changeEmployeePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;
        
        if (!new_password) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới là bắt buộc'
            });
        }
        
        // Kiểm tra nhân viên có tồn tại không
        const employee = await User.findById(id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }
        
        // Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);
        
        // Cập nhật mật khẩu
        await User.findByIdAndUpdate(id, {
            password: hashedPassword,
            updated_at: new Date()
        });
        
        res.status(200).json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đổi mật khẩu',
            error: error.message
        });
    }
};

module.exports = {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    changeEmployeePassword
};
