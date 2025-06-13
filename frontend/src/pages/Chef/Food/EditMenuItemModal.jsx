// src/pages/Chef/MenuItem/EditMenuItemModal.jsx
import React, { useState, useEffect } from "react";

const EditMenuItemModal = ({ open, onClose, menuItem, categories, onSave }) => {

    const [form, setForm] = useState({
        name: "",
        category_id: "",
        price: "",
        image: null,
        description: "",
        ingredients: [""],
        is_available: true,
        is_featured: false,
    });
    const [error, setError] = useState("");
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (menuItem) {
            setForm({
                name: menuItem.name || "",
                category_id: menuItem.category_id?._id || "",
                price: menuItem.price || "",
                image: null,
                description: menuItem.description || "",
                ingredients: menuItem.ingredients || [""],
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
                ingredients: [""],
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

    const handleIngredientsChange = (idx, value) => {
        setForm((f) => {
            const newIngredients = [...f.ingredients];
            newIngredients[idx] = value;
            return { ...f, ingredients: newIngredients };
        });
    };

    const addIngredient = () => {
        setForm((f) => ({ ...f, ingredients: [...f.ingredients, ""] }));
    };

    const removeIngredient = (idx) => {
        setForm((f) => ({
            ...f,
            ingredients: f.ingredients.filter((_, i) => i !== idx),
        }));
    };

    const handleToggleAvailable = () => {
        setForm((f) => ({ ...f, is_available: !f.is_available }));
    };

    const handleToggleFeatured = () => {
        setForm((f) => ({ ...f, is_featured: !f.is_featured }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const filteredIngredients = form.ingredients.filter((i) => i.trim() !== "");
        if (
            !form.name ||
            !form.category_id ||
            !form.price ||
            (!form.image && !menuItem) ||
            !form.description ||
            filteredIngredients.length === 0
        ) {
            setError(
                !form.image && !menuItem
                    ? "Vui lòng chọn ảnh món ăn"
                    : filteredIngredients.length === 0
                        ? "Vui lòng nhập ít nhất một nguyên liệu"
                        : "Các trường bắt buộc không được để trống"
            );
            return;
        }
        const data = new FormData();
        data.append("name", form.name);
        data.append("category_id", form.category_id);
        data.append("price", form.price);
        if (form.image) data.append("image", form.image);
        data.append("description", form.description);
        filteredIngredients.forEach((ingredient, idx) => data.append(`ingredients[${idx}]`, ingredient));
        data.append("is_available", form.is_available);
        data.append("is_featured", form.is_featured);
        onSave(data);
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
                            multiple
                        />
                        <small className="form-text text-muted">
                            {menuItem ? "Để trống nếu không muốn thay đổi ảnh" : "Chọn ảnh món ăn"}
                        </small>
                    </div>
                    <div className="form-group">
                        <label>Mô tả</label>
                        <textarea name="description" value={form.description} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Nguyên liệu</label>
                        {form.ingredients.map((ingredient, idx) => (
                            <div key={idx} style={{ display: "flex", gap: "10px", marginBottom: "5px" }}>
                                <input
                                    type="text"
                                    value={ingredient}
                                    onChange={(e) => handleIngredientsChange(idx, e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button type="button" onClick={() => removeIngredient(idx)} style={{ padding: "0 10px" }}>
                                    Xóa
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={addIngredient} className="btn btn-primary" style={{ marginTop: "5px" }}>
                            Thêm nguyên liệu
                        </button>
                    </div>
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
                        <button type="button" className="btn" onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {menuItem ? "Lưu" : "Thêm"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditMenuItemModal;