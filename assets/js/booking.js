/*
====================================
Booking Engine
Ja-Ela Serenity Villa
====================================
*/

document.addEventListener("DOMContentLoaded", () => {

    /*
    ====================================
    Flatpickr Date Pickers
    ====================================
    */

    flatpickr("#checkin", {
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        minDate: "today",
        onChange: updateSummary
    });

    flatpickr("#checkout", {
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        minDate: "today",
        onChange: updateSummary
    });

    /*
    ====================================
    Update Summary when Guests Change
    ====================================
    */

    document.getElementById("adults")
        .addEventListener("change", updateSummary);

    document.getElementById("children")
        .addEventListener("change", updateSummary);

    /*
    ====================================
    Booking Form Submission
    ====================================
    */

    const bookingForm = document.getElementById("bookingForm");

    bookingForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const booking = {

            guestName: document.getElementById("guestName").value.trim(),

            email: document.getElementById("guestEmail").value.trim(),

            phone: document.getElementById("guestPhone").value.trim(),

            country: document.getElementById("guestCountry").value.trim(),

            checkin: document.getElementById("checkin").value,

            checkout: document.getElementById("checkout").value,

            adults: Number(document.getElementById("adults").value),

            children: Number(document.getElementById("children").value),

            arrivalTime: document.getElementById("arrivalTime").value,

            specialRequests: document.getElementById("specialRequests").value.trim(),

            nights: calculateNights(
                document.getElementById("checkin").value,
                document.getElementById("checkout").value
            ),

            total: calculatePrice(),

            status: "Pending",

            createdAt: new Date()

        };

        if (!validateBooking(booking)) {

        return;

        }

        console.log("Booking Submitted");

        console.log(booking);

        const saved = await saveBooking(booking);

        if (saved) {

            bookingForm.reset();

            updateSummary();

        }

    });

    /*
    ====================================
    Initialise Summary
    ====================================
    */

    updateSummary();

});