const User = require("../models/user.model");
const Role = require("../models/role.model");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const test = async (req, res) => {
    try {
        res.status(200).json("test api")
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const register = async (req, res) => {
    try {
        const { username, email, password, full_name, phone } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }, { phone }]
        });
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
            }
            if (existingUser.email === email) {
                return res.status(400).json({ message: "Email đã được sử dụng" });
            }
            if (existingUser.phone === phone) {
                return res.status(400).json({ message: "Số điện thoại đã được sử dụng" });
            }
        }
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Gán role mặc định (customer)
        const defaultRole = await Role.findOne({ name: "customer" });
        const roleId = defaultRole._id

        // Create user (use default role for now)
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            full_name,
            phone,
            role_id: roleId
        });

        await newUser.save();

        const user = await User.findById(newUser._id).populate('role_id');
        const roleName = user.role_id.name;


        // Generate token
        const token = jwt.sign(
            { userId: newUser._id, role: newUser.role_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                full_name: newUser.full_name,
                role: roleName
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username or email
        const user = await User.findOne({
            $or: [{ username }, { email: username }]
        }).populate('role_id');

        if (!user) {
            return res.status(400).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác" });
        }

        // Lấy tên role
        const roleName = user.role_id ? user.role_id.name : 'customer';

        // Generate token
        const token = jwt.sign(
            { userId: user._id, role: roleName },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Set cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
        });

        res.status(200).json({
            message: "Login successful",
            user: {
                token,
                id: user._id,
                username: user.username,
                phone: user?.phone,
                email: user.email,
                full_name: user.full_name,
                role: roleName
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const logout = async (req, res) => {
    try {
        // Xóa cookie
        res.clearCookie('auth_token');

        res.status(200).json({ message: "Đăng xuất thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const updateProfile = async (req, res) => {
    try {
        const { userId, full_name, email, phone } = req.body;

        // Không cho phép cập nhật mật khẩu qua API này
        if (req.body.password) {
            return res.status(400).json({ message: "Không thể cập nhật mật khẩu tại đây" });
        }

        // Kiểm tra trùng email hoặc phone (nếu cần)
        const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
        if (existingEmail) {
            return res.status(400).json({ message: "Email đã được sử dụng" });
        }
        const existingPhone = await User.findOne({ phone, _id: { $ne: userId } });
        if (existingPhone) {
            return res.status(400).json({ message: "Số điện thoại đã được sử dụng" });
        }

        // Cập nhật thông tin
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { full_name, email, phone, updated_at: Date.now() },
            { new: true }
        );

        res.status(200).json({
            message: "Cập nhật thông tin thành công",
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                full_name: updatedUser.full_name,
                phone: updatedUser.phone
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

        // Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });

        // Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.updated_at = Date.now();
        await user.save();

        res.status(200).json({ message: "Đổi mật khẩu thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).populate('role_id');
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        res.status(200).json({
            message: "Lấy thông tin người dùng thành công",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                role: user.role_id.name
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Vui lòng nhập email." });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Email chưa đăng ký." });

        // Tạo mã code 6 số
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Tạo JWT chứa email, code, hết hạn 10 phút
        const resetToken = jwt.sign(
            { email: user.email, code },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        // Gửi mã code qua email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_NAME,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_NAME,
            to: email,
            subject: 'Mã xác nhận đặt lại mật khẩu',
            text: `Mã xác nhận đặt lại mật khẩu của bạn là: ${code}`
        });

        // Trả JWT về client (client lưu tạm)
        res.status(200).json({ message: "Đã gửi mã xác nhận tới email.", resetToken });
    } catch (error) {
        res.status(500).json({ message: error.message || "Gửi email thất bại." });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword, resetToken } = req.body;
        if (!email || !code || !newPassword || !resetToken) {
            return res.status(400).json({ message: "Thiếu thông tin." });
        }
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Không tìm thấy user." });

        // Verify JWT
        let payload;
        try {
            payload = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
        }

        // Kiểm tra email và code
        if (payload.email !== email || payload.code !== code) {
            return res.status(400).json({ message: "Mã xác nhận không hợp lệ." });
        }

        // Đổi mật khẩu
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: "Đặt lại mật khẩu thành công." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { test, register, login, logout, updateProfile, changePassword, getUserProfile, forgotPassword, resetPassword }