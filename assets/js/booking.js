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