// =======================================================
// Availability Functions
// Ja-Ela Serenity Villa
// DEV-011
// =======================================================


// =======================================================
// Get Active Bookings
// =======================================================

async function getActiveBookings() {

    try {

        const snapshot =
            await db
                .collection(CONFIG.firestore.bookingsCollection)
                .where("status", "in", [
                    CONFIG.bookingStatus.pending,
                    CONFIG.bookingStatus.confirmed
                ])
                .get();


        const bookings = [];


        snapshot.forEach(doc => {

            const booking = doc.data();


            if (
                booking.checkin &&
                booking.checkout
            ) {

                bookings.push({

                    id: doc.id,

                    checkin:
                        booking.checkin,

                    checkout:
                        booking.checkout,

                    status:
                        booking.status

                });

            }

        });


        console.log(
            "Active bookings:",
            bookings
        );


        return bookings;

    }

    catch (error) {

        console.error(
            "Unable to retrieve active bookings:",
            error
        );


        return [];

    }

}
// ======================================================
// DEV-012
// Final Availability Check Before Saving Booking
// ======================================================

async function checkBookingAvailability(
    checkin,
    checkout
) {

    try {

        // ==========================================
        // Get all active bookings
        // Pending + Confirmed
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
        // Check for date overlap
        // ==========================================

        const conflict =
            activeBookings.some(booking => {

                if (
                    !booking.checkin ||
                    !booking.checkout
                ) {

                    return false;

                }


                /*
                Overlap rule:

                Existing check-in
                    < New checkout

                AND

                Existing checkout
                    > New check-in
                */

                return (
                    booking.checkin < checkout &&
                    booking.checkout > checkin
                );

            });


        // ==========================================
        // Booking conflict found
        // ==========================================

        if (conflict) {

            console.warn(
                "DEV-012 - Booking date conflict detected."
            );


            return false;

        }


        // ==========================================
        // No conflict
        // ==========================================

        console.log(
            "DEV-012 - Booking dates are available."
        );


        return true;

    }

    catch (error) {

        console.error(
            "DEV-012 - Availability check failed:",
            error
        );


        // Fail safely.
        // If we cannot verify availability,
        // do NOT create the booking.

        return false;

    }

}