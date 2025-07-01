import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingSlots } from "./BookingSlot/BookingSlot";
import { useReservation } from "../../hooks/useReservation";
import { useTableSelection } from "../../hooks/useTableSelection";
import { usePreOrder } from "../../hooks/usePreOrder";
import AreaTableSelection from "./TableSelection/AreaTableSelection";
import BookingInfoForm from "./BookingInfoForm/BookingInfoForm";
import SuccessModal from "./MenuModal/SuccessModal";
import MenuModal from "./MenuModal/MenuModal";
import "./Reservation.css";

export default function ReservationForm() {
  const navigate = useNavigate();
  const [endTime, setEndTime] = useState("");
  const [showMenuModal, setShowMenuModal] = useState(false);

  // Custom hooks
  const reservationHook = useReservation();
  const tableSelectionHook = useTableSelection();
  const preOrderHook = usePreOrder();
  const { slots } = useBookingSlots();

  // Destructure from hooks
  const {
    form,
    submitting,
    success,
    error,
    validationError,
    showSuccessModal,
    reservationId,
    isAuthenticated,
    todayStr,
    handleInput,
    handleSlotChange,
    submitReservation,
    setValidationError,
    setShowSuccessModal,
    validateBookingTime
  } = reservationHook;

  const {
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
  } = preOrderHook;

  const {
    areas,
    selectedArea,
    selectedTables,
    availableTables,
    loadingAreas,
    loadingTables,
    error: tableError,
    getTotalCapacity,
    isTableSelectionValid,
    isGuestCountExceeded,
    getMaxPossibleCapacity,
    getSuggestedCombinations,
    handleTableSelect,
    handleCombinationSelect,
    isTableSelected,
    isCombinationSelected,
    handleAreaSelect,
    updateFetchParams,
    setSelectedTables
  } = tableSelectionHook;



  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await submitReservation(selectedTables);
    if (success) {
      setSelectedTables([]);
      setEndTime("");
      setValidationError("");
    }
  };

  // Handle success modal close
  const handleSuccessModalClose = (shouldShowSuccess = false) => {
    setShowSuccessModal(false);
    clearPreOrderItems(); // Clear pre-order items when modal closes
    if (shouldShowSuccess) {
      // Could navigate or show success message here
      console.log('Reservation completed successfully!');
    }
  };

  // Effects

  // Khi chọn slot, tự động tính end_time và validate
  useEffect(() => {
    if (form.slot_id) {
      const selectedSlot = slots.find(s => s._id === form.slot_id);
      if (selectedSlot) {
        setEndTime(selectedSlot.end_time);

        // Validate thời gian
        if (form.date) {
          const validationError = validateBookingTime(form.date, selectedSlot.start_time, todayStr);
          setValidationError(validationError);
        }
      }
    } else {
      setEndTime("");
      setValidationError("");
    }
  }, [form.slot_id, form.date, slots, todayStr, validateBookingTime, setValidationError]);

  // Update fetch parameters when dependencies change
  useEffect(() => {
    updateFetchParams(
      selectedArea?._id,
      form.date,
      form.slot_id,
      form.guest_count,
      validationError
    );
  }, [selectedArea, form.date, form.slot_id, form.guest_count, validationError, updateFetchParams]);

  return (
    <div className="reservation-container">
      <AreaTableSelection
        areas={areas}
        selectedArea={selectedArea}
        loadingAreas={loadingAreas}
        loadingTables={loadingTables}
        validationError={validationError}
        availableTables={availableTables}
        selectedTables={selectedTables}
        guestCount={form.guest_count}
        onAreaSelect={handleAreaSelect}
        onTableSelect={handleTableSelect}
        onCombinationSelect={handleCombinationSelect}
        isTableSelected={isTableSelected}
        isCombinationSelected={isCombinationSelected}
        getSuggestedCombinations={getSuggestedCombinations}
        getTotalCapacity={getTotalCapacity}
        isGuestCountExceeded={isGuestCountExceeded}
      />

      <BookingInfoForm
        form={form}
        onInputChange={handleInput}
        onSlotChange={handleSlotChange}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error || tableError}
        success={success}
        validationError={validationError}
        endTime={endTime}
        todayStr={todayStr}
        getMaxPossibleCapacity={getMaxPossibleCapacity}
        isGuestCountExceeded={isGuestCountExceeded}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        reservationId={reservationId}
        preOrderItems={preOrderItems}
        setPreOrderItems={setPreOrderItems}
        onMenuItemChange={handleMenuItemChange}
        calculatePreOrderTotal={calculatePreOrderTotal}
        calculateOriginalTotal={calculateOriginalTotal}
        getSelectedItemsCount={getSelectedItemsCount}
        onShowMenuModal={() => setShowMenuModal(true)}
      />

      <MenuModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        preOrderItems={preOrderItems}
        onMenuItemChange={handleMenuItemChange}
        calculatePreOrderTotal={calculatePreOrderTotal}
        getSelectedItemsCount={getSelectedItemsCount}
        menuItems={menuItems}
        categories={categories}
        loadingMenu={loadingMenu}
        getFilteredMenuItems={getFilteredMenuItems}
        getItemQuantity={getItemQuantity}
      />
    </div>
  );
}
