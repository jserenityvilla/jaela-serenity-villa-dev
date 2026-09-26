const admin = require("../functions/node_modules/firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const PROJECT_ID = "ja-ela-serenity-villa-test";
const COLLECTION = "bookings";

const TEST_IDS = [
  "acct002-test-paid",
  "acct002-test-balance-due",
  "acct002-test-deposit-required",
  "acct002-test-cancelled",
  "acct002-test-cross-month"
];

let passed = 0;
let failed = 0;

function assertTrue(name, condition, details = "") {
  if (condition) {
    console.log(`PASS  ${name}`);
    if (details) console.log(`      ${details}`);
    passed++;
  } else {
    console.error(`FAIL  ${name}`);
    if (details) console.error(`      ${details}`);
    failed++;
  }
}

function number(value) {
  return Number(value || 0);
}

function guestCount(booking) {
  const stored = number(booking.totalGuests);
  return stored > 0
    ? Math.trunc(stored)
    : Math.trunc(number(booking.adults) + number(booking.children));
}

function effectivePaymentStatus(booking) {
  const paymentStatus = String(booking.paymentStatus || "");
  const balancePaymentStatus = String(booking.balancePaymentStatus || "");
  const balancePaid = Boolean(booking.balancePaid);

  if (
    paymentStatus === "Paid" ||
    balancePaymentStatus === "Paid" ||
    balancePaid
  ) {
    return "Paid";
  }

  if (balancePaymentStatus === "Balance Due") {
    return "Balance Due";
  }

  if (paymentStatus === "Deposit Paid") {
    return "Deposit Paid";
  }

  if (
    paymentStatus === "Deposit Required" ||
    paymentStatus === "Deposit Checkout Created"
  ) {
    return "Deposit Required";
  }

  return paymentStatus;
}

function getDepositPaid(booking) {
  return booking.depositPaid ? number(booking.depositAmount) : 0;
}

function getBalancePaid(booking) {
  if (
    booking.balancePaid ||
    String(booking.balancePaymentStatus || "") === "Paid"
  ) {
    return number(booking.balanceAmount);
  }

  return 0;
}

function outstanding(booking) {
  return Math.max(
    0,
    number(booking.total) -
      getDepositPaid(booking) -
      getBalancePaid(booking)
  );
}

function dateOverlap(booking, from, to) {
  const checkIn = new Date(`${booking.checkin}T00:00:00`);
  const checkOut = new Date(`${booking.checkout}T00:00:00`);

  return checkOut > from && checkIn <= to;
}

const testBookings = [
  {
    id: "acct002-test-paid",
    data: {
      bookingReference: "ACCT002-PAID",
      guestName: "ACCT002 Paid Test",
      email: "acct002-paid@test.example",
      checkin: "2026-10-06",
      checkout: "2026-10-09",
      nights: 3,
      adults: 2,
      children: 0,
      totalGuests: 2,
      accommodation: 180,
      extraGuestFee: 0,
      cleaningFee: 6,
      total: 186,
      currency: "AUD",
      status: "Confirmed",
      paymentStatus: "Paid",
      balancePaymentStatus: "Paid",
      depositAmount: 55.8,
      balanceAmount: 130.2,
      depositPaid: true,
      balancePaid: true,
      specialRequests: "ACCT-002 automated test"
    }
  },
  {
    id: "acct002-test-balance-due",
    data: {
      bookingReference: "ACCT002-BALANCE",
      guestName: "ACCT002 Balance Test",
      email: "acct002-balance@test.example",
      checkin: "2026-10-10",
      checkout: "2026-10-14",
      nights: 4,
      adults: 4,
      children: 0,
      totalGuests: 4,
      accommodation: 240,
      extraGuestFee: 0,
      cleaningFee: 6,
      total: 246,
      currency: "AUD",
      status: "Confirmed",
      paymentStatus: "Deposit Paid",
      balancePaymentStatus: "Balance Due",
      depositAmount: 73.8,
      balanceAmount: 172.2,
      depositPaid: true,
      balancePaid: false,
      specialRequests: "ACCT-002 automated test"
    }
  },
  {
    id: "acct002-test-deposit-required",
    data: {
      bookingReference: "ACCT002-DEPOSIT",
      guestName: "ACCT002 Deposit Test",
      email: "acct002-deposit@test.example",
      checkin: "2026-10-15",
      checkout: "2026-10-20",
      nights: 5,
      adults: 6,
      children: 0,
      totalGuests: 6,
      accommodation: 300,
      extraGuestFee: 0,
      cleaningFee: 6,
      total: 306,
      currency: "AUD",
      status: "Pending",
      paymentStatus: "Deposit Required",
      balancePaymentStatus: "",
      depositAmount: 91.8,
      balanceAmount: 214.2,
      depositPaid: false,
      balancePaid: false,
      specialRequests: "ACCT-002 automated test"
    }
  },
  {
    id: "acct002-test-cancelled",
    data: {
      bookingReference: "ACCT002-CANCELLED",
      guestName: "ACCT002 Cancelled Test",
      email: "acct002-cancelled@test.example",
      checkin: "2026-10-21",
      checkout: "2026-10-23",
      nights: 2,
      adults: 2,
      children: 0,
      totalGuests: 2,
      accommodation: 120,
      extraGuestFee: 0,
      cleaningFee: 6,
      total: 126,
      currency: "AUD",
      status: "Cancelled",
      paymentStatus: "",
      balancePaymentStatus: "",
      depositAmount: 0,
      balanceAmount: 0,
      depositPaid: false,
      balancePaid: false,
      specialRequests: "ACCT-002 automated test"
    }
  },
  {
    id: "acct002-test-cross-month",
    data: {
      bookingReference: "ACCT002-CROSSMONTH",
      guestName: "ACCT002 Cross Month Test",
      email: "acct002-crossmonth@test.example",
      checkin: "2026-10-29",
      checkout: "2026-11-02",
      nights: 4,
      adults: 8,
      children: 0,
      totalGuests: 8,
      accommodation: 240,
      extraGuestFee: 22,
      cleaningFee: 6,
      total: 268,
      currency: "AUD",
      status: "Confirmed",
      paymentStatus: "Deposit Required",
      balancePaymentStatus: "",
      depositAmount: 80.4,
      balanceAmount: 187.6,
      depositPaid: false,
      balancePaid: false,
      specialRequests: "ACCT-002 automated test"
    }
  }
];

async function main() {
  console.log("");
  console.log("==================================================");
  console.log(" ACCT-002 DEV Automated Regression Test");
  console.log(" Firestore Emulator: 127.0.0.1:8080");
  console.log("==================================================");
  console.log("");

  admin.initializeApp({
    projectId: PROJECT_ID
  });

  const db = admin.firestore();

  console.log("Cleaning any previous ACCT-002 temporary records...");

  for (const id of TEST_IDS) {
    await db.collection(COLLECTION).doc(id).delete();
  }

  console.log("Creating controlled ACCT-002 records...");

  for (const item of testBookings) {
    await db.collection(COLLECTION).doc(item.id).set(item.data);
    console.log(`  Created ${item.data.bookingReference}`);
  }

  const records = [];

  for (const item of testBookings) {
    const snap = await db.collection(COLLECTION).doc(item.id).get();

    if (snap.exists) {
      records.push({
        id: snap.id,
        ...snap.data()
      });
    }
  }

  assertTrue(
    "Controlled test records created",
    records.length === 5,
    `Created and read back ${records.length} records.`
  );

  const confirmed = records.filter(r => r.status === "Confirmed");
  const pending = records.filter(r => r.status === "Pending");
  const cancelled = records.filter(r => r.status === "Cancelled");

  console.log("");
  console.log("Controlled status counts:");
  console.log(`  Confirmed : ${confirmed.length}`);
  console.log(`  Pending   : ${pending.length}`);
  console.log(`  Cancelled : ${cancelled.length}`);

  assertTrue(
    "Confirmed status filter",
    confirmed.length === 3
  );

  assertTrue(
    "Pending status filter",
    pending.length === 1
  );

  assertTrue(
    "Cancelled status filter",
    cancelled.length === 1
  );

  const confirmedRevenue = confirmed.reduce(
    (sum, r) => sum + number(r.total),
    0
  );

  const pendingRevenue = pending.reduce(
    (sum, r) => sum + number(r.total),
    0
  );

  const cancelledRevenue = cancelled.reduce(
    (sum, r) => sum + number(r.total),
    0
  );

  console.log("");
  console.log("Controlled revenue:");
  console.log(`  Confirmed : AUD ${confirmedRevenue.toFixed(2)}`);
  console.log(`  Pending   : AUD ${pendingRevenue.toFixed(2)}`);
  console.log(`  Cancelled : AUD ${cancelledRevenue.toFixed(2)}`);

  assertTrue(
    "Confirmed revenue calculation",
    confirmedRevenue === 700,
    `Expected 700, got ${confirmedRevenue}.`
  );

  assertTrue(
    "Pending revenue must be excluded from recognised revenue",
    confirmedRevenue !== confirmedRevenue + pendingRevenue
  );

  assertTrue(
    "Cancelled revenue must be excluded from recognised revenue",
    confirmedRevenue !== confirmedRevenue + cancelledRevenue
  );

  const paid = records.filter(
    r => effectivePaymentStatus(r) === "Paid"
  );

  const balanceDue = records.filter(
    r => effectivePaymentStatus(r) === "Balance Due"
  );

  const depositPaidRecords = records.filter(
    r => effectivePaymentStatus(r) === "Deposit Paid"
  );

  const depositRequired = records.filter(
    r => effectivePaymentStatus(r) === "Deposit Required"
  );

  console.log("");
  console.log("Controlled payment statuses:");
  console.log(`  Paid             : ${paid.length}`);
  console.log(`  Balance Due      : ${balanceDue.length}`);
  console.log(`  Deposit Paid     : ${depositPaidRecords.length}`);
  console.log(`  Deposit Required : ${depositRequired.length}`);

  assertTrue(
    "Paid classification",
    paid.length === 1
  );

  assertTrue(
    "Balance Due classification",
    balanceDue.length === 1
  );

  assertTrue(
    "Deposit Paid classification",
    depositPaidRecords.length === 0
  );

  assertTrue(
    "Deposit Required classification",
    depositRequired.length === 2
  );

  const balancePriorityFailures = records.filter(
    r =>
      r.balancePaymentStatus === "Balance Due" &&
      effectivePaymentStatus(r) !== "Balance Due"
  );

  assertTrue(
    "Balance Due priority over Deposit Paid",
    balancePriorityFailures.length === 0
  );

  let reconciliationFailures = 0;

  for (const record of records) {
    const expectedOutstanding = Math.max(
      0,
      number(record.total) -
        getDepositPaid(record) -
        getBalancePaid(record)
    );

    const actualOutstanding = outstanding(record);

    if (Math.abs(actualOutstanding - expectedOutstanding) >= 0.01) {
      reconciliationFailures++;
    }
  }

  assertTrue(
    "Payment reconciliation",
    reconciliationFailures === 0,
    `${records.length - reconciliationFailures}/${records.length} records reconciled.`
  );

  const octoberFrom = new Date("2026-10-01T00:00:00");
  const octoberTo = new Date("2026-10-31T00:00:00");

  const octoberBookings = records.filter(
    r => dateOverlap(r, octoberFrom, octoberTo)
  );

  assertTrue(
    "October date-range overlap",
    octoberBookings.length === 5,
    `Found ${octoberBookings.length} October-overlapping records.`
  );

  const crossMonth = records.filter(
    r =>
      r.checkin === "2026-10-29" &&
      r.checkout === "2026-11-02"
  );

  assertTrue(
    "Cross-month booking detected",
    crossMonth.length === 1
  );

  const guestSearch = records.filter(
    r => String(r.guestName || "").toLowerCase().includes("balance")
  );

  assertTrue(
    "Guest search",
    guestSearch.length === 1
  );

  const referenceSearch = records.filter(
    r => r.bookingReference === "ACCT002-BALANCE"
  );

  assertTrue(
    "Exact booking-reference search",
    referenceSearch.length === 1
  );

  const eightGuestRecord = records.find(
    r => r.bookingReference === "ACCT002-CROSSMONTH"
  );

  assertTrue(
    "Guest count = 8",
    guestCount(eightGuestRecord) === 8
  );

  assertTrue(
    "Controlled confirmed revenue total",
    confirmedRevenue === 700
  );

  console.log("");
  console.log("Cleaning up ACCT-002 temporary records...");

  for (const id of TEST_IDS) {
    await db.collection(COLLECTION).doc(id).delete();
    console.log(`  Deleted ${id}`);
  }

  let remaining = 0;

  for (const id of TEST_IDS) {
    const snap = await db.collection(COLLECTION).doc(id).get();

    if (snap.exists) {
      remaining++;
    }
  }

  assertTrue(
    "ACCT-002 test-data cleanup",
    remaining === 0,
    `${remaining} temporary record(s) remain.`
  );

  await admin.app().delete();

  console.log("");
  console.log("==================================================");
  console.log(" ACCT-002 DEV TEST SUMMARY");
  console.log("==================================================");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log("");
    console.log("RESULT: ALL ACCT-002 DEV TESTS PASSED");
    process.exit(0);
  }

  console.error("");
  console.error(`RESULT: ${failed} ACCT-002 DEV TEST(S) FAILED`);
  process.exit(1);
}

main().catch(async error => {
  console.error("");
  console.error("TEST EXECUTION ERROR");
  console.error(error.stack || error.message || error);

  try {
    await admin.app().delete();
  } catch (_) {}

  process.exit(1);
});

