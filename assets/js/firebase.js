/*
====================================
Firebase Booking Functions
Ja-Ela Serenity Villa
====================================
*/

async function saveBooking(booking) {

    try {

        await db.collection("bookings").add(booking);

        return true;

    }

    catch (error) {

        console.error("Error saving booking:", error);

        alert("Unable to save booking. Please try again.");

        return false;

    }

}