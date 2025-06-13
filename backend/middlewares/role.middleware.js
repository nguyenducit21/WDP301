/**
 * Middleware kiểm tra vai trò người dùng
 * @param {Array} allowedRoles - Mảng các vai trò được phép truy cập
 */
const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        try {
            // Lấy thông tin user từ authMiddleware (đã được decode từ token)
            const user = req.user;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Không tìm thấy thông tin người dùng"
                });
            }

            // Lấy role từ token (đã được decode)
            const userRole = user.role;

            if (!userRole) {
                return res.status(401).json({
                    success: false,
                    message: "Không tìm thấy thông tin vai trò"
                });
            }

            // Kiểm tra vai trò có được phép không
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: `Bạn không có quyền thực hiện hành động này. Cần quyền: ${allowedRoles.join(', ')}. Quyền hiện tại: ${userRole}`
                });
            }

            // Thêm thông tin role vào req để controller có thể sử dụng (tùy chọn)
            req.userRole = userRole;

            next();
        } catch (error) {
            console.error('Lỗi kiểm tra vai trò:', error);
            return res.status(500).json({
                success: false,
                message: "Lỗi server khi kiểm tra quyền",
                error: error.message
            });
        }
    };
};

module.exports = roleMiddleware;
