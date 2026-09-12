const firebaseAdmin = require("../functions/node_modules/firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

firebaseAdmin.initializeApp({
    projectId: "ja-ela-serenity-villa-test"
});

const db = firebaseAdmin.firestore();

async function createDevBooking() {

    const bookingRef =
        db.collection("bookings").doc("dev-booking-001");

    await bookingRef.set({

        bookingReference: "DEV-BOOKING-001",

        guestName: "DEV Test Guest",

        email: "dev.test@example.com",

        phone: "0000000000",

        country: "Australia",

        checkin: "2026-09-08",

        checkout: "2026-09-11",

        nights: 3,

        adults: 2,

        children: 0,

        totalGuests: 2,

        arrivalTime: "14:00",

        accommodation: 300,

        extraGuestFee: 0,

        cleaningFee: 0,

        total: 300,

        currency: "AUD",

        specialRequests: "DEV booking for Expense Module testing",

        status: "Confirmed",

        createdAt:
            firebaseAdmin.firestore.FieldValue.serverTimestamp(),

        updatedAt:
            firebaseAdmin.firestore.FieldValue.serverTimestamp()

    });

    console.log(
        "SUCCESS: DEV-BOOKING-001 created in the local emulator."
    );
}

createDevBooking()
    .catch(error => {
        console.error("DEV booking creation failed:");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await firebaseAdmin.app().delete();
    });
