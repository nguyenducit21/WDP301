const express = require("express");
const fs = require("fs");
const path = require("path");
const qs = require("qs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { Orders } = require("../models/reservation.model");
const router = express.Router();

// Đọc cấu hình từ JSON
const configPath = path.join(__dirname, "../config/vnpay.config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Hàm sắp xếp Object theo thứ tự key
function sortObject(obj) {
    let sorted = {};
    let keys = Object.keys(obj).sort();
    keys.forEach(key => { sorted[key] = obj[key]; });
    return sorted;
}

// API tạo URL thanh toán
router.post("/create_payment_url", (req, res) => {
    try {
        const ipAddr =
            req.headers["x-forwarded-for"] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            (req.connection.socket ? req.connection.socket.remoteAddress : null);

        const { amount, bankCode, orderDescription, orderType, language } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: "Số tiền không hợp lệ" });
        }
        if (!orderDescription || typeof orderDescription !== "string") {
            return res.status(400).json({ message: "Mô tả đơn hàng không hợp lệ" });
        }

        const createDate = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
        const orderId = uuidv4().replace(/-/g, "").substring(0, 10);
        const locale = language || "vn";

        let vnp_Params = {
            vnp_Version: "2.1.0",
            vnp_Command: "pay",
            vnp_TmnCode: config.vnp_TmnCode,
            vnp_Locale: locale,
            vnp_CurrCode: "VND",
            vnp_TxnRef: orderId,
            vnp_OrderInfo: orderDescription,
            vnp_OrderType: orderType,
            vnp_Amount: amount * 100,
            vnp_ReturnUrl: config.vnp_ReturnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate,
        };

        if (bankCode) vnp_Params["vnp_BankCode"] = bankCode;

        // Sắp xếp và tạo chữ ký
        const sortedParams = sortObject(vnp_Params);
        const signData = new URLSearchParams(sortedParams).toString(); // Thay thế qs.stringify()

        const hmac = crypto.createHmac("sha512", config.vnp_HashSecret);
        const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

        vnp_Params["vnp_SecureHash"] = signed;
        const paymentUrl = `${config.vnp_Url}?${qs.stringify(vnp_Params, { encode: false })}`;

        res.json({ orderId, paymentUrl, createDate });
        
    } catch (error) {
        console.error("Lỗi tạo URL thanh toán:", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
});

// Xử lý kết quả giao dịch
router.get("/vnpay_return", (req, res) => {
    try {
        const vnp_Params = { ...req.query };
        const secureHash = vnp_Params["vnp_SecureHash"];

        delete vnp_Params["vnp_SecureHash"];
        delete vnp_Params["vnp_SecureHashType"];

        // Sắp xếp và tạo lại chữ ký
        const sortedParams = sortObject(vnp_Params);
        const signData = new URLSearchParams(sortedParams).toString(); // Thay thế qs.stringify()

        const hmac = crypto.createHmac("sha512", config.vnp_HashSecret);
        const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

        if (secureHash === signed) {
            const isSuccess = vnp_Params["vnp_ResponseCode"] === "00";
            res.json({
                message: isSuccess ? "Giao dịch thành công" : "Giao dịch thất bại",
                status: isSuccess ? "success" : "failed",
                data: vnp_Params,
            });
        } else {
            res.status(400).json({ message: "Chữ ký không hợp lệ", status: "error" });
        }
    } catch (error) {
        console.error("Lỗi xử lý kết quả:", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
});



module.exports = router;
