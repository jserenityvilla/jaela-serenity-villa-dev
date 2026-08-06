/*
====================================
Booking Validation
Ja-Ela Serenity Villa
====================================
*/

function clearErrors() {

    document.querySelectorAll(".error-message").forEach(error => error.remove());

    document.querySelectorAll(".input-error").forEach(input => {

        input.classList.remove("input-error");

    });

}

function showError(fieldId, message) {

    const field = document.getElementById(fieldId);

    field.classList.add("input-error");

    field.focus();

    const error = document.createElement("small");

    error.className = "error-message";

    error.innerText = message;

    field.parentNode.appendChild(error);

}

function validateBooking(booking) {

    clearErrors();

    if (!booking.guestName.trim()) {

        showError("guestName","Please enter your full name.");

        return false;

    }

    if (!booking.email.trim()) {

        showError("guestEmail","Please enter your email address.");

        return false;

    }

    const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!emailPattern.test(booking.email)){

        showError("guestEmail","Please enter a valid email.");

        return false;

    }

    if(!booking.phone.trim()){

        showError("guestPhone","Please enter your phone number.");

        return false;

    }

    if(booking.phone.length<8){

        showError("guestPhone","Phone number is too short.");

        return false;

    }

    if(!booking.checkin){

        showError("checkin","Select a check-in date.");

        return false;

    }

    if(!booking.checkout){

        showError("checkout","Select a check-out date.");

        return false;

    }

    if(booking.nights<=0){

        showError("checkout","Check-out must be after check-in.");

        return false;

    }

    const guests=

        Number(booking.adults)+

        Number(booking.children);

    if(guests>6){

        showError("adults","Maximum occupancy is 6 guests.");

        return false;

    }

    return true;

}