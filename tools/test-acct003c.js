const fs = require("fs");
const vm = require("vm");

const utilsPath =
    "admin/accounts/accounts-payments-utils.js";

const script =
    fs.readFileSync(utilsPath, "utf8");

const sandbox = {
    window: {},
    console
};

vm.createContext(sandbox);
vm.runInContext(script, sandbox);

const utils =
    sandbox.window.AccountsPaymentsUtils;

if (!utils) {
    throw new Error(
        "AccountsPaymentsUtils failed to load."
    );
}

let passed = 0;
let failed = 0;

function test(name, condition) {
    if (condition) {
        console.log("PASS ", name);
        passed++;
    } else {
        console.log("FAIL ", name);
        failed++;
    }
}

console.log("");
console.log("==================================================");
console.log(" ACCT-003C Automated Regression Test");
console.log("==================================================");
console.log("");

test(
    "Payment types available",
    utils.PAYMENT_TYPES.length === 4 &&
    utils.PAYMENT_TYPES.includes("Deposit") &&
    utils.PAYMENT_TYPES.includes("Balance") &&
    utils.PAYMENT_TYPES.includes("Full Payment") &&
    utils.PAYMENT_TYPES.includes("Refund")
);

test(
    "Payment statuses available",
    utils.PAYMENT_STATUSES.length === 5 &&
    utils.PAYMENT_STATUSES.includes("Pending") &&
    utils.PAYMENT_STATUSES.includes("Completed") &&
    utils.PAYMENT_STATUSES.includes("Failed") &&
    utils.PAYMENT_STATUSES.includes("Cancelled") &&
    utils.PAYMENT_STATUSES.includes("Refunded")
);

test(
    "Payment methods available",
    utils.PAYMENT_METHODS.length === 5 &&
    utils.PAYMENT_METHODS.includes("Stripe") &&
    utils.PAYMENT_METHODS.includes("Bank Transfer") &&
    utils.PAYMENT_METHODS.includes("Cash") &&
    utils.PAYMENT_METHODS.includes("Credit/Debit Card") &&
    utils.PAYMENT_METHODS.includes("Other")
);

const validDeposit = {
    bookingId: "booking-1",
    paymentDate: "2026-09-18",
    paymentType: "Deposit",
    amount: 90,
    currency: "AUD",
    paymentMethod: "Stripe",
    paymentStatus: "Completed",
    transactionReference: "ACCT003C-AUTO-001"
};

const validRefund = {
    bookingId: "booking-1",
    paymentDate: "2026-09-18",
    paymentType: "Refund",
    amount: -50,
    currency: "AUD",
    paymentMethod: "Stripe",
    paymentStatus: "Completed",
    transactionReference: "ACCT003C-AUTO-RF-001"
};

test(
    "Valid deposit accepted",
    utils.validatePayment(validDeposit).valid === true
);

test(
    "Valid negative refund accepted",
    utils.validatePayment(validRefund).valid === true
);

test(
    "Zero amount rejected",
    utils.validatePayment({
        ...validDeposit,
        amount: 0
    }).valid === false
);

test(
    "Positive refund rejected",
    utils.validatePayment({
        ...validRefund,
        amount: 50
    }).valid === false
);

test(
    "Negative normal payment rejected",
    utils.validatePayment({
        ...validDeposit,
        amount: -10
    }).valid === false
);

test(
    "Invalid payment type rejected",
    utils.validatePayment({
        ...validDeposit,
        paymentType: "Unknown"
    }).valid === false
);

test(
    "Invalid payment status rejected",
    utils.validatePayment({
        ...validDeposit,
        paymentStatus: "Unknown"
    }).valid === false
);

test(
    "Invalid payment method rejected",
    utils.validatePayment({
        ...validDeposit,
        paymentMethod: "Cheque"
    }).valid === false
);

const completedPayments = [
    {
        id: "p1",
        bookingId: "booking-1",
        paymentType: "Deposit",
        amount: 90,
        paymentStatus: "Completed",
        transactionReference: "TX-001"
    },
    {
        id: "p2",
        bookingId: "booking-1",
        paymentType: "Balance",
        amount: 210,
        paymentStatus: "Completed",
        transactionReference: "TX-002"
    },
    {
        id: "p3",
        bookingId: "booking-1",
        paymentType: "Refund",
        amount: -50,
        paymentStatus: "Completed",
        transactionReference: "RF-001"
    },
    {
        id: "p4",
        bookingId: "booking-1",
        paymentType: "Balance",
        amount: 100,
        paymentStatus: "Pending",
        transactionReference: "TX-PENDING"
    },
    {
        id: "p5",
        bookingId: "booking-1",
        paymentType: "Balance",
        amount: 75,
        paymentStatus: "Failed",
        transactionReference: "TX-FAILED"
    },
    {
        id: "p6",
        bookingId: "booking-1",
        paymentType: "Deposit",
        amount: 60,
        paymentStatus: "Cancelled",
        transactionReference: "TX-CANCELLED"
    }
];

test(
    "Completed positive payments total",
    utils.getCompletedPaymentAmount(
        completedPayments
    ) === 250
);

test(
    "Refund amount total",
    utils.getRefundAmount(
        completedPayments
    ) === 50
);

test(
    "Net received total",
    utils.getNetReceived(
        completedPayments
    ) === 250
);

test(
    "Booking outstanding is 50",
    utils.getBookingOutstanding(
        300,
        completedPayments
    ) === 50
);

test(
    "Fully paid booking status",
    utils.getBookingPaymentStatus(
        300,
        [
            {
                paymentType: "Deposit",
                amount: 90,
                paymentStatus: "Completed"
            },
            {
                paymentType: "Balance",
                amount: 210,
                paymentStatus: "Completed"
            }
        ]
    ) === "Paid"
);

test(
    "Deposit-only booking status",
    utils.getBookingPaymentStatus(
        300,
        [
            {
                paymentType: "Deposit",
                amount: 90,
                paymentStatus: "Completed"
            }
        ]
    ) === "Balance Due"
);

test(
    "No-payment booking status",
    utils.getBookingPaymentStatus(
        300,
        []
    ) === "Deposit Required"
);

test(
    "Duplicate completed reference detected",
    utils.isDuplicateTransactionReference(
        completedPayments,
        "TX-001"
    ) === true
);

test(
    "Unique reference accepted",
    utils.isDuplicateTransactionReference(
        completedPayments,
        "TX-NEW"
    ) === false
);

test(
    "Existing payment ignored when checking itself",
    utils.isDuplicateTransactionReference(
        completedPayments,
        "TX-001",
        "p1"
    ) === false
);

console.log("");
console.log("==================================================");
console.log(" ACCT-003C TEST SUMMARY");
console.log("==================================================");
console.log("Passed:", passed);
console.log("Failed:", failed);
console.log("");

if (failed === 0) {
    console.log(
        "RESULT: ALL ACCT-003C TESTS PASSED"
    );
    process.exit(0);
}

console.log(
    "RESULT: ACCT-003C TESTS FAILED"
);

process.exit(1);
