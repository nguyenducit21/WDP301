const Reservation = require('../models/reservation.model');
const Table = require('../models/table.model');

const populateFields = [
  { path: 'customer_id', select: 'username full_name email phone' },
  { path: 'table_id', select: 'name capacity area_id' },
  { path: 'created_by_staff', select: 'username full_name' },
  { path: 'pre_order_items.menu_item_id', select: 'name price category' }
];

// === Helper filter builder ===
const buildFilter = (query, user) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.date) {
    const startDate = new Date(query.date);
    const endDate = new Date(query.date);
    endDate.setDate(endDate.getDate() + 1);
    filter.date = { $gte: startDate, $lt: endDate };
  }
  if (query.table_id) filter.table_id = query.table_id;

  // nếu lấy đặt bàn của khách
  if (user.role === 'customer') {
    filter.customer_id = user.userId;
  } else if (query.customer_id) {
    filter.customer_id = query.customer_id;
  }

  return filter;
};

// === Lấy tất cả đặt bàn (Admin/Staff/Manager) ===
const getReservations = async (req, res) => {
  try {
    const { status, date, table_id, page = 1, limit = 10, sort = '-created_at' } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }
    if (table_id) filter.table_id = table_id;

    const reservations = await Reservation.find(filter)
      .populate(populateFields)
      .sort(sort)
      .limit(+limit)
      .skip((+page - 1) * limit);

    const total = await Reservation.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: reservations,
      pagination: {
        currentPage: +page,
        totalPages: Math.ceil(total / limit),
        totalReservations: total,
        hasNextPage: +page < Math.ceil(total / limit),
        hasPrevPage: +page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đặt bàn', error: error.message });
  }
};

// === Lấy đặt bàn của khách (hoặc filter theo quyền) ===
const getCustomerReservations = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-created_at' } = req.query;
    const filter = buildFilter(req.query, req.user);

    const reservations = await Reservation.find(filter)
      .populate(populateFields)
      .sort(sort)
      .limit(+limit)
      .skip((+page - 1) * limit);

    const total = await Reservation.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: reservations,
      pagination: {
        currentPage: +page,
        totalPages: Math.ceil(total / limit),
        totalReservations: total,
        hasNextPage: +page < Math.ceil(total / limit),
        hasPrevPage: +page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đặt bàn', error: error.message });
  }
};

// === Lấy chi tiết một đặt bàn ===
const getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate(populateFields);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đặt bàn' });
    }
    res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin đặt bàn', error: error.message });
  }
};

// === Tạo đặt bàn mới ===
const createReservation = async (req, res) => {
  try {
    const {
      customer_id, table_id, date, time, guest_count,
      contact_name, contact_phone, contact_email, pre_order_items,
      deposit_amount, notes
    } = req.body;

    // Xác định ai đặt
    const userRole = req.user.role;
    let finalCustomerId = null;
    let createdByStaff = null;

    if (['admin', 'manager', 'staff'].includes(userRole)) {
      createdByStaff = req.user.userId;
      finalCustomerId = customer_id || null;
    } else if (userRole === 'customer') {
      finalCustomerId = req.user.userId;
    } else {
      return res.status(403).json({ success: false, message: 'Không có quyền thực hiện thao tác này' });
    }

    // Kiểm tra bắt buộc
    if (!contact_name || !contact_phone || !guest_count) {
      return res.status(400).json({ success: false, message: 'Tên, số điện thoại và số lượng khách là bắt buộc' });
    }

    // Kiểm tra bàn
    const table = await Table.findById(table_id);
    if (!table) return res.status(400).json({ success: false, message: 'Bàn không tồn tại' });
    if (table.status !== 'available') return res.status(400).json({ success: false, message: 'Bàn không khả dụng' });
    if (guest_count > table.capacity) return res.status(400).json({
      success: false,
      message: `Bàn chỉ có thể chứa tối đa ${table.capacity} người`
    });

    // Kiểm tra trùng thời gian
    const reservationDate = new Date(date);
    const existingReservation = await Reservation.findOne({
      table_id,
      date: reservationDate,
      time,
      status: { $in: ['confirmed', 'pending'] }
    });
    if (existingReservation) return res.status(400).json({ success: false, message: 'Bàn đã được đặt vào thời gian này' });

    // Tạo đặt bàn mới
    const reservation = new Reservation({
      customer_id: finalCustomerId,
      table_id,
      date: reservationDate,
      time,
      guest_count,
      contact_name,
      contact_phone,
      contact_email,
      created_by_staff: createdByStaff,
      pre_order_items: pre_order_items || [],
      deposit_amount: deposit_amount || 0,
      notes,
      status: createdByStaff ? 'confirmed' : 'pending'
    });
    await reservation.save();

    // Cập nhật trạng thái bàn thành reserved
    await Table.findByIdAndUpdate(table_id, { status: 'reserved', updated_at: new Date() });

    await reservation.populate(populateFields);

    res.status(201).json({
      success: true,
      message: createdByStaff ? 'Nhân viên đặt bàn cho khách thành công' : 'Khách đặt bàn thành công',
      data: reservation
    });
  } catch (error) {
    console.error('Error in createReservation:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo đặt bàn', error: error.message });
  }
};

// === Cập nhật đặt bàn ===
const updateReservation = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;

    const reservation = await Reservation.findById(req.params.id).populate('table_id');
    if (!reservation) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt bàn' });

    if (userRole === 'customer' && reservation.customer_id?.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn chỉ có thể sửa đặt bàn của mình' });
    }

    const {
      customer_id, table_id, date, time, guest_count,
      contact_name, contact_phone, contact_email, status,
      pre_order_items, deposit_amount, payment_status, notes
    } = req.body;

    if (contact_name !== undefined && !contact_name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên khách hàng không được để trống' });
    }
    if (contact_phone !== undefined && !contact_phone.trim()) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không được để trống' });
    }
    if (guest_count !== undefined && guest_count < 1) {
      return res.status(400).json({ success: false, message: 'Số lượng khách phải lớn hơn 0' });
    }
    const finalGuestCount = guest_count || reservation.guest_count;
    const currentTable = reservation.table_id;
    if (finalGuestCount > currentTable.capacity) {
      return res.status(400).json({ success: false, message: `Bàn hiện tại chỉ có thể chứa tối đa ${currentTable.capacity} người` });
    }

    const currentTableId = currentTable._id.toString();
    const isChangingTable = table_id && table_id !== currentTableId;

    if (isChangingTable) {
      const newTable = await Table.findById(table_id);
      if (!newTable) return res.status(400).json({ success: false, message: 'Bàn mới không tồn tại' });
      if (newTable.status !== 'available') return res.status(400).json({ success: false, message: 'Bàn mới không khả dụng' });
      if (finalGuestCount > newTable.capacity) {
        return res.status(400).json({ success: false, message: `Bàn mới chỉ có thể chứa tối đa ${newTable.capacity} người` });
      }

      const reservationDate = date ? new Date(date) : reservation.date;
      const reservationTime = time || reservation.time;

      const existingReservation = await Reservation.findOne({
        _id: { $ne: req.params.id },
        table_id,
        date: reservationDate,
        time: reservationTime,
        status: { $in: ['confirmed', 'pending'] }
      });

      if (existingReservation) {
        return res.status(400).json({ success: false, message: 'Bàn mới đã được đặt vào thời gian này' });
      }

      // Cập nhật trạng thái bàn cũ và bàn mới
      await Table.findByIdAndUpdate(currentTableId, { status: 'available', updated_at: new Date() });
      await Table.findByIdAndUpdate(table_id, { status: 'reserved', updated_at: new Date() });
    }

    // Nếu hủy đặt bàn và không đổi bàn thì cập nhật bàn thành available
    if (status && ['cancelled', 'no_show'].includes(status) && !isChangingTable) {
      await Table.findByIdAndUpdate(currentTableId, { status: 'available', updated_at: new Date() });
    }

    const updateData = {
      ...(customer_id !== undefined && { customer_id }),
      ...(isChangingTable && { table_id }),
      ...(date && { date: new Date(date) }),
      ...(time && { time }),
      ...(guest_count && { guest_count }),
      ...(contact_name && { contact_name }),
      ...(contact_phone && { contact_phone }),
      ...(contact_email !== undefined && { contact_email }),
      ...(status && { status }),
      ...(pre_order_items && { pre_order_items }),
      ...(deposit_amount !== undefined && { deposit_amount }),
      ...(payment_status && { payment_status }),
      ...(notes !== undefined && { notes }),
      updated_at: new Date()
    };

    // Ghi nhận người tạo nếu chưa có
    if (['admin', 'manager', 'staff'].includes(userRole) && !reservation.created_by_staff) {
      updateData.created_by_staff = userId;
    }

    const updatedReservation = await Reservation.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate(populateFields);

    res.status(200).json({
      success: true,
      message: ['admin', 'manager', 'waiter'].includes(userRole) ? 'Nhân viên cập nhật đặt bàn thành công' : 'Cập nhật đặt bàn thành công',
      data: updatedReservation
    });

  } catch (error) {
    console.error('Error in updateReservation:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật đặt bàn', error: error.message });
  }
};

// === Hủy đặt bàn (chỉ update status) ===
const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt bàn' });

    const { role: userRole, userId } = req.user;

    if (userRole === 'customer') {
      if (reservation.customer_id?.toString() !== userId) {
        return res.status(403).json({ success: false, message: 'Bạn chỉ có thể hủy đặt bàn của mình' });
      }
      if (!['pending', 'confirmed'].includes(reservation.status)) {
        return res.status(400).json({ success: false, message: 'Không thể hủy đặt bàn này' });
      }

      const reservationDateTime = new Date(`${reservation.date.toISOString().split('T')[0]}T${reservation.time}`);
      const now = new Date();
      const diffHours = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours < 2) {
        return res.status(400).json({ success: false, message: 'Không thể hủy đặt bàn trong vòng 2 tiếng trước giờ đặt' });
      }
    }

    if (reservation.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Đặt bàn này đã được hủy trước đó' });
    }

    if (!['pending', 'confirmed'].includes(reservation.status)) {
      return res.status(400).json({ success: false, message: 'Không thể hủy đặt bàn này do trạng thái hiện tại' });
    }

    // Cập nhật bàn về trạng thái available nếu bàn reserved
    if (reservation.table_id) {
      const table = await Table.findById(reservation.table_id);
      if (table?.status === 'reserved') {
        await Table.findByIdAndUpdate(reservation.table_id, { status: 'available', updated_at: new Date() });
      }
    }

    // Cập nhật trạng thái đặt bàn thành cancelled
    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', updated_at: new Date() },
      { new: true }
    ).populate(populateFields);

    res.status(200).json({
      success: true,
      message: userRole === 'customer' ? 'Hủy đặt bàn thành công' : 'Nhân viên hủy đặt bàn thành công',
      data: updatedReservation
    });

  } catch (error) {
    console.error('Error in cancelReservation:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi hủy đặt bàn', error: error.message });
  }
};

// === Chuyển bàn ===
const moveReservation = async (req, res) => {
  try {
    const { new_table_id } = req.body;
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt bàn' });

    const userRole = req.user.role;
    if (!['admin', 'manager', 'staff'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Chỉ nhân viên mới có thể chuyển bàn' });
    }

    const newTable = await Table.findById(new_table_id);
    if (!newTable || newTable.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Bàn mới không khả dụng' });
    }

    if (reservation.guest_count > newTable.capacity) {
      return res.status(400).json({ success: false, message: `Bàn mới chỉ có thể chứa tối đa ${newTable.capacity} người` });
    }

    await Table.findByIdAndUpdate(reservation.table_id, { status: 'available', updated_at: new Date() });
    await Table.findByIdAndUpdate(new_table_id, { status: 'reserved', updated_at: new Date() });

    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { table_id: new_table_id, updated_at: new Date() },
      { new: true }
    ).populate(populateFields);

    res.status(200).json({
      success: true,
      message: 'Chuyển bàn thành công',
      data: updatedReservation
    });
  } catch (error) {
    console.error('Error in moveReservation:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi chuyển bàn', error: error.message });
  }
};


module.exports = {
  getReservations,
  getCustomerReservations,
  getReservationById,
  createReservation,
  updateReservation,
  cancelReservation,
  moveReservation
};
