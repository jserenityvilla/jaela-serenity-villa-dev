// ============================================================
// CLEAR DEV BOOKINGS
// ============================================================
// SAFETY:
// - ONLY connects to the local Firestore Emulator.
// - Does NOT connect to Firebase production.
// - Deletes ONLY documents from the "bookings" collection.
// ============================================================

const HOST = "127.0.0.1";
const PORT = 8080;
const PROJECT_ID = "ja-ela-serenity-villa-test";
const COLLECTION = "bookings";

const BASE_URL =
    `http://${HOST}:${PORT}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function clearBookings() {

    console.log("");
    console.log("==============================================");
    console.log(" DEV FIRESTORE - CLEAR BOOKINGS");
    console.log("==============================================");
    console.log(`Emulator : ${HOST}:${PORT}`);
    console.log(`Project  : ${PROJECT_ID}`);
    console.log(`Collection: ${COLLECTION}`);
    console.log("==============================================");
    console.log("");

    // Safety check
    if (HOST !== "127.0.0.1" && HOST !== "localhost") {
        throw new Error(
            "SAFETY STOP: This script is not configured for localhost."
        );
    }

    const collectionUrl = `${BASE_URL}/${COLLECTION}`;

    console.log("Checking Firestore Emulator...");

    let response;

    try {
        response = await fetch(collectionUrl);
    } catch (error) {
        console.error("");
        console.error("ERROR: Could not connect to Firestore Emulator.");
        console.error("");
        console.error("Make sure the Firebase emulator is running.");
        console.error("");
        console.error(error.message);
        process.exit(1);
    }

    if (!response.ok) {
        const text = await response.text();

        console.error("");
        console.error("ERROR: Firestore Emulator returned an error.");
        console.error(`HTTP Status: ${response.status}`);
        console.error(text);
        process.exit(1);
    }

    const data = await response.json();
    const documents = data.documents || [];

    console.log(`Found ${documents.length} booking(s).`);
    console.log("");

    if (documents.length === 0) {
        console.log("Nothing to delete.");
        console.log("");
        console.log("DEV bookings collection is already empty.");
        return;
    }

    console.log("Bookings that will be deleted:");
    console.log("----------------------------------------------");

    for (const document of documents) {
        const documentName = document.name;
        const documentId = documentName.split("/").pop();

        console.log(`- ${documentId}`);
    }

    console.log("----------------------------------------------");
    console.log("");

    console.log("Deleting ONLY these DEV booking documents...");
    console.log("");

    let deleted = 0;

    for (const document of documents) {

        const documentName = document.name;
        const documentId = documentName.split("/").pop();

        const deleteUrl =
            `${collectionUrl}/${encodeURIComponent(documentId)}`;

        const deleteResponse = await fetch(deleteUrl, {
            method: "DELETE"
        });

        if (!deleteResponse.ok) {
            const text = await deleteResponse.text();

            console.error(
                `FAILED to delete ${documentId}: ${deleteResponse.status}`
            );

            console.error(text);
            continue;
        }

        console.log(`DELETED: ${documentId}`);
        deleted++;
    }

    console.log("");
    console.log("==============================================");
    console.log(" CLEANUP COMPLETE");
    console.log("==============================================");
    console.log(`Deleted: ${deleted}`);
    console.log(`Remaining: ${documents.length - deleted}`);
    console.log("==============================================");
    console.log("");
}

clearBookings().catch(error => {
    console.error("");
    console.error("UNEXPECTED ERROR:");
    console.error(error);
    process.exit(1);
});