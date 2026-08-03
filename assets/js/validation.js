/*
====================================
Booking Validation
Ja-Ela Serenity Villa
====================================
*/

function validateBooking(booking) {

    if (!booking.guestName) {

        alert("Please enter your full name.");

        return false;

    }

    if (!booking.email) {

        alert("Please enter your email address.");

        return false;

    }

    if (!booking.phone) {

        alert("Please enter your phone number.");

        return false;

    }

    if (!booking.checkin) {

        alert("Please select your check-in date.");

        return false;

    }

    if (!booking.checkout) {

        alert("Please select your check-out date.");

        return false;

    }

    if (booking.nights <= 0) {

        alert("Check-out must be after check-in.");

        return false;

    }

    return true;

}