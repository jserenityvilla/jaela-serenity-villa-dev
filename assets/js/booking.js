document.addEventListener("DOMContentLoaded", function () {

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

    console.log("Flatpickr loaded successfully");

});
function initialiseBookingPage() {

    console.log("✅ Booking page loaded.");

    detectCountry();

}
async function detectCountry() {

    try {

        const response = await fetch("https://ipapi.co/json/");

        const data = await response.json();

        document.getElementById("guestCountry").value =
            data.country_name;

    }
    catch (error) {

        console.error("Unable to detect country.", error);

        document.getElementById("guestCountry").placeholder =
            "Please enter your country";

        document.getElementById("guestCountry").removeAttribute("readonly");

    }

}