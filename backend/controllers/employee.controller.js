const User = require('../models/user.model');
const Role = require('../models/role.model');
const bcrypt = require('bcrypt');
const { send } = require('../helper/sendmail.helper');

// Function tạo nội dung email cho nhân viên mới
const createEmployeeWelcomeEmail = (employeeData, defaultPassword) => {
    const { full_name, username, role_name, email } = employeeData;

    return `
        <div style="margin-bottom: 20px;">
            <h2 style="color: #4CAF50; margin-bottom: 15px;">🌸 Chào mừng bạn đến với Nhà hàng!</h2>
            <p>Xin chào <strong>${full_name || username}</strong>,</p>
            <p>Tài khoản nhân viên của bạn đã được tạo thành công. Dưới đây là thông tin đăng nhập:</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
            <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📋 Thông tin tài khoản:</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555; width: 40%;">👤 Tên đăng nhập:</td>
                    <td style="padding: 8px 0; color: #333;">${username}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">🔑 Mật khẩu tạm thời:</td>
                    <td style="padding: 8px 0; color: #333; font-family: 'Courier New', monospace; background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${defaultPassword}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">👔 Vai trò:</td>
                    <td style="padding: 8px 0; color: #333; text-transform: capitalize;">${role_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">📧 Email:</td>
                    <td style="padding: 8px 0; color: #333;">${email}</td>
                </tr>
            </table>
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #856404; margin-top: 0; margin-bottom: 10px;">⚠️ Lưu ý quan trọng:</h4>
            <ul style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li><strong>Đây là mật khẩu tạm thời</strong>, vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên</li>
                <li>Không chia sẻ thông tin đăng nhập với người khác</li>
                <li>Liên hệ quản trị viên nếu gặp vấn đề khi đăng nhập</li>
                <li>Bảo mật thông tin tài khoản của bạn</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login"
               style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #4CAF50, #45a049); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);">
                🚀 Đăng nhập ngay
            </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #666; margin-bottom: 10px;">📞 Hỗ trợ:</h4>
            <p style="color: #666; font-size: 14px; margin: 5px 0;">
                Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ:
            </p>
            <ul style="color: #666; font-size: 14px; margin: 10px 0; padding-left: 20px;">
                <li>📧 Email: ${process.env.SUPPORT_EMAIL || process.env.EMAIL_NAME}</li>
                <li>📱 Điện thoại: ${process.env.SUPPORT_PHONE || '(+84) 123-456-789'}</li>
                <li>🕒 Giờ làm việc: 8:00 - 22:00 (Thứ 2 - Chủ nhật)</li>
            </ul>
        </div>

        <div style="margin-top: 30px; text-align: center; padding: 20px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px;">
            <p style="color: #666; font-size: 14px; margin: 0;">
                Trân trọng,<br>
                <strong style="color: #4CAF50;">🌸 Ban Quản lý Nhà hàng</strong>
            </p>
            <p style="color: #888; font-size: 12px; margin: 10px 0 0 0;">
                Cảm ơn bạn đã gia nhập đại gia đình! 🎉
            </p>
        </div>
    `;
};

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
        const { username, email, full_name, phone, role_name, birth_date } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!username || !email || !role_name || !birth_date) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc (username, email, role, ngày sinh)'
            });
        }

        // Kiểm tra tuổi (phải trên 18)
        const birthDate = new Date(birth_date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (age < 18 || (age === 18 && monthDiff < 0) ||
            (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return res.status(400).json({
                success: false,
                message: 'Nhân viên phải đủ 18 tuổi trở lên'
            });
        }

        // Kiểm tra username, email và phone đã tồn tại chưa
        const existingUser = await User.findOne({
            $or: [
                { username },
                { email },
                ...(phone ? [{ phone }] : [])
            ]
        });

        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({
                    success: false,
                    message: 'Username đã tồn tại'
                });
            }
            if (existingUser.email === email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã tồn tại'
                });
            }
            if (existingUser.phone === phone) {
                return res.status(400).json({
                    success: false,
                    message: 'Số điện thoại đã tồn tại'
                });
            }
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

        // Tạo mật khẩu mặc định
        const defaultPassword = '123456'; // Mật khẩu mặc định
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        // Tạo nhân viên mới
        const newEmployee = new User({
            username,
            email,
            password: hashedPassword,
            full_name,
            phone,
            birth_date: birthDate,
            role_id: role._id,
            status: 'active'
        });

        await newEmployee.save();

        // Lấy thông tin nhân viên vừa tạo (không bao gồm password)
        const employee = await User.findById(newEmployee._id)
            .populate('role_id', 'name description')
            .select('-password');

        // Gửi email thông báo tài khoản mới
        try {
            const emailData = {
                email: employee.email,
                full_name: employee.full_name,
                username: employee.username,
                role_name: employee.role_id.name
            };

            const subject = "Thông báo tài khoản nhân viên mới - Nhà hàng";
            const content = createEmployeeWelcomeEmail(emailData, defaultPassword);

            // Sử dụng function send có sẵn từ sendmail.helper.js
            send(employee.email, subject, content);

            console.log('Email thông báo tài khoản đã được gửi đến:', employee.email);
        } catch (emailError) {
            console.error('Lỗi khi gửi email thông báo tài khoản:', emailError);
            // Không throw error để không ảnh hưởng đến việc tạo tài khoản
        }

        res.status(201).json({
            success: true,
            message: 'Tạo nhân viên thành công. Thông tin đăng nhập đã được gửi qua email.',
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
        const { username, email, full_name, phone, role_name, status, birth_date } = req.body;

        // Kiểm tra nhân viên có tồn tại không
        const employee = await User.findById(id).populate('role_id');
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }

        // Không cho phép admin chỉnh sửa chính mình qua API này
        if (employee.role_id.name === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Không thể chỉnh sửa thông tin admin qua trang quản lý nhân viên'
            });
        }

        // Kiểm tra tuổi nếu có cập nhật ngày sinh
        if (birth_date) {
            const birthDate = new Date(birth_date);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (age < 18 || (age === 18 && monthDiff < 0) ||
                (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                return res.status(400).json({
                    success: false,
                    message: 'Nhân viên phải đủ 18 tuổi trở lên'
                });
            }
        }

        // Kiểm tra username, email và phone đã tồn tại chưa (trừ chính nhân viên này)
        if (username || email || phone) {
            const existingUser = await User.findOne({
                _id: { $ne: id },
                $or: [
                    ...(username ? [{ username }] : []),
                    ...(email ? [{ email }] : []),
                    ...(phone ? [{ phone }] : [])
                ]
            });

            if (existingUser) {
                if (existingUser.username === username) {
                    return res.status(400).json({
                        success: false,
                        message: 'Username đã tồn tại'
                    });
                }
                if (existingUser.email === email) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email đã tồn tại'
                    });
                }
                if (existingUser.phone === phone) {
                    return res.status(400).json({
                        success: false,
                        message: 'Số điện thoại đã tồn tại'
                    });
                }
            }
        }

        // Chuẩn bị dữ liệu cập nhật
        const updateData = { updated_at: new Date() };

        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (full_name) updateData.full_name = full_name;
        if (phone) updateData.phone = phone;
        if (status) updateData.status = status;
        if (birth_date) updateData.birth_date = new Date(birth_date);

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

// Toggle trạng thái nhân viên (active/inactive)
const toggleEmployeeStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra nhân viên có tồn tại không
        const employee = await User.findById(id).populate('role_id');
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }

        // Không cho phép thay đổi trạng thái admin
        if (employee.role_id.name === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Không thể thay đổi trạng thái tài khoản admin'
            });
        }

        // Toggle status
        const newStatus = employee.status === 'active' ? 'inactive' : 'active';

        const updatedEmployee = await User.findByIdAndUpdate(
            id,
            {
                status: newStatus,
                updated_at: new Date()
            },
            { new: true }
        ).populate('role_id', 'name description').select('-password');

        res.status(200).json({
            success: true,
            message: `${newStatus === 'active' ? 'Kích hoạt' : 'Vô hiệu hóa'} nhân viên thành công`,
            data: updatedEmployee
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thay đổi trạng thái nhân viên',
            error: error.message
        });
    }
};

module.exports = {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    toggleEmployeeStatus
};
