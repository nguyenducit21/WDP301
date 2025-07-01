import { useState, useEffect, useCallback } from 'react';
import customFetch from '../utils/axios.customize';

export const usePreOrder = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [preOrderItems, setPreOrderItems] = useState([]);
    const [loadingMenu, setLoadingMenu] = useState(false);

    // Fetch menu items and categories
    useEffect(() => {
        const fetchMenuData = async () => {
            try {
                setLoadingMenu(true);

                // Fetch menu items
                const menuResponse = await customFetch.get('/menu-items');
                if (menuResponse?.data?.success && Array.isArray(menuResponse.data.data)) {
                    setMenuItems(menuResponse.data.data);
                }

                // Fetch categories
                const categoriesResponse = await customFetch.get('/categories');
                if (Array.isArray(categoriesResponse.data)) {
                    setCategories(categoriesResponse.data);
                } else if (Array.isArray(categoriesResponse.data?.data)) {
                    setCategories(categoriesResponse.data.data);
                }
            } catch (error) {
                console.error('Error fetching menu data:', error);
            } finally {
                setLoadingMenu(false);
            }
        };

        fetchMenuData();
    }, []);

    // Handle menu item quantity change
    const handleMenuItemChange = useCallback((menuItemId, quantity) => {
        setPreOrderItems(prev => {
            let updatedItems = prev.filter(item => item.menu_item_id !== menuItemId);

            if (quantity > 0) {
                updatedItems.push({
                    menu_item_id: menuItemId,
                    quantity: quantity
                });
            }

            return updatedItems;
        });
    }, []);

    // Calculate original total (before discount)
    const calculateOriginalTotal = useCallback(() => {
        if (!preOrderItems.length || !menuItems.length) return 0;

        return preOrderItems.reduce((total, item) => {
            if (!item || !item.menu_item_id) return total;
            const menuItem = menuItems.find(m => m && m._id === item.menu_item_id);
            if (menuItem) {
                return total + ((menuItem.price || 0) * item.quantity);
            }
            return total;
        }, 0);
    }, [preOrderItems, menuItems]);

    // Calculate pre-order total with 15% discount
    const calculatePreOrderTotal = useCallback(() => {
        const originalTotal = calculateOriginalTotal();
        // Apply 15% discount for pre-order
        return Math.ceil(originalTotal * 0.85);
    }, [calculateOriginalTotal]);

    // Calculate discount amount
    const calculateDiscountAmount = useCallback(() => {
        return calculateOriginalTotal() - calculatePreOrderTotal();
    }, [calculateOriginalTotal, calculatePreOrderTotal]);

    // Get total number of selected items
    const getSelectedItemsCount = useCallback(() => {
        return preOrderItems.reduce((total, item) => total + item.quantity, 0);
    }, [preOrderItems]);

    // Get filtered menu items by category
    const getFilteredMenuItems = useCallback((selectedCategory) => {
        return menuItems.filter(
            (item) =>
                selectedCategory === "All" ||
                item.category_id === selectedCategory ||
                (item.category_id?._id && item.category_id._id === selectedCategory)
        );
    }, [menuItems]);

    // Clear pre-order items
    const clearPreOrderItems = useCallback(() => {
        setPreOrderItems([]);
    }, []);

    // Get pre-order item quantity for a specific menu item
    const getItemQuantity = useCallback((menuItemId) => {
        const preOrderItem = preOrderItems.find(item => item.menu_item_id === menuItemId);
        return preOrderItem ? preOrderItem.quantity : 0;
    }, [preOrderItems]);

    return {
        menuItems,
        categories,
        preOrderItems,
        loadingMenu,
        handleMenuItemChange,
        calculateOriginalTotal,
        calculatePreOrderTotal,
        calculateDiscountAmount,
        getSelectedItemsCount,
        getFilteredMenuItems,
        clearPreOrderItems,
        getItemQuantity,
        setPreOrderItems
    };
}; 