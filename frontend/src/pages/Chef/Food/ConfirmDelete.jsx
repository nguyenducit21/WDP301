import React from "react";

const ConfirmDelete = ({ open, onClose, onConfirm, message = "Bạn có chắc muốn xóa món ăn này không?" }) => {
    if (!open) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>Xác nhận</h3>
                <p>{message}</p>
                <div className="modal-actions">
                    <button className="btn" onClick={onClose}>
                        Hủy
                    </button>
                    <button className="btn btn-primary" onClick={onConfirm}>
                        Đồng ý
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDelete;