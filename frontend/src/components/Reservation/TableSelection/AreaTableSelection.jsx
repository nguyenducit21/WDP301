import React from 'react';
import SelectedTablesSummary from './SelectedTablesSummary';
import TableCombinations from './TableCombinations';

const AreaTableSelection = ({
    areas,
    selectedArea,
    loadingAreas,
    loadingTables,
    validationError,
    availableTables,
    selectedTables,
    guestCount,
    onAreaSelect,
    onTableSelect,
    onCombinationSelect,
    isTableSelected,
    isCombinationSelected,
    getSuggestedCombinations,
    getTotalCapacity,
    isGuestCountExceeded
}) => {
    const renderLargeGroupBooking = () => (
        <div className="large-group-booking">
            <div className="large-group-info">
                <h5>📞 Đặt bàn số lượng lớn</h5>
                <p>
                    Với {guestCount} người, vượt quá giới hạn đặt bàn trực tuyến (tối đa 23 người).
                </p>
                <p>
                    Vui lòng liên hệ trực tiếp để được tư vấn và sắp xếp phù hợp:
                </p>
                <div className="contact-info">
                    <div className="contact-item">
                        <span className="contact-label">📞 Hotline:</span>
                        <span className="contact-value">0123 456 789</span>
                    </div>
                    <div className="contact-item">
                        <span className="contact-label">📧 Email:</span>
                        <span className="contact-value">booking@nhahang.com</span>
                    </div>
                    <div className="contact-item">
                        <span className="contact-label">⏰ Giờ làm việc:</span>
                        <span className="contact-value">6:00 - 22:00 (Hàng ngày)</span>
                    </div>
                </div>
                <div className="contact-actions">
                    <button
                        type="button"
                        className="call-btn"
                        onClick={() => window.open('tel:0123456789')}
                    >
                        📞 Gọi ngay
                    </button>
                    <button
                        type="button"
                        className="whatsapp-btn"
                        onClick={() => window.open('https://wa.me/84123456789?text=Tôi muốn đặt bàn cho ' + guestCount + ' người')}
                    >
                        💬 WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );

    const renderTableSelection = () => {
        if (availableTables.length === 0) {
            return <span>Hãy điền thông tin đặt bàn để xem bàn hiện có</span>;
        }

        if (isGuestCountExceeded(guestCount)) {
            return renderLargeGroupBooking();
        }

        // Thêm điều kiện guestCount > 0
        if (!guestCount || parseInt(guestCount) <= 0) {
            return null;
        }

        const combinations = getSuggestedCombinations(guestCount);

        return (
            <>
                <SelectedTablesSummary
                    selectedTables={selectedTables}
                    guestCount={guestCount}
                    getTotalCapacity={getTotalCapacity}
                    onRemoveTable={onTableSelect}
                />

                <TableCombinations
                    combinations={combinations}
                    onTableSelect={onTableSelect}
                    onCombinationSelect={onCombinationSelect}
                    isTableSelected={isTableSelected}
                    isCombinationSelected={isCombinationSelected}
                />
            </>
        );
    };

    return (
        <div className="reservation-left">
            <div className="area-tabs">
                {loadingAreas ? (
                    <span>Đang tải khu vực...</span>
                ) : (
                    areas.map((area) => (
                        <button
                            key={area._id}
                            className={selectedArea?._id === area._id ? "active" : ""}
                            onClick={() => onAreaSelect(area)}
                        >
                            {area.name}
                        </button>
                    ))
                )}
            </div>

            {selectedArea && (
                <div className="area-image">
                    {selectedArea.image && (
                        <img src={selectedArea.image} alt={selectedArea.name} />
                    )}
                    <div className="area-desc">
                        <p>{selectedArea.description}</p>
                    </div>
                </div>
            )}

            <div className="table-list">
                <h4>Chọn bàn</h4>
                {loadingTables ? (
                    <div>Đang tải bàn trống...</div>
                ) : validationError ? (
                    <div className="validation-error">{validationError}</div>
                ) : (
                    <div className="tables-section">
                        {renderTableSelection()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AreaTableSelection; 