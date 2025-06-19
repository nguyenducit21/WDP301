// src/pages/Chef/MenuItem/EditMenuItemModal.jsx - BỎ INGREDIENTS
import React, { useState, useEffect } from "react";
import axios from "../../../utils/axios.customize";

const EditMenuItemModal = ({ open, onClose, menuItem, categories, onSave }) => {
    const [form, setForm] = useState({
        name: "",
        category_id: "",
        price: "",
        image: null,
        description: "",
        is_available: true,
        is_featured: false,
    });
    const [error, setError] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (menuItem) {
            setForm({
                name: menuItem.name || "",
                category_id: menuItem.category_id?._id || "",
                price: menuItem.price || "",
                image: null,
                description: menuItem.description || "",
                is_available: menuItem.is_available !== false,
                is_featured: menuItem.is_featured || false,
            });
            setImagePreview(menuItem.image || null);
        } else {
            setForm({
                name: "",
                category_id: "",
                price: "",
                image: null,
                description: "",
                is_available: true,
                is_featured: false,
            });
            setImagePreview(null);
        }
    }, [menuItem, open]);

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === "file" && files[0]) {
            setForm((f) => ({
                ...f,
                [name]: files[0],
            }));
            // Create preview URL for the image
            const previewUrl = URL.createObjectURL(files[0]);
            setImagePreview(previewUrl);
        } else {
            setForm((f) => ({
                ...f,
                [name]: value,
            }));
        }
        setError("");
    };

    // Clean up preview URL when component unmounts
    useEffect(() => {
        return () => {
            if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleToggleAvailable = () => {
        setForm((f) => ({ ...f, is_available: !f.is_available }));
    };

    const handleToggleFeatured = () => {
        setForm((f) => ({ ...f, is_featured: !f.is_featured }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // ✅ BỎ VALIDATION CHO INGREDIENTS
        if (
            !form.name ||
            !form.category_id ||
            !form.price ||
            (!form.image && !menuItem) ||
            !form.description
        ) {
            setError(
                !form.image && !menuItem
                    ? "Vui lòng chọn ảnh món ăn"
                    : "Các trường bắt buộc không được để trống"
            );
            return;
        }

        try {
            setIsUploading(true);
            let imageUrl = menuItem?.image;

            // If there's a new image, upload it first
            if (form.image) {
                const uploadData = new FormData();
                uploadData.append("image", form.image);
                const uploadRes = await axios.post("/menu-items/upload", uploadData, {
                    headers: { "Content-Type": "multipart/form-data" },
                    withCredentials: true
                });
                if (uploadRes.data?.success) {
                    imageUrl = uploadRes.data.data;
                } else {
                    throw new Error(uploadRes.data?.message || "Lỗi khi tải lên ảnh");
                }
            }

            // ✅ PREPARE DATA KHÔNG CÓ INGREDIENTS
            const data = new FormData();
            data.append("name", form.name);
            data.append("category_id", form.category_id);
            data.append("price", form.price);
            data.append("description", form.description);
            data.append("is_available", form.is_available);
            data.append("is_featured", form.is_featured);
            if (imageUrl) {
                data.append("image", imageUrl);
            }

            await onSave(data);
            // Close modal and refresh page after successful save
            onClose();
            window.location.reload();
        } catch (error) {
            console.error("Upload error:", error);
            setError(error.response?.data?.message || error.message || "Lỗi khi tải lên ảnh");
        } finally {
            setIsUploading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="modal-overlay">
            <div className="modal modal-large">
                <h3>{menuItem ? "Sửa món ăn" : "Thêm món ăn"}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Tên món ăn</label>
                        <input name="name" value={form.name} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Danh mục</label>
                        <select name="category_id" value={form.category_id} onChange={handleChange}>
                            <option value="">Chọn danh mục</option>
                            {categories?.map((cat) => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Giá (VND)</label>
                        <input type="number" name="price" value={form.price} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Ảnh</label>
                        {(imagePreview || menuItem?.image) && (
                            <div className="image-preview">
                                <img
                                    src={imagePreview || menuItem.image}
                                    alt="Preview"
                                    style={{
                                        width: "150px",
                                        height: "150px",
                                        objectFit: "cover",
                                        marginBottom: "10px",
                                        borderRadius: "8px"
                                    }}
                                />
                            </div>
                        )}
                        <input
                            type="file"
                            name="image"
                            onChange={handleChange}
                            accept="image/*"
                        />
                        <small className="form-text text-muted">
                            {menuItem ? "Để trống nếu không muốn thay đổi ảnh" : "Chọn ảnh món ăn"}
                        </small>
                    </div>
                    <div className="form-group">
                        <label>Mô tả</label>
                        <textarea name="description" value={form.description} onChange={handleChange} />
                    </div>
                    
                    {/* ✅ BỎ HOÀN TOÀN PHẦN INGREDIENTS */}
                    
                    <div className="form-group">
                        <label>Trạng thái</label>
                        <div className="toggle-switch" onClick={handleToggleAvailable}>
                            <input
                                type="checkbox"
                                name="is_available"
                                checked={form.is_available}
                                onChange={handleChange}
                                style={{ display: "none" }}
                            />
                            <span className={`slider ${form.is_available ? "active" : ""}`}></span>
                            <span className="toggle-label">
                                {form.is_available ? "Có sẵn" : "Hết hàng"}
                            </span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Nổi bật</label>
                        <div className="toggle-switch" onClick={handleToggleFeatured}>
                            <input
                                type="checkbox"
                                name="is_featured"
                                checked={form.is_featured}
                                onChange={handleChange}
                                style={{ display: "none" }}
                            />
                            <span className={`slider ${form.is_featured ? "active" : ""}`}></span>
                            <span className="toggle-label">
                                {form.is_featured ? "Nổi bật" : "Không nổi bật"}
                            </span>
                        </div>
                    </div>
                    {error && <div className="form-error">{error}</div>}
                    <div className="modal-actions">
                        <button type="button" className="btn" onClick={onClose} disabled={isUploading}>
                            Hủy
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isUploading}>
                            {isUploading ? "Đang xử lý..." : (menuItem ? "Lưu" : "Thêm")}
                        </button>
                    </div>
                </form>
                {isUploading && (
                    <div className="loading-overlay">
                        <div className="loading-spinner"></div>
                        <div>Đang xử lý...</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditMenuItemModal;
