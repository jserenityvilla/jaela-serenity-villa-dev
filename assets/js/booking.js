// ======================================================
// Ja-Ela Serenity Villa
// booking.js
// Main Controller for the Booking Page
// DEV-012 - Final Availability Check
// ======================================================


// ======================================================
// Page Initialisation
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
// Detect Guest Country
// ======================================================

async function detectCountry() {

    try {

        const response =
            await fetch("https://ipapi.co/json/");


        if (!response.ok) {

            throw new Error(
                "Unable to retrieve location."
            );

        }


        const data =
            await response.json();


        const countryField =
            document.getElementById(
                "guestCountry"
            );


        if (countryField) {

            countryField.value =
                data.country_name;

        }

    }

    catch (error) {

        console.error(
            "Country detection failed:",
            error
        );


        const countryField =
            document.getElementById(
                "guestCountry"
            );


        if (countryField) {

            countryField.placeholder =
                "Please enter your country";


            countryField.removeAttribute(
                "readonly"
            );

        }

    }

}


// ======================================================
// Booking Form
// ======================================================

function attachBookingForm() {

    const form =
        document.getElementById(
            "bookingForm"
        );


    if (!form) {

        console.error(
            "Booking form not found."
        );

        return;

    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // ==========================================
            // Collect Booking Information
            // ==========================================

            const booking = {

                guestName:
                    document.getElementById(
                        "guestName"
                    ).value.trim(),


                email:
                    document.getElementById(
                        "guestEmail"
                    ).value.trim(),


                phone:
                    document.getElementById(
                        "guestPhone"
                    ).value.trim(),


                country:
                    document.getElementById(
                        "guestCountry"
                    ).value.trim(),


                checkin:
                    document.getElementById(
                        "checkin"
                    ).value,


                checkout:
                    document.getElementById(
                        "checkout"
                    ).value,


                adults:
                    Number(
                        document.getElementById(
                            "adults"
                        ).value
                    ),


                children:
                    Number(
                        document.getElementById(
                            "children"
                        ).value
                    ),


                arrivalTime:
                    document.getElementById(
                        "arrivalTime"
                    ).value,


                specialRequests:
                    document.getElementById(
                        "specialRequests"
                    ).value.trim(),


                nights:
                    calculateNights()

            };


            // ==========================================
            // Validate Booking
            // ==========================================

            if (!validateBooking(booking)) {

                return;

            }


            // ==========================================
            // Validation Successful
            // ==========================================

            console.log(
                "Booking validation passed:",
                booking
            );


            // ==================================================
            // DEV-012
            // FINAL AVAILABILITY CHECK
            // ==================================================

            const available =
                await checkBookingAvailability(
                    booking.checkin,
                    booking.checkout
                );


            // ==================================================
            // Stop Booking If Dates Are No Longer Available
            // ==================================================

            if (!available) {

                alert(
                    "Sorry, these dates are no longer available. " +
                    "Another booking may have been made for this period. " +
                    "Please select different dates."
                );


                return;

            }


            // ==========================================
            // Save Booking to Firebase
            // ==========================================

            const saved =
                await saveBooking(booking);


            // ==========================================
            // Check Save Result
            // ==========================================

            if (!saved) {

                console.error(
                    "Booking could not be saved."
                );


                return;

            }

        }
    );

}


// ======================================================
// DEV-012
// Final Availability Check Before Saving
// ======================================================

async function checkBookingAvailability(
    checkin,
    checkout
) {

    try {

        // ==========================================
        // Validate Dates
        // ==========================================

        if (!checkin || !checkout) {

            console.warn(
                "DEV-012 - Check-in or check-out date missing."
            );


            return false;

        }


        // ==========================================
        // Get Active Bookings
        // Pending + Confirmed only
        // ==========================================

        const activeBookings =
            await getActiveBookings();


        console.log(
            "DEV-012 - Checking final availability:",
            {
                checkin: checkin,
                checkout: checkout,
                activeBookings: activeBookings
            }
        );


        // ==========================================
        // Check Date Overlap
        // ==========================================

        const conflict =
            activeBookings.some(
                booking => {

                    if (
                        !booking.checkin ||
                        !booking.checkout
                    ) {

                        return false;

                    }


                    /*
                    ==================================
                    OVERLAP RULE

                    Existing booking:
                    26 Aug -> 29 Aug

                    New booking:
                    26 Aug -> 28 Aug
                    = CONFLICT

                    New booking:
                    28 Aug -> 30 Aug
                    = CONFLICT

                    New booking:
                    29 Aug -> 31 Aug
                    = ALLOWED

                    Checkout date can be used
                    as another guest's check-in.
                    ==================================
                    */


                    return (
                        booking.checkin < checkout &&
                        booking.checkout > checkin
                    );

                }
            );


        // ==========================================
        // Conflict Found
        // ==========================================

        if (conflict) {

            console.warn(
                "DEV-012 - Booking date conflict detected."
            );


            return false;

        }


        // ==========================================
        // No Conflict
        // ==========================================

        console.log(
            "DEV-012 - Booking dates are available."
        );


        return true;

    }

    catch (error) {

        console.error(
            "DEV-012 - Final availability check failed:",
            error
        );


        /*
        ==============================================
        FAIL SAFE

        If Firestore cannot be checked,
        DO NOT create the booking.

        This prevents a booking from being
        accepted when availability cannot
        be verified.
        ==============================================
        */

        return false;

    }

}


// ======================================================
// Calculate Number of Nights
// ======================================================

function calculateNights() {

    const checkin =
        document.getElementById(
            "checkin"
        ).value;


    const checkout =
        document.getElementById(
            "checkout"
        ).value;


    if (!checkin || !checkout) {

        return 0;

    }


    const start =
        new Date(checkin);


    const end =
        new Date(checkout);


    return Math.ceil(
        (end - start) /
        (1000 * 60 * 60 * 24)
    );

}


// ======================================================
// Guest Occupancy Validation
// ======================================================

function validateGuestCount() {

    const adultsField =
        document.getElementById(
            "adults"
        );


    const childrenField =
        document.getElementById(
            "children"
        );


    if (!adultsField || !childrenField) {

        return true;

    }


    const adults =
        Number(
            adultsField.value
        ) || 0;


    const children =
        Number(
            childrenField.value
        ) || 0;


    const totalGuests =
        adults + children;


    const maxGuests =
        CONFIG.villa.maxGuests;


    // ==========================================
    // Remove Existing Occupancy Errors
    // ==========================================

    adultsField.classList.remove(
        "input-error"
    );


    childrenField.classList.remove(
        "input-error"
    );


    const existingErrors =
        document.querySelectorAll(
            ".occupancy-error"
        );


    existingErrors.forEach(
        error => {

            error.remove();

        }
    );


    // ==========================================
    // Check Maximum Occupancy
    // ==========================================

    if (totalGuests > maxGuests) {

        adultsField.classList.add(
            "input-error"
        );


        childrenField.classList.add(
            "input-error"
        );


        const error =
            document.createElement(
                "small"
            );


        error.className =
            "error-message occupancy-error";


        error.innerText =
            `Maximum occupancy is ${maxGuests} guests. ` +
            `You currently have ${totalGuests} guests selected.`;


        childrenField
            .parentNode
            .appendChild(error);


        return false;

    }


    return true;

}


// ======================================================
// Field Validation Listeners
// ======================================================

function attachValidationListeners() {

    const fields =
        document.querySelectorAll(
            "input, select, textarea"
        );


    fields.forEach(
        field => {

            const handleFieldChange = () => {


                // ------------------------------------------
                // Remove Normal Field Error
                // ------------------------------------------

                field.classList.remove(
                    "input-error"
                );


                const error =
                    field.parentNode.querySelector(
                        ".error-message:not(.occupancy-error)"
                    );


                if (error) {

                    error.remove();

                }


                // ------------------------------------------
                // Guest Count
                // ------------------------------------------

                if (
                    field.id === "adults" ||
                    field.id === "children"
                ) {

                    validateGuestCount();

                    calculateStay();

                }

            };


            field.addEventListener(
                "input",
                handleFieldChange
            );


            field.addEventListener(
                "change",
                handleFieldChange
            );

        }
    );

}