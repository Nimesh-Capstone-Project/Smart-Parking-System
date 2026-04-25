// const crypto = require("crypto");
// const Razorpay = require("razorpay");
// const Payment = require("../models/Payment");
// const { bookingClient, internalHeaders, notificationClient } = require("../config/http");

// const buildPaymentId = () => `PAY-${Date.now()}${Math.floor(Math.random() * 1000)}`;
// const buildTransactionRef = () => `TXN-${Date.now()}${Math.floor(Math.random() * 10000)}`;
// const getTrimmedEnv = (name) => (process.env[name] || "").trim();
// const buildPaymentSummary = (booking) => ({
//   bookingId: booking.bookingId,
//   slotId: booking.slotId,
//   vehicleType: booking.vehicleType,
//   startTime: booking.startTime,
//   endTime: booking.endTime,
//   duration: booking.duration ?? booking.durationHours ?? null,
//   durationHours: booking.durationHours ?? booking.duration ?? null,
//   ratePerHour: booking.ratePerHour ?? null,
//   totalAmount: booking.totalAmount ?? booking.amount,
// });

// const getRazorpayClient = () =>
//   new Razorpay({
//     key_id: getTrimmedEnv("RAZORPAY_KEY_ID"),
//     key_secret: getTrimmedEnv("RAZORPAY_KEY_SECRET"),
//   });

// const getBookingForPayment = async ({ bookingId, user }) => {
//   const bookingResponse = await bookingClient.get(`/internal/bookings/${bookingId}`, {
//     headers: internalHeaders(),
//   });
//   const booking = bookingResponse.data;

//   if (user.role !== "admin" && booking.userId !== user.id) {
//     return { error: { status: 403, message: "Access denied for this booking" } };
//   }

//   return { booking };
// };

// const cancelBookingAndReleaseSlot = async (bookingId) => {
//   try {
//     const cancelResponse = await bookingClient.post(
//       `/internal/bookings/${bookingId}/cancel`,
//       {},
//       { headers: internalHeaders() }
//     );
//     return cancelResponse.data.booking;
//   } catch (error) {
//     if (error.response?.status === 400 && /Cannot cancel a cancelled booking/i.test(error.response?.data?.message || "")) {
//       const bookingResponse = await bookingClient.get(`/internal/bookings/${bookingId}`, {
//         headers: internalHeaders(),
//       });
//       return bookingResponse.data;
//     }
//     throw error;
//   }
// };

// const sendPaymentNotification = async ({ booking, payment, type, message }) => {
//   const summary = buildPaymentSummary(booking);
//   await sendNotification({
//     recipientUserId: booking.userId,
//     bookingId: booking.bookingId,
//     type,
//     message,
//     metadata: {
//       ...summary,
//       method: payment.method,
//       paymentId: payment.paymentId,
//       orderId: payment.orderId,
//       razorpayPaymentId: payment.razorpayPaymentId,
//     },
//   });
// };

// const markPaymentFailed = async ({ booking, orderId = null, errorMessage = "Payment failed", paymentId = null }) => {
//   let payment = null;

//   if (paymentId) {
//     payment = await Payment.findOne({ paymentId });
//   }

//   if (!payment && orderId) {
//     payment = await Payment.findOne({ bookingId: booking.bookingId, orderId }).sort({ createdAt: -1 });
//   }

//   if (!payment) {
//     payment = new Payment({
//       paymentId: buildPaymentId(),
//       bookingId: booking.bookingId,
//       userId: booking.userId,
//       vehicleType: booking.vehicleType || null,
//       durationHours: booking.durationHours ?? booking.duration ?? null,
//       amount: booking.totalAmount ?? booking.amount,
//       currency: "INR",
//       method: "razorpay",
//       status: "failed",
//       orderId,
//       transactionRef: orderId || buildTransactionRef(),
//     });
//   } else {
//     payment.status = "failed";
//     payment.method = "razorpay";
//     payment.transactionRef = payment.transactionRef || orderId || buildTransactionRef();
//   }

//   await payment.save();
//   const cancelledBooking = await cancelBookingAndReleaseSlot(booking.bookingId);
//   await sendPaymentNotification({
//     booking,
//     payment,
//     type: "payment_failed",
//     message: `${errorMessage} for booking ${booking.bookingId}.`,
//   });

//   return { payment, booking: cancelledBooking };
// };

// const createOrder = async (req, res) => {
//   try {
//     const { bookingId, amount } = req.body;
//     if (!bookingId) {
//       return res.status(400).json({ message: "bookingId is required" });
//     }

//     const razorpayKeyId = getTrimmedEnv("RAZORPAY_KEY_ID");
//     const razorpayKeySecret = getTrimmedEnv("RAZORPAY_KEY_SECRET");

//     if (!razorpayKeyId || !razorpayKeySecret) {
//       return res.status(500).json({ message: "Razorpay credentials are not configured" });
//     }

//     const { booking, error } = await getBookingForPayment({ bookingId, user: req.user });
//     if (error) {
//       return res.status(error.status).json({ message: error.message });
//     }
//     if (booking.status !== "pending") {
//       return res.status(400).json({ message: `Cannot pay for a ${booking.status} booking` });
//     }

//     const summary = buildPaymentSummary(booking);
//     const expectedAmount = Number(summary.totalAmount);
//     if (Number.isNaN(expectedAmount) || expectedAmount <= 0) {
//       return res.status(400).json({ message: "Invalid booking amount" });
//     }

//     if (amount !== undefined && Number(amount) !== expectedAmount) {
//       return res.status(400).json({ message: "Amount mismatch for this booking" });
//     }

//     const order = await getRazorpayClient().orders.create({
//       amount: Math.round(expectedAmount * 100),
//       currency: "INR",
//       receipt: booking.bookingId,
//       notes: {
//         bookingId: booking.bookingId,
//         userId: booking.userId,
//       },
//     });

//     console.log("Order Response:", {
//       orderId: order.id,
//       amount: order.amount,
//       currency: order.currency,
//       bookingId,
//       keyId: razorpayKeyId,
//     });

//     await Payment.create({
//       paymentId: buildPaymentId(),
//       bookingId,
//       userId: booking.userId,
//       vehicleType: booking.vehicleType || null,
//       durationHours: booking.durationHours ?? booking.duration ?? null,
//       amount: expectedAmount,
//       currency: order.currency,
//       method: "razorpay",
//       status: "pending",
//       orderId: order.id,
//       transactionRef: order.id,
//     });

//     return res.json({
//       orderId: order.id,
//       amount: order.amount,
//       currency: order.currency,
//       keyId: razorpayKeyId,
//       bookingId,
//       summary,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Failed to create Razorpay order",
//       error: error.response?.data?.message || error.message,
//     });
//   }
// };

// const verifyPayment = async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
//     if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
//       return res.status(400).json({ message: "bookingId, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required" });
//     }

//     const { booking, error } = await getBookingForPayment({ bookingId, user: req.user });
//     if (error) {
//       return res.status(error.status).json({ message: error.message });
//     }

//     const razorpayKeySecret = getTrimmedEnv("RAZORPAY_KEY_SECRET");
//     if (!razorpayKeySecret) {
//       return res.status(500).json({ message: "Razorpay credentials are not configured" });
//     }

//     const expectedSignature = crypto
//       .createHmac("sha256", razorpayKeySecret)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest("hex");

//     if (expectedSignature !== razorpay_signature) {
//       const failedResult = await markPaymentFailed({
//         booking,
//         orderId: razorpay_order_id,
//         errorMessage: "Payment verification failed",
//       });
//       return res.status(400).json({
//         message: "Invalid payment signature",
//         payment: failedResult.payment,
//         booking: failedResult.booking,
//       });
//     }

//     let payment = await Payment.findOne({ bookingId, orderId: razorpay_order_id }).sort({ createdAt: -1 });
//     if (!payment) {
//       payment = new Payment({
//         paymentId: buildPaymentId(),
//         bookingId,
//         userId: booking.userId,
//         vehicleType: booking.vehicleType || null,
//         durationHours: booking.durationHours ?? booking.duration ?? null,
//         amount: booking.totalAmount ?? booking.amount,
//         currency: "INR",
//         method: "razorpay",
//         status: "pending",
//         orderId: razorpay_order_id,
//         transactionRef: razorpay_order_id,
//       });
//     }

//     payment.status = "success";
//     payment.method = "razorpay";
//     payment.currency = payment.currency || "INR";
//     payment.razorpayPaymentId = razorpay_payment_id;
//     payment.razorpaySignature = razorpay_signature;
//     payment.transactionRef = razorpay_payment_id;
//     await payment.save();

//     let confirmedBooking = booking;
//     if (booking.status === "pending") {
//       const confirmResponse = await bookingClient.post(
//         `/internal/bookings/${bookingId}/confirm`,
//         {},
//         { headers: internalHeaders() }
//       );
//       confirmedBooking = confirmResponse.data.booking;
//     }

//     await sendPaymentNotification({
//       booking,
//       payment,
//       type: "payment_success",
//       message: `Payment successful for booking ${bookingId}.`,
//     });

//     return res.json({
//       message: "Payment verified successfully",
//       payment,
//       booking: confirmedBooking,
//       summary: buildPaymentSummary(booking),
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Payment verification failed",
//       error: error.response?.data?.message || error.message,
//     });
//   }
// };

// const failPayment = async (req, res) => {
//   try {
//     const { bookingId, razorpay_order_id, reason = "Payment cancelled" } = req.body;
//     if (!bookingId) {
//       return res.status(400).json({ message: "bookingId is required" });
//     }

//     const { booking, error } = await getBookingForPayment({ bookingId, user: req.user });
//     if (error) {
//       return res.status(error.status).json({ message: error.message });
//     }

//     const failedResult = await markPaymentFailed({
//       booking,
//       orderId: razorpay_order_id || null,
//       errorMessage: reason,
//     });

//     return res.status(400).json({
//       message: "Payment failed",
//       payment: failedResult.payment,
//       booking: failedResult.booking,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Failed to mark payment as failed",
//       error: error.response?.data?.message || error.message,
//     });
//   }
// };

// const sendNotification = async ({ recipientUserId, bookingId, type, message, metadata = {} }) => {
//   try {
//     await notificationClient.post(
//       "/internal/notify",
//       { recipientUserId, bookingId, type, message, channel: "console", metadata },
//       { headers: internalHeaders() }
//     );
//   } catch (error) {
//     console.error("Payment notification failed", error.response?.data || error.message);
//   }
// };

// const processPayment = async (req, res) => {
//   try {
//     const { bookingId, method = "card", simulateSuccess = true } = req.body;
//     if (!bookingId) {
//       return res.status(400).json({ message: "bookingId is required" });
//     }

//     const bookingResponse = await bookingClient.get(`/internal/bookings/${bookingId}`, {
//       headers: internalHeaders(),
//     });
//     const booking = bookingResponse.data;

//     if (req.user.role !== "admin" && booking.userId !== req.user.id) {
//       return res.status(403).json({ message: "Access denied for this booking" });
//     }
//     if (booking.status !== "pending") {
//       return res.status(400).json({ message: `Cannot pay for a ${booking.status} booking` });
//     }

//     const summary = buildPaymentSummary(booking);

//     const payment = await Payment.create({
//       paymentId: buildPaymentId(),
//       bookingId,
//       userId: booking.userId,
//       vehicleType: booking.vehicleType || null,
//       durationHours: booking.durationHours ?? booking.duration ?? null,
//       amount: summary.totalAmount,
//       method,
//       status: simulateSuccess ? "success" : "failed",
//       transactionRef: buildTransactionRef(),
//     });

//     if (simulateSuccess) {
//       const confirmResponse = await bookingClient.post(
//         `/internal/bookings/${bookingId}/confirm`,
//         {},
//         { headers: internalHeaders() }
//       );
//       await sendNotification({
//         recipientUserId: booking.userId,
//         bookingId,
//         type: "payment_success",
//         message: `Payment successful for booking ${bookingId}.`,
//         metadata: { ...summary, method, paymentId: payment.paymentId },
//       });
//       return res.json({
//         message: "Payment successful",
//         summary,
//         payment,
//         booking: confirmResponse.data.booking,
//       });
//     }

//     const cancelResponse = await bookingClient.post(
//       `/internal/bookings/${bookingId}/cancel`,
//       {},
//       { headers: internalHeaders() }
//     );
//     await sendNotification({
//       recipientUserId: booking.userId,
//       bookingId,
//       type: "payment_failed",
//       message: `Payment failed for booking ${bookingId}.`,
//       metadata: { ...summary, method, paymentId: payment.paymentId },
//     });

//     return res.status(400).json({
//       message: "Payment failed",
//       summary,
//       payment,
//       booking: cancelResponse.data.booking,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Payment processing failed",
//       error: error.response?.data?.message || error.message,
//     });
//   }
// };

// const getPayments = async (req, res) => {
//   const query = req.user.role === "admin" ? {} : { userId: req.user.id };
//   const payments = await Payment.find(query).sort({ createdAt: -1 });
//   return res.json(payments);
// };

// module.exports = { createOrder, failPayment, getPayments, processPayment, verifyPayment };

const crypto = require("crypto");
const Razorpay = require("razorpay");
const Payment = require("../models/Payment");
const { bookingClient, internalHeaders, notificationClient } = require("../config/http");

const buildPaymentId = () => `PAY-${Date.now()}${Math.floor(Math.random() * 1000)}`;
const buildTransactionRef = () => `TXN-${Date.now()}${Math.floor(Math.random() * 10000)}`;
const getTrimmedEnv = (name) => (process.env[name] || "").trim();
const normalizeAmount = (value) => Number(Number(value || 0).toFixed(2));
const buildPaymentSummary = (booking) => ({
  bookingId: booking.bookingId,
  slotId: booking.slotId,
  vehicleType: booking.vehicleType,
  startTime: booking.startTime,
  endTime: booking.endTime,
  duration: booking.duration ?? booking.durationHours ?? null,
  durationHours: booking.durationHours ?? booking.duration ?? null,
  ratePerHour: booking.ratePerHour ?? null,
  totalAmount: booking.totalAmount ?? booking.amount,
});

const getRazorpayClient = () =>
  new Razorpay({
    key_id: getTrimmedEnv("RAZORPAY_KEY_ID"),
    key_secret: getTrimmedEnv("RAZORPAY_KEY_SECRET"),
  });

const getBookingForPayment = async ({ bookingId, user }) => {
  const bookingResponse = await bookingClient.get(`/internal/bookings/${bookingId}`, {
    headers: internalHeaders(),
  });
  const booking = bookingResponse.data;

  if (user.role !== "admin" && booking.userId !== user.id) {
    return { error: { status: 403, message: "Access denied for this booking" } };
  }

  return { booking };
};

const cancelBookingAndReleaseSlot = async (bookingId) => {
  try {
    const cancelResponse = await bookingClient.post(
      `/internal/bookings/${bookingId}/cancel`,
      {},
      { headers: internalHeaders() }
    );
    return cancelResponse.data.booking;
  } catch (error) {
    if (error.response?.status === 400 && /Cannot cancel a cancelled booking/i.test(error.response?.data?.message || "")) {
      const bookingResponse = await bookingClient.get(`/internal/bookings/${bookingId}`, {
        headers: internalHeaders(),
      });
      return bookingResponse.data;
    }
    throw error;
  }
};

const sendPaymentNotification = async ({ booking, payment, type, message }) => {
  const summary = buildPaymentSummary(booking);
  await sendNotification({
    recipientUserId: booking.userId,
    bookingId: booking.bookingId,
    type,
    message,
    metadata: {
      ...summary,
      method: payment.method,
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      razorpayPaymentId: payment.razorpayPaymentId,
    },
  });
};

const finalizeConfirmedBooking = async (bookingId, booking) => {
  if (booking.status !== "pending") {
    return booking;
  }

  const confirmResponse = await bookingClient.post(
    `/internal/bookings/${bookingId}/confirm`,
    {},
    { headers: internalHeaders() }
  );
  return confirmResponse.data.booking;
};

const markPaymentFailed = async ({ booking, orderId = null, errorMessage = "Payment failed", paymentId = null }) => {
  let payment = null;

  if (paymentId) {
    payment = await Payment.findOne({ paymentId });
  }

  if (!payment && orderId) {
    payment = await Payment.findOne({ bookingId: booking.bookingId, orderId }).sort({ createdAt: -1 });
  }

  if (payment?.status === "success" || booking.status === "confirmed") {
    return { payment, booking, skipped: true };
  }

  if (booking.status !== "pending") {
    return { payment, booking, skipped: true };
  }

  if (!payment) {
    payment = new Payment({
      paymentId: buildPaymentId(),
      bookingId: booking.bookingId,
      userId: booking.userId,
      vehicleType: booking.vehicleType || null,
      durationHours: booking.durationHours ?? booking.duration ?? null,
      amount: booking.totalAmount ?? booking.amount,
      currency: "INR",
      method: "razorpay",
      status: "failed",
      orderId,
      transactionRef: orderId || buildTransactionRef(),
    });
  } else {
    payment.status = "failed";
    payment.method = "razorpay";
    payment.transactionRef = payment.transactionRef || orderId || buildTransactionRef();
  }

  await payment.save();
  const cancelledBooking = await cancelBookingAndReleaseSlot(booking.bookingId);
  await sendPaymentNotification({
    booking,
    payment,
    type: "payment_failed",
    message: `${errorMessage} for booking ${booking.bookingId}.`,
  });

  return { payment, booking: cancelledBooking, skipped: false };
};

const createOrder = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    const razorpayKeyId = getTrimmedEnv("RAZORPAY_KEY_ID");
    const razorpayKeySecret = getTrimmedEnv("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      return res.status(500).json({ message: "Razorpay credentials are not configured" });
    }

    const { booking, error } = await getBookingForPayment({ bookingId, user: req.user });
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ message: `Cannot pay for a ${booking.status} booking` });
    }

    const summary = buildPaymentSummary(booking);
    const expectedAmount = normalizeAmount(summary.totalAmount);
    if (Number.isNaN(expectedAmount) || expectedAmount <= 0) {
      return res.status(400).json({ message: "Invalid booking amount" });
    }

    if (amount !== undefined && normalizeAmount(amount) !== expectedAmount) {
      return res.status(400).json({ message: "Amount mismatch for this booking" });
    }

    const order = await getRazorpayClient().orders.create({
      amount: Math.round(expectedAmount * 100),
      currency: "INR",
      receipt: booking.bookingId,
      notes: {
        bookingId: booking.bookingId,
        userId: booking.userId,
      },
    });

    console.log("Order Response:", {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId,
      keyId: razorpayKeyId,
    });

    await Payment.create({
      paymentId: buildPaymentId(),
      bookingId,
      userId: booking.userId,
      vehicleType: booking.vehicleType || null,
      durationHours: booking.durationHours ?? booking.duration ?? null,
      amount: expectedAmount,
      currency: order.currency,
      method: "razorpay",
      status: "pending",
      orderId: order.id,
      transactionRef: order.id,
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayKeyId,
      bookingId,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create Razorpay order",
      error: error.response?.data?.message || error.message,
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return res.status(400).json({ message: "bookingId, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required" });
    }

    const { booking, error } = await getBookingForPayment({ bookingId, user: req.user });
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    let payment = await Payment.findOne({ bookingId, orderId: razorpay_order_id }).sort({ createdAt: -1 });
    if (payment?.status === "success") {
      const confirmedBooking = await finalizeConfirmedBooking(bookingId, booking);
      return res.json({
        message: "Payment already verified",
        payment,
        booking: confirmedBooking,
        summary: buildPaymentSummary(confirmedBooking),
      });
    }

    const razorpayKeySecret = getTrimmedEnv("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      return res.status(500).json({ message: "Razorpay credentials are not configured" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      const failedResult = await markPaymentFailed({
        booking,
        orderId: razorpay_order_id,
        errorMessage: "Payment verification failed",
      });
      return res.status(400).json({
        message: "Invalid payment signature",
        payment: failedResult.payment,
        booking: failedResult.booking,
      });
    }

    if (!payment) {
      payment = new Payment({
        paymentId: buildPaymentId(),
        bookingId,
        userId: booking.userId,
        vehicleType: booking.vehicleType || null,
        durationHours: booking.durationHours ?? booking.duration ?? null,
        amount: booking.totalAmount ?? booking.amount,
        currency: "INR",
        method: "razorpay",
        status: "pending",
        orderId: razorpay_order_id,
        transactionRef: razorpay_order_id,
      });
    }

    payment.status = "success";
    payment.method = "razorpay";
    payment.currency = payment.currency || "INR";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.transactionRef = razorpay_payment_id;
    await payment.save();

    const confirmedBooking = await finalizeConfirmedBooking(bookingId, booking);

    await sendPaymentNotification({
      booking: confirmedBooking,
      payment,
      type: "payment_success",
      message: `Payment successful for booking ${bookingId}.`,
    });

    return res.json({
      message: "Payment verified successfully",
      payment,
      booking: confirmedBooking,
      summary: buildPaymentSummary(confirmedBooking),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Payment verification failed",
      error: error.response?.data?.message || error.message,
    });
  }
};

const failPayment = async (req, res) => {
  try {
    const { bookingId, razorpay_order_id, reason = "Payment cancelled" } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    const { booking, error } = await getBookingForPayment({ bookingId, user: req.user });
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const failedResult = await markPaymentFailed({
      booking,
      orderId: razorpay_order_id || null,
      errorMessage: reason,
    });

    return res.json({
      message: failedResult.skipped ? "Payment state already finalized" : "Payment failed",
      payment: failedResult.payment,
      booking: failedResult.booking,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to mark payment as failed",
      error: error.response?.data?.message || error.message,
    });
  }
};

const sendNotification = async ({ recipientUserId, bookingId, type, message, metadata = {} }) => {
  try {
    await notificationClient.post(
      "/internal/notify",
      { recipientUserId, bookingId, type, message, channel: "console", metadata },
      { headers: internalHeaders() }
    );
  } catch (error) {
    console.error("Payment notification failed", error.response?.data || error.message);
  }
};

const processPayment = async (req, res) => {
  try {
    const { bookingId, method = "card", simulateSuccess = true } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    const bookingResponse = await bookingClient.get(`/internal/bookings/${bookingId}`, {
      headers: internalHeaders(),
    });
    const booking = bookingResponse.data;

    if (req.user.role !== "admin" && booking.userId !== req.user.id) {
      return res.status(403).json({ message: "Access denied for this booking" });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ message: `Cannot pay for a ${booking.status} booking` });
    }

    const summary = buildPaymentSummary(booking);

    const payment = await Payment.create({
      paymentId: buildPaymentId(),
      bookingId,
      userId: booking.userId,
      vehicleType: booking.vehicleType || null,
      durationHours: booking.durationHours ?? booking.duration ?? null,
      amount: summary.totalAmount,
      method,
      status: simulateSuccess ? "success" : "failed",
      transactionRef: buildTransactionRef(),
    });

    if (simulateSuccess) {
      const confirmResponse = await bookingClient.post(
        `/internal/bookings/${bookingId}/confirm`,
        {},
        { headers: internalHeaders() }
      );
      await sendNotification({
        recipientUserId: booking.userId,
        bookingId,
        type: "payment_success",
        message: `Payment successful for booking ${bookingId}.`,
        metadata: { ...summary, method, paymentId: payment.paymentId },
      });
      return res.json({
        message: "Payment successful",
        summary,
        payment,
        booking: confirmResponse.data.booking,
      });
    }

    const cancelResponse = await bookingClient.post(
      `/internal/bookings/${bookingId}/cancel`,
      {},
      { headers: internalHeaders() }
    );
    await sendNotification({
      recipientUserId: booking.userId,
      bookingId,
      type: "payment_failed",
      message: `Payment failed for booking ${bookingId}.`,
      metadata: { ...summary, method, paymentId: payment.paymentId },
    });

    return res.status(400).json({
      message: "Payment failed",
      summary,
      payment,
      booking: cancelResponse.data.booking,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Payment processing failed",
      error: error.response?.data?.message || error.message,
    });
  }
};

const getPayments = async (req, res) => {
  const query = req.user.role === "admin" ? {} : { userId: req.user.id };
  const payments = await Payment.find(query).sort({ createdAt: -1 });
  return res.json(payments);
};

module.exports = { createOrder, failPayment, getPayments, processPayment, verifyPayment };

