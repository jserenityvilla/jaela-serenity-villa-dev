const fs = require("fs");
const vm = require("vm");

let passed = 0;
let failed = 0;

function assertEqual(name, actual, expected) {
    if (actual === expected) {
        console.log(`PASS  ${name}`);
        passed++;
    } else {
        console.error(
            `FAIL  ${name} | Expected: ${expected} | Actual: ${actual}`
        );
        failed++;
    }
}

function assertContains(name, actual, expected) {
    if (String(actual).includes(expected)) {
        console.log(`PASS  ${name}`);
        passed++;
    } else {
        console.error(
            `FAIL  ${name} | Expected to contain: ${expected}`
        );
        failed++;
    }
}

function makeElement(id) {
    return {
        id,
        value: "",
        textContent: "",
        innerHTML: "",
        hidden: false,
        listeners: {},
        addEventListener(event, handler) {
            this.listeners[event] = handler;
        }
    };
}

const elements = {};

[
    "dateFrom",
    "dateTo",
    "paymentType",
    "paymentStatus",
    "paymentMethod",
    "searchText",
    "refreshButton",
    "clearButton",
    "applyButton",
    "paymentsBody",
    "resultCount",
    "totalPayments",
    "completedPayments",
    "pendingPayments",
    "refunds",
    "totalReceived",
    "totalRefunded",
    "netReceived",
    "outstandingAmount",
    "loadingState",
    "errorState",
    "paymentsContent"
].forEach(id => {
    elements[id] = makeElement(id);
});

const testBookings = {
    "acct003b-book-a": {
        bookingReference: "ACCT003B-A",
        guestName: "ACCT003B Guest A",
        email: "acct003b.a@test.local",
        checkin: "2026-09-01",
        checkout: "2026-09-03",
        total: 300,
        currency: "AUD",
        status: "Confirmed"
    },

    "acct003b-book-b": {
        bookingReference: "ACCT003B-B",
        guestName: "ACCT003B Guest B",
        email: "acct003b.b@test.local",
        checkin: "2026-09-04",
        checkout: "2026-09-07",
        total: 400,
        currency: "AUD",
        status: "Confirmed"
    },

    "acct003b-book-c": {
        bookingReference: "ACCT003B-C",
        guestName: "ACCT003B Guest C",
        email: "acct003b.c@test.local",
        checkin: "2026-09-08",
        checkout: "2026-09-10",
        total: 250,
        currency: "AUD",
        status: "Confirmed"
    },

    "acct003b-book-d": {
        bookingReference: "ACCT003B-D",
        guestName: "ACCT003B Guest D",
        email: "acct003b.d@test.local",
        checkin: "2026-09-11",
        checkout: "2026-09-13",
        total: 500,
        currency: "AUD",
        status: "Confirmed"
    },

    "acct003b-book-e": {
        bookingReference: "ACCT003B-E",
        guestName: "ACCT003B Guest E",
        email: "acct003b.e@test.local",
        checkin: "2026-09-14",
        checkout: "2026-09-16",
        total: 600,
        currency: "AUD",
        status: "Confirmed"
    },

    "acct003b-book-f": {
        bookingReference: "ACCT003B-F",
        guestName: "ACCT003B Guest F",
        email: "acct003b.f@test.local",
        checkin: "2026-09-15",
        checkout: "2026-09-17",
        total: 700,
        currency: "AUD",
        status: "Confirmed"
    }
};

const testPayments = {
    "acct003b-pay-a1": {
        bookingId: "acct003b-book-a",
        bookingReference: "ACCT003B-A",
        paymentDate: "2026-09-01",
        paymentType: "Deposit",
        amount: 90,
        currency: "AUD",
        paymentMethod: "Stripe",
        paymentStatus: "Completed",
        transactionReference: "ACCT003B-TX-A1",
        description: "Test deposit A"
    },

    "acct003b-pay-a2": {
        bookingId: "acct003b-book-a",
        bookingReference: "ACCT003B-A",
        paymentDate: "2026-09-02",
        paymentType: "Balance",
        amount: 210,
        currency: "AUD",
        paymentMethod: "Stripe",
        paymentStatus: "Completed",
        transactionReference: "ACCT003B-TX-A2",
        description: "Test balance A"
    },

    "acct003b-pay-b1": {
        bookingId: "acct003b-book-b",
        bookingReference: "ACCT003B-B",
        paymentDate: "2026-09-04",
        paymentType: "Deposit",
        amount: 120,
        currency: "AUD",
        paymentMethod: "Bank Transfer",
        paymentStatus: "Completed",
        transactionReference: "ACCT003B-TX-B1",
        description: "Test deposit B"
    },

    "acct003b-pay-b2": {
        bookingId: "acct003b-book-b",
        bookingReference: "ACCT003B-B",
        paymentDate: "2026-09-05",
        paymentType: "Balance",
        amount: 280,
        currency: "AUD",
        paymentMethod: "Bank Transfer",
        paymentStatus: "Pending",
        transactionReference: "ACCT003B-TX-B2",
        description: "Test pending balance B"
    },

    "acct003b-pay-c1": {
        bookingId: "acct003b-book-c",
        bookingReference: "ACCT003B-C",
        paymentDate: "2026-09-08",
        paymentType: "Full Payment",
        amount: 250,
        currency: "AUD",
        paymentMethod: "Cash",
        paymentStatus: "Completed",
        transactionReference: "ACCT003B-TX-C1",
        description: "Test full payment C"
    },

    "acct003b-pay-c2": {
        bookingId: "acct003b-book-c",
        bookingReference: "ACCT003B-C",
        paymentDate: "2026-09-09",
        paymentType: "Refund",
        amount: -50,
        currency: "AUD",
        paymentMethod: "Cash",
        paymentStatus: "Completed",
        transactionReference: "ACCT003B-RF-C1",
        description: "Test refund C"
    },

    "acct003b-pay-d1": {
        bookingId: "acct003b-book-d",
        bookingReference: "ACCT003B-D",
        paymentDate: "2026-09-11",
        paymentType: "Deposit",
        amount: 100,
        currency: "AUD",
        paymentMethod: "Other",
        paymentStatus: "Failed",
        transactionReference: "ACCT003B-TX-D1",
        description: "Test failed payment D"
    },

    "acct003b-pay-e1": {
        bookingId: "acct003b-book-e",
        bookingReference: "ACCT003B-E",
        paymentDate: "2026-09-14",
        paymentType: "Deposit",
        amount: 150,
        currency: "AUD",
        paymentMethod: "Cash",
        paymentStatus: "Cancelled",
        transactionReference: "ACCT003B-TX-E1",
        description: "Test cancelled payment E"
    },

    "acct003b-pay-f1": {
        bookingId: "acct003b-book-f",
        bookingReference: "ACCT003B-F",
        paymentDate: "2026-09-15",
        paymentType: "Balance",
        amount: 80,
        currency: "AUD",
        paymentMethod: "Stripe",
        paymentStatus: "Refunded",
        transactionReference: "ACCT003B-RF-F1",
        description: "Test refunded transaction F"
    }
};

function createSnapshot(records) {
    return {
        size: Object.keys(records).length,
        forEach(callback) {
            Object.entries(records).forEach(([id, data]) => {
                callback({
                    id,
                    data: () => ({ ...data })
                });
            });
        }
    };
}

const mockDb = {
    collection(name) {
        return {
            get() {
                if (name === "bookings") {
                    return Promise.resolve(
                        createSnapshot(testBookings)
                    );
                }

                if (name === "payments") {
                    return Promise.resolve(
                        createSnapshot(testPayments)
                    );
                }

                return Promise.resolve(
                    createSnapshot({})
                );
            }
        };
    }
};

const firebase = {
    apps: [{}],
    firestore() {
        return mockDb;
    }
};

let domReadyHandler = null;

const context = {
    window: {
        firebase,
        CONFIG: {}
    },

    firebase,

    console,

    document: {
        getElementById(id) {
            if (!elements[id]) {
                throw new Error(`Missing mock DOM element: ${id}`);
            }

            return elements[id];
        },

        addEventListener(event, handler) {
            if (event === "DOMContentLoaded") {
                domReadyHandler = handler;
            }
        }
    }
};

const code = fs.readFileSync(
    "admin/accounts/accounts-payments.js",
    "utf8"
);

vm.createContext(context);
vm.runInContext(code, context);

if (!domReadyHandler) {
    throw new Error(
        "DOMContentLoaded handler was not registered."
    );
}

console.log("");
console.log("==================================================");
console.log(" ACCT-003B Automated Regression Test");
console.log("==================================================");
console.log("");

(async () => {
    await domReadyHandler();

    // Baseline
    assertEqual(
        "Baseline payment count",
        elements.resultCount.textContent,
        "9 payment(s)"
    );

    assertEqual(
        "Baseline completed count",
        elements.completedPayments.textContent,
        "5"
    );

    assertEqual(
        "Baseline pending count",
        elements.pendingPayments.textContent,
        "1"
    );

    assertEqual(
        "Baseline refund count",
        elements.refunds.textContent,
        "1"
    );

    assertEqual(
        "Baseline total received",
        elements.totalReceived.textContent,
        "AUD $670.00"
    );

    assertEqual(
        "Baseline total refunded",
        elements.totalRefunded.textContent,
        "AUD $50.00"
    );

    assertEqual(
        "Baseline net received",
        elements.netReceived.textContent,
        "AUD $620.00"
    );

    assertEqual(
        "Baseline outstanding",
        elements.outstandingAmount.textContent,
        "AUD $2130.00"
    );

    // Deposit filter
    elements.paymentType.value = "Deposit";
    elements.applyButton.listeners.click();

    assertEqual(
        "Deposit filter count",
        elements.resultCount.textContent,
        "4 payment(s)"
    );

    assertEqual(
        "Deposit received",
        elements.totalReceived.textContent,
        "AUD $210.00"
    );

    assertEqual(
        "Deposit outstanding",
        elements.outstandingAmount.textContent,
        "AUD $1380.00"
    );

    // Pending status
    elements.paymentType.value = "";
    elements.paymentStatus.value = "Pending";
    elements.applyButton.listeners.click();

    assertEqual(
        "Pending filter count",
        elements.resultCount.textContent,
        "1 payment(s)"
    );

    assertEqual(
        "Pending count",
        elements.pendingPayments.textContent,
        "1"
    );

    assertEqual(
        "Pending outstanding",
        elements.outstandingAmount.textContent,
        "AUD $280.00"
    );

    // Stripe method
    elements.paymentStatus.value = "";
    elements.paymentMethod.value = "Stripe";
    elements.applyButton.listeners.click();

    assertEqual(
        "Stripe filter count",
        elements.resultCount.textContent,
        "3 payment(s)"
    );

    assertEqual(
        "Stripe received",
        elements.totalReceived.textContent,
        "AUD $300.00"
    );

    assertEqual(
        "Stripe net",
        elements.netReceived.textContent,
        "AUD $300.00"
    );

    // Search RF-C1
    elements.paymentMethod.value = "";
    elements.searchText.value = "RF-C1";
    elements.applyButton.listeners.click();

    assertEqual(
        "Transaction reference search count",
        elements.resultCount.textContent,
        "1 payment(s)"
    );

    assertEqual(
        "Refund search net",
        elements.netReceived.textContent,
        "AUD $-50.00"
    );

    assertContains(
        "Refund transaction rendered",
        elements.paymentsBody.innerHTML,
        "ACCT003B-RF-C1"
    );

    // Combined filters
    elements.searchText.value = "";
    elements.paymentType.value = "Deposit";
    elements.paymentStatus.value = "Completed";
    elements.paymentMethod.value = "Stripe";
    elements.applyButton.listeners.click();

    assertEqual(
        "Combined filter count",
        elements.resultCount.textContent,
        "1 payment(s)"
    );

    assertEqual(
        "Combined filter received",
        elements.totalReceived.textContent,
        "AUD $90.00"
    );

    assertContains(
        "Combined filter transaction rendered",
        elements.paymentsBody.innerHTML,
        "ACCT003B-TX-A1"
    );

    // Date range
    elements.paymentType.value = "";
    elements.paymentStatus.value = "";
    elements.paymentMethod.value = "";
    elements.dateFrom.value = "2026-09-01";
    elements.dateTo.value = "2026-09-05";
    elements.applyButton.listeners.click();

    assertEqual(
        "Date range count",
        elements.resultCount.textContent,
        "4 payment(s)"
    );

    assertEqual(
        "Date range received",
        elements.totalReceived.textContent,
        "AUD $420.00"
    );

    // Clear
    elements.dateFrom.value = "2026-09-01";
    elements.dateTo.value = "2026-09-05";
    elements.paymentStatus.value = "Pending";
    elements.clearButton.listeners.click();

    await new Promise(resolve => setImmediate(resolve));

    assertEqual(
        "Clear restores all payments",
        elements.resultCount.textContent,
        "9 payment(s)"
    );

    console.log("");
    console.log("==================================================");
    console.log(" ACCT-003B TEST SUMMARY");
    console.log("==================================================");
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed === 0) {
        console.log("");
        console.log(
            "RESULT: ALL ACCT-003B TESTS PASSED"
        );
        process.exit(0);
    }

    console.log("");
    console.error(
        `RESULT: ${failed} ACCT-003B TEST(S) FAILED`
    );
    process.exit(1);
})().catch(error => {
    console.error(
        "ACCT-003B TEST ERROR:",
        error
    );
    process.exit(1);
});
