// src/pages/Chef/Category/ConfirmDelete.jsx
import React from "react";

const ConfirmDelete = ({ open, onClose, onConfirm }) =>
    open ? (
        <div className="modal-overlay">
            <div className="modal">
                <p>Bạn có chắc muốn xóa danh mục này?</p>
                <div className="modal-actions">
                    <button className="btn" onClick={onClose}>
                        Hủy
                    </button>
                    <button className="btn btn-danger" onClick={onConfirm}>
                        Xóa
                    </button>
                </div>
            </div>
        </div>
    ) : null;

export default ConfirmDelete;