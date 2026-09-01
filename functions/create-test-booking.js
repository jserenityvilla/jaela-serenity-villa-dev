const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

const bookingId = "TEST-BALANCE-REMINDER-4";

const booking = {
  bookingReference: "TEST-BALANCE-004",
  guestName: "Balance Test Guest",
  email: "kmohan.perera@gmail.com",

  checkin: "2026-08-30",
  checkout: "2026-09-02",

  status: "Confirmed",

  paymentStatus: "Deposit Paid",
  depositPaid: true,

  total: 196.00,
  depositAmount: 58.80,

  currency: "AUD",

  balancePaymentStatus: "Balance Due",
  balancePaid: false,

  balanceReminderSent: false,
  balanceCancellationProcessed: false,

  balanceDueHoursBeforeCheckin: 0,
  balanceGracePeriodHours: 48,

  cancellationFeePercentage: 30,
};

/**
 * Creates a test booking in Firestore.
 */
async function createTestBooking() {
  try {
    await db
        .collection("bookings")
        .doc(bookingId)
        .set(booking);

    console.log("");
    console.log("TEST BOOKING CREATED SUCCESSFULLY");
    console.log("----------------------------------");
    console.log("Document ID:", bookingId);
    console.log("Booking Reference:", booking.bookingReference);
    console.log("Check-in:", booking.checkin);
    console.log("Total:", booking.total);
    console.log("Deposit:", booking.depositAmount);
    console.log(
        "Expected Balance:",
        booking.total - booking.depositAmount,
    );
    console.log("Balance Due Hours:", booking.balanceDueHoursBeforeCheckin);
    console.log("Grace Period Hours:", booking.balanceGracePeriodHours);
    console.log("----------------------------------");
    console.log("");
  } catch (error) {
    console.error("ERROR CREATING TEST BOOKING:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await admin.app().delete();
  }
}

createTestBooking();
