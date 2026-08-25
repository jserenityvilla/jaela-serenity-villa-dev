// ============================================
// Smart Calendar
// Ja-Ela Serenity Villa
// DEV-011 - Booking Availability
// ============================================

let checkInPicker;
let checkOutPicker;


// ============================================
// Convert YYYY-MM-DD to Date
// ============================================

function parseBookingDate(dateString) {

    if (!dateString) {
        return null;
    }

    const parts = dateString.split("-");

    if (parts.length !== 3) {
        return null;
    }

    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

}


// ============================================
// Check whether a date falls inside
// an active booking's occupied nights
//
// Check-in date is occupied.
// Checkout date is NOT occupied.
//
// Example:
// Check-in 04 Aug
// Check-out 07 Aug
//
// Occupied:
// 04 Aug
// 05 Aug
// 06 Aug
//
// 07 Aug is available for a new
// guest to check in.
// ============================================

function isDateOccupied(date, booking) {

    const checkin =
        parseBookingDate(booking.checkin);

    const checkout =
        parseBookingDate(booking.checkout);

    if (!checkin || !checkout) {
        return false;
    }

    return (
        date >= checkin &&
        date < checkout
    );

}


// ============================================
// Check whether a date is unavailable
// for CHECK-IN
// ============================================

function isCheckInUnavailable(date, bookings) {

    return bookings.some(
        booking =>
            isDateOccupied(date, booking)
    );

}


// ============================================
// Check whether a date is unavailable
// for CHECK-OUT
//
// A checkout date can be the same day
// another booking starts.
//
// Example:
//
// Existing booking:
// 04 Aug -> 07 Aug
//
// New guest can:
// Check-in 07 Aug
//
// Existing booking:
// 08 Aug -> 10 Aug
//
// New guest can:
// Check-out 08 Aug
//
// This allows back-to-back bookings.
// ============================================

function isCheckOutUnavailable(
    date,
    bookings,
    selectedCheckIn
) {

    if (!selectedCheckIn) {
        return false;
    }

    return bookings.some(booking => {

        const bookingCheckIn =
            parseBookingDate(
                booking.checkin
            );

        const bookingCheckOut =
            parseBookingDate(
                booking.checkout
            );

        if (
            !bookingCheckIn ||
            !bookingCheckOut
        ) {
            return false;
        }

        // The checkout date itself is not
        // an occupied night.
        //
        // Therefore a guest can check out
        // on the same day another booking
        // starts.

        if (date.getTime() ===
            bookingCheckIn.getTime()) {

            return false;

        }

        return (
            date >= bookingCheckIn &&
            date < bookingCheckOut
        );

    });

}


// ============================================
// Apply availability to calendars
// ============================================

async function applyAvailability() {

    try {

        const bookings =
            await getActiveBookings();


        console.log(
            "Applying availability to calendar.",
            bookings
        );


        // ====================================
        // Check-in Calendar
        // ====================================

        if (checkInPicker) {

            checkInPicker.set(
                "disable",
                [
                    function(date) {

                        return isCheckInUnavailable(
                            date,
                            bookings
                        );

                    }
                ]
            );

        }


        // ====================================
        // Check-out Calendar
        // ====================================

        if (checkOutPicker) {

            checkOutPicker.set(
                "disable",
                [
                    function(date) {

                        const checkInValue =
                            document
                                .getElementById("checkin")
                                .value;


                        if (!checkInValue) {
                            return false;
                        }


                        const selectedCheckIn =
                            parseBookingDate(
                                checkInValue
                            );


                        if (!selectedCheckIn) {
                            return false;
                        }


                        return isCheckOutUnavailable(
                            date,
                            bookings,
                            selectedCheckIn
                        );

                    }
                ]
            );

        }


        console.log(
            "Calendar availability applied."
        );

    }

    catch (error) {

        console.error(
            "Unable to apply availability:",
            error
        );

    }

}


// ============================================
// Smart Calendar Initialisation
// ============================================

function initialiseCalendar() {

    // ============================================
    // Check-in Calendar
    // ============================================

    checkInPicker = flatpickr(
        "#checkin",
        {

            dateFormat: "Y-m-d",

            altInput: true,

            altFormat: "d M Y",

            minDate: "today",

            onChange:
                function(selectedDates) {

                    if (
                        selectedDates.length === 0
                    ) {

                        checkOutPicker.clear();

                        calculateStay();

                        return;

                    }


                    // ====================================
                    // Every check-in change starts
                    // a new date selection
                    // ====================================

                    checkOutPicker.clear();


                    const nextDay =
                        new Date(
                            selectedDates[0]
                        );


                    nextDay.setDate(
                        nextDay.getDate() + 1
                    );


                    checkOutPicker.set(
                        "minDate",
                        nextDay
                    );


                    // ====================================
                    // Reset previous price
                    // ====================================

                    calculateStay();

                }

        }
    );


    // ============================================
    // Check-out Calendar
    // ============================================

    checkOutPicker = flatpickr(
        "#checkout",
        {

            dateFormat: "Y-m-d",

            altInput: true,

            altFormat: "d M Y",

            minDate: "today",

            onChange:
                function() {

                    calculateStay();

                }

        }
    );


    // ============================================
    // Apply Firestore availability
    // ============================================

    applyAvailability();

}