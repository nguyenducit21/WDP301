import { createContext, useEffect, useState } from "react";
import { food_list } from "../assets/assets";
import { toast } from "react-toastify";

export const StoreContext = createContext(null);
export const ToastContext = createContext(null);

const StoreContextProvider = (props) => {
  const [cartItems, setCartItems] = useState({});

  const addToCart = (itemId) => {
    if (!cartItems[itemId]) {
      setCartItems((prev) => ({ ...prev, [itemId]: 1 }));
    } else {
      setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
    }
  };

  const removeFromCart = (itemId) => {
    if (cartItems[itemId] === 1) {
      // Remove the item if the quantity becomes zero
      const newCartItems = { ...cartItems };
      delete newCartItems[itemId];
      setCartItems(newCartItems);
    } else {
      setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }));
    }
  };

  const getTotalQuantity = () => {
    let totalQuantity = 0;
    for (const itemId in cartItems) {
      totalQuantity += cartItems[itemId];
    }
    return totalQuantity;
  };

  const getTotalCartAmount = () => {
    let totalAmount = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        let itemInfo = food_list.find((product) => product._id === item);
        totalAmount += itemInfo.price * cartItems[item];
      }
    }
    return totalAmount;
  };

  // Toast context logic
  const showToast = (message, type = "info") => {
    toast[type](message);
  };

  const toastContextValue = {
    showToast,
  };

  const contextValue = {
    food_list,
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    getTotalCartAmount,
    getTotalQuantity,
  };

  return (
    <ToastContext.Provider value={toastContextValue}>
      <StoreContext.Provider value={contextValue}>
        {props.children}
      </StoreContext.Provider>
    </ToastContext.Provider>
  );
};

export default StoreContextProvider;
