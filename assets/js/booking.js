// ======================================================
// Ja-Ela Serenity Villa
// booking.js
// Main Controller for the Booking Page
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Booking page loaded.");

    initialiseBookingPage();

});

// ======================================================
// Initialise Booking Page
// ======================================================

function initialiseBookingPage() {

    initialiseCalendar();

    detectCountry();

    attachBookingForm();

    attachValidationListeners();

}

// ======================================================
// Initialise Flatpickr Calendar
// ======================================================

function initialiseCalendar() {

    flatpickr("#checkin", {
        minDate: "today",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d M Y"
    });

    flatpickr("#checkout", {
        minDate: "today",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d M Y"
    });

    console.log("Calendar initialised.");

}

// ======================================================
// Detect Guest Country
// ======================================================

async function detectCountry() {

    try {

        const response = await fetch("https://ipapi.co/json/");

        if (!response.ok) {
            throw new Error("Unable to retrieve location.");
        }

        const data = await response.json();

        const countryField = document.getElementById("guestCountry");

        if (countryField) {
            countryField.value = data.country_name;
        }

    } catch (error) {

        console.error("Country detection failed:", error);

        const countryField = document.getElementById("guestCountry");

        if (countryField) {
            countryField.placeholder = "Please enter your country";
            countryField.removeAttribute("readonly");
        }

    }

}
attachBookingForm();
function attachBookingForm() {

    const form = document.getElementById("bookingForm");

    form.addEventListener("submit", function (event) {

        event.preventDefault();

        const booking = {

            guestName: document.getElementById("guestName").value,

            email: document.getElementById("guestEmail").value,

            phone: document.getElementById("guestPhone").value,

            checkin: document.getElementById("checkin").value,

            checkout: document.getElementById("checkout").value,

            adults: document.getElementById("adults").value,

            children: document.getElementById("children").value,

            nights: calculateNights()

        };

        if (!validateBooking(booking)) {
            return;
        }

        alert("Validation Passed ✅");

    });

}
function calculateNights() {

    const checkin = document.getElementById("checkin").value;

    const checkout = document.getElementById("checkout").value;

    if (!checkin || !checkout) {
        return 0;
    }

    const start = new Date(checkin);

    const end = new Date(checkout);

    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));

}
function attachValidationListeners(){

    const fields=document.querySelectorAll("input,select,textarea");

    fields.forEach(field=>{

        field.addEventListener("input",()=>{

            field.classList.remove("input-error");

            const error=field.parentNode.querySelector(".error-message");

            if(error){

                error.remove();

            }

        });

    });

}
