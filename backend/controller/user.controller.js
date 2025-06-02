const User = require("../models/user.model");

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

        // Create user (use default role for now)
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            full_name,
            phone,
            role_id: "657313cf6be6cd5039a87676"
        });

        await newUser.save();

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
                full_name: newUser.full_name
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
        });

        if (!user) {
            return res.status(400).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác" });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id, role: user.role_id },
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
                email: user.email,
                full_name: user.full_name
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


module.exports = { test, register, login, logout }