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
                "regular-test-user",
                {
                    role: "viewer"
                }
            );

        const adminUser =
            testEnv.authenticatedContext(
                "admin-test-user",
                {
                    role: "admin"
                }
            );

        await assertFails(
            unauthenticated
                .firestore()
                .collection("categories")
                .limit(1)
                .get()
        );

        console.log(
            "PASS: Unauthenticated category read is denied."
        );

        await assertFails(
            regularUser
                .firestore()
                .collection("categories")
                .limit(1)
                .get()
        );

        console.log(
            "PASS: Non-admin category read is denied."
        );

        await assertSucceeds(
            adminUser
                .firestore()
                .collection("categories")
                .limit(1)
                .get()
        );

        console.log(
            "PASS: Admin category read is allowed."
        );

        const testCategoryRef =
            adminUser
                .firestore()
                .collection("categories")
                .doc("dev-delete-protection-test");

        await assertSucceeds(
            testCategoryRef.set({
                name: "DEV Delete Protection Test",
                categoryType: "Expense",
                active: true,
                sortOrder: 9999
            })
        );

        console.log(
            "PASS: Admin category create is allowed."
        );

        await assertFails(
            testCategoryRef.delete()
        );

        console.log(
            "PASS: Admin category delete is denied."
        );

        await testEnv.clearFirestore();

        console.log(
            "PASS: Firestore test data cleared."
        );

    } finally {

        await testEnv.cleanup();

    }
}

runTests()
    .catch(error => {

        console.error(
            "Firestore rules test failed:"
        );

        console.error(error);

        process.exitCode = 1;

    });



