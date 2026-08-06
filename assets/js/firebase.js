/*
====================================
Firebase Functions
Ja-Ela Serenity Villa
====================================
*/

async function saveBooking(booking) {

    try {

        /*
        ====================================
        Generate Booking Reference
        ====================================
        */

        const now = new Date();

        const year = now.getFullYear();

        const month = String(now.getMonth() + 1).padStart(2, "0");

        const day = String(now.getDate()).padStart(2, "0");

        const randomNumber = Math.floor(1000 + Math.random() * 9000);

        booking.bookingReference =
            `JSV-${year}${month}${day}-${randomNumber}`;

        /*
        ====================================
        Save Booking
        ====================================
        */

        const docRef = await db.collection(CONFIG.firestore.bookingsCollection).add(booking);

        console.log("Booking saved.");

        console.log(docRef.id);

        sessionStorage.setItem(
            "bookingReference",
            booking.bookingReference
        );

        window.location.href =
            "confirmation.html";

        return true;

        return true;

    }

    catch (error) {

        console.error(error);

        alert("Unable to save booking.");

        return false;

    }

}