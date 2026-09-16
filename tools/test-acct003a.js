const fs = require("fs");
const vm = require("vm");

let passed = 0;
let failed = 0;

function assert(name, actual, expected) {
    const ok = actual === expected;

    if (ok) {
        console.log(`PASS  ${name}`);
        passed++;
    } else {
        console.error(
            `FAIL  ${name} | Expected: ${expected} | Actual: ${actual}`
        );
        failed++;
    }
}

const code = fs.readFileSync(
    "admin/accounts/accounts-payments-utils.js",
    "utf8"
);

const context = {
    window: {},
    console
};

vm.createContext(context);
vm.runInContext(code, context);

const utils = context.window.AccountsPaymentsUtils;

if (!utils) {
    throw new Error(
        "AccountsPaymentsUtils was not initialised."
    );
}

console.log("");
console.log("==================================================");
console.log(" ACCT-003A Payment Utility Automated Test");
console.log("==================================================");
console.log("");

assert(
    "Payment types count",
    utils.PAYMENT_TYPES.length,
    4
);

assert(
    "Payment statuses count",
    utils.PAYMENT_STATUSES.length,
    5
);

assert(
    "Payment methods count",
    utils.PAYMENT_METHODS.length,
    5
);

const deposit = {
    id: "p1",
    bookingId: "booking-001",
    paymentDate: "2026-10-01",
    paymentType: "Deposit",
    amount: 90,
    currency: "AUD",
    paymentMethod: "Stripe",
    paymentStatus: "Completed",
    transactionReference: "TX-001"
};

const balance = {
    id: "p2",
    bookingId: "booking-001",
    paymentDate: "2026-10-02",
    paymentType: "Balance",
    amount: 210,
    currency: "AUD",
    paymentMethod: "Stripe",
    paymentStatus: "Completed",
    transactionReference: "TX-002"
};

const pendingPayment = {
    id: "p3",
    bookingId: "booking-001",
    paymentDate: "2026-10-03",
    paymentType: "Balance",
    amount: 50,
    currency: "AUD",
    paymentMethod: "Bank Transfer",
    paymentStatus: "Pending",
    transactionReference: "TX-003"
};

const refund = {
    id: "p4",
    bookingId: "booking-001",
    paymentDate: "2026-10-04",
    paymentType: "Refund",
    amount: -40,
    currency: "AUD",
    paymentMethod: "Stripe",
    paymentStatus: "Completed",
    transactionReference: "RF-001"
};

const payments = [
    deposit,
    balance,
    pendingPayment,
    refund
];

assert(
    "Valid deposit",
    utils.validatePayment(deposit).valid,
    true
);

assert(
    "Valid refund",
    utils.validatePayment(refund).valid,
    true
);

const zeroAmount = utils.validatePayment({
    ...deposit,
    amount: 0
});

assert(
    "Zero amount rejected",
    zeroAmount.valid,
    false
);

const invalidRefund = utils.validatePayment({
    ...refund,
    amount: 40
});

assert(
    "Positive refund rejected",
    invalidRefund.valid,
    false
);

const invalidType = utils.validatePayment({
    ...deposit,
    paymentType: "Something Else"
});

assert(
    "Invalid payment type rejected",
    invalidType.valid,
    false
);

assert(
    "Completed payment total",
    utils.getCompletedPaymentAmount(payments),
    260
);

assert(
    "Refund amount",
    utils.getRefundAmount(payments),
    40
);

assert(
    "Net received",
    utils.getNetReceived(payments),
    260
);

assert(
    "Outstanding after refund",
    utils.getBookingOutstanding(300, payments),
    40
);

const paidPayments = [deposit, balance];

assert(
    "Fully paid booking status",
    utils.getBookingPaymentStatus(300, paidPayments),
    "Paid"
);

assert(
    "Deposit-only booking status",
    utils.getBookingPaymentStatus(300, [deposit]),
    "Balance Due"
);

assert(
    "No-payment booking status",
    utils.getBookingPaymentStatus(300, []),
    "Deposit Required"
);

assert(
    "Duplicate completed transaction detected",
    utils.isDuplicateTransactionReference(
        payments,
        "TX-001"
    ),
    true
);

assert(
    "Unique transaction reference accepted",
    utils.isDuplicateTransactionReference(
        payments,
        "TX-999"
    ),
    false
);

console.log("");
console.log("==================================================");
console.log(" ACCT-003A TEST SUMMARY");
console.log("==================================================");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
    console.log("");
    console.log("RESULT: ALL ACCT-003A TESTS PASSED");
    process.exit(0);
}

console.log("");
console.error(`RESULT: ${failed} ACCT-003A TEST(S) FAILED`);
process.exit(1);
