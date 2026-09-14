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
                "regular-utility-test-user",
                {
                    role: "viewer"
                }
            );

        const adminUser =
            testEnv.authenticatedContext(
                "admin-utility-test-user",
                {
                    role: "admin"
                }
            );

        await assertFails(
            unauthenticated
                .firestore()
                .collection("utilityBills")
                .limit(1)
                .get()
        );

        console.log(
            "PASS: Unauthenticated utility bill read is denied."
        );

        await assertFails(
            regularUser
                .firestore()
                .collection("utilityBills")
                .limit(1)
                .get()
        );

        console.log(
            "PASS: Non-admin utility bill read is denied."
        );

        await assertSucceeds(
            adminUser
                .firestore()
                .collection("utilityBills")
                .limit(1)
                .get()
        );

        console.log(
            "PASS: Admin utility bill read is allowed."
        );

        const testUtilityBillRef =
            adminUser
                .firestore()
                .collection("utilityBills")
                .doc("dev-utility-bill-rules-test");

        await assertSucceeds(
            testUtilityBillRef.set({
                categoryId: "dev-test-utility-category",
                billDate: "2026-09-01",
                billingPeriodFrom: "2026-08-01",
                billingPeriodTo: "2026-08-31",
                dueDate: "2026-09-15",
                amount: 150,
                currency: "AUD",
                supplier: "DEV Utility Supplier",
                reference: "DEV-UTIL-RULE-001",
                usage: 100,
                usageUnit: "kWh",
                expenseClassification: "Variable Property",
                allocationMethod: "None",
                description: "DEV Utility Bill Rules Test",
                status: "Active"
            })
        );

        console.log(
            "PASS: Admin utility bill create is allowed."
        );

        await assertSucceeds(
            testUtilityBillRef.update({
                amount: 175,
                description: "DEV Utility Bill Rules Test Updated"
            })
        );

        console.log(
            "PASS: Admin utility bill update is allowed."
        );

        await assertFails(
            testUtilityBillRef.delete()
        );

        console.log(
            "PASS: Admin utility bill delete is denied."
        );

        await testEnv.withSecurityRulesDisabled(
            async context => {

                await context
                    .firestore()
                    .collection("utilityBills")
                    .doc("dev-utility-bill-rules-test")
                    .delete();

            }
        );

        console.log(
            "PASS: Utility bill security test data cleared."
        );

    } finally {

        await testEnv.cleanup();

    }
}

runTests()
    .catch(error => {

        console.error(
            "Firestore utility bill rules test failed:"
        );

        console.error(error);

        process.exitCode = 1;

    });
