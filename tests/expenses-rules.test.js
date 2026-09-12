const fs = require("fs");

const {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds
} = require("@firebase/rules-unit-testing");

async function runTests() {

    const testEnv =
        await initializeTestEnvironment({
            projectId: "ja-ela-serenity-villa-test",
            firestore: {
                host: "127.0.0.1",
                port: 8080,
                rules: fs.readFileSync(
                    "firestore.rules",
                    "utf8"
                )
            }
        });

    try {

        const unauthenticated =
            testEnv.unauthenticatedContext();

        const regularUser =
            testEnv.authenticatedContext(
                "regular-expense-test-user",
                {
                    role: "viewer"
                }
            );

        const adminUser =
            testEnv.authenticatedContext(
                "admin-expense-test-user",
                {
                    role: "admin"
                }
            );

        await assertFails(
            unauthenticated
                .firestore()
                .collection("expenses")
                .limit(1)
                .get()
        );

        console.log(
            "PASS: Unauthenticated expense read is denied."
        );

        await assertFails(
            regularUser
                .firestore()
                .collection("expenses")
                .limit(1)
                .get()
        );

        console.log(
            "PASS: Non-admin expense read is denied."
        );

        await assertSucceeds(
            adminUser
                .firestore()
                .collection("expenses")
                .limit(1)
                .get()
        );

        console.log(
            "PASS: Admin expense read is allowed."
        );

        const testExpenseRef =
            adminUser
                .firestore()
                .collection("expenses")
                .doc("dev-expense-rules-test");

        await assertSucceeds(
            testExpenseRef.set({
                expenseDate: "2026-09-01",
                categoryId: "dev-test-category",
                amount: 100,
                currency: "AUD",
                description: "DEV Expense Rules Test",
                supplier: "DEV Test Supplier",
                reference: "DEV-EXP-RULE-001",
                expenseType: "Variable Property",
                bookingId: null,
                allocationMethod: "None",
                status: "Active"
            })
        );

        console.log(
            "PASS: Admin expense create is allowed."
        );

        await assertSucceeds(
            testExpenseRef.update({
                amount: 125,
                description: "DEV Expense Rules Test Updated"
            })
        );

        console.log(
            "PASS: Admin expense update is allowed."
        );

        await assertFails(
            testExpenseRef.delete()
        );

        console.log(
            "PASS: Admin expense delete is denied."
        );

        await testEnv.withSecurityRulesDisabled(
            async context => {

                await context
                    .firestore()
                    .collection("expenses")
                    .doc("dev-expense-rules-test")
                    .delete();

            }
        );

        console.log(
            "PASS: Expense security test data cleared."
        );

    } finally {

        await testEnv.cleanup();

    }
}

runTests()
    .catch(error => {

        console.error(
            "Firestore expense rules test failed:"
        );

        console.error(error);

        process.exitCode = 1;

    });

