/*
====================================
Firebase Functions
Ja-Ela Serenity Villa
====================================
*/


// ======================================================
// Save Booking
// ======================================================

async function saveBooking(booking) {

    try {

        // ==========================================
        // FINAL AVAILABILITY CHECK
        // ==========================================

        console.log(
            "Final availability check before saving booking..."
        );


        const activeBookings =
            await getActiveBookings();


        const conflict =
            activeBookings.some(
                existingBooking => {

                    if (
                        !existingBooking.checkin ||
                        !existingBooking.checkout
                    ) {

                        return false;

                    }


                    return (
                        existingBooking.checkin <
                            booking.checkout &&
                        existingBooking.checkout >
                            booking.checkin
                    );

                }
            );


        // ==========================================
        // Stop if dates are no longer available
        // ==========================================

        if (conflict) {

            console.warn(
                "DEV-012 - Booking dates are no longer available."
            );


            alert(
                "Sorry, these dates are no longer available. " +
                "Another guest may have just booked this period. " +
                "Please select different dates."
            );


            return false;

        }


        console.log(
            "DEV-012 - Final availability check passed."
        );


        // ==========================================
        // Generate Booking Reference
        // ==========================================

        const now = new Date();

        const year =
            now.getFullYear();

        const month =
            String(now.getMonth() + 1)
                .padStart(2, "0");

        const day =
            String(now.getDate())
                .padStart(2, "0");

        const randomNumber =
            Math.floor(
                1000 + Math.random() * 9000
            );


        const bookingReference =
            `JSV-${year}${month}${day}-${randomNumber}`;


        // ==========================================
        // Calculate Total
        // ==========================================

        const nights =
            Number(booking.nights) || 0;


        const adults =
            Number(booking.adults) || 0;


        const children =
            Number(booking.children) || 0;


        const totalGuests =
            adults + children;


        const nightlyRate =
            Number(
                CONFIG.pricing.nightlyRate
            ) || 0;


        const cleaningFee =
            Number(
                CONFIG.pricing.cleaningFee
            ) || 0;


        const extraGuestRate =
            Number(
                CONFIG.pricing.extraGuestRate
            ) || 0;


        const baseOccupancy = 7;


        const extraGuests =
            Math.max(
                0,
                totalGuests - baseOccupancy
            );


        const accommodationTotal =
            nights *
            nightlyRate;


        const extraGuestTotal =
            extraGuests *
            extraGuestRate *
            nights;


        const total =
            accommodationTotal +
            extraGuestTotal +
            cleaningFee;


        // ==========================================
        // Complete Booking Record
        // ==========================================

        const bookingData = {

            // Booking reference
            bookingReference:
                bookingReference,


            // Guest information
            guestName:
                booking.guestName || "",

            email:
                booking.email || "",

            phone:
                booking.phone || "",

            country:
                booking.country || "",


            // Stay information
            checkin:
                booking.checkin || "",

            checkout:
                booking.checkout || "",

            adults:
                adults,

            children:
                children,

            totalGuests:
                totalGuests,

            nights:
                nights,


            // Arrival / requests
            arrivalTime:
                booking.arrivalTime || "",

            specialRequests:
                booking.specialRequests || "",


            // Pricing
            accommodation:
                accommodationTotal,

            extraGuestFee:
                extraGuestTotal,

            cleaningFee:
                cleaningFee,

            total:
                total,

            currency:
                CONFIG.pricing.currency,

            // Payment
            depositPercentage:
                Number(CONFIG.payment.depositPercentage) || 0,

            depositAmount:
                total *
                (
                    Number(CONFIG.payment.depositPercentage) || 0
                ) /
                100,

            balanceAmount:
                total -
                (
                    total *
                    (
                        Number(CONFIG.payment.depositPercentage) || 0
                    ) /
                    100
                ),

            balanceDueHoursBeforeCheckin:
                Number(
                    CONFIG.payment.balanceDueHoursBeforeCheckin
                ) || 24,

            balanceGracePeriodHours:
                Number(
                    CONFIG.payment.balanceGracePeriodHours
                ) || 48,

            paymentStatus:
                "Deposit Required",



            // Booking management
            status:
                CONFIG.bookingStatus.pending,


            // Creation timestamp
            createdAt:
                firebase.firestore.FieldValue
                    .serverTimestamp()

        };


        // ==========================================
        // Save Booking to Firestore
        // ==========================================

        const docRef =
            await db
                .collection(
                    CONFIG.firestore.bookingsCollection
                )
                .add(bookingData);


        console.log(
            "Booking saved successfully."
        );


        console.log(
            "Document ID:",
            docRef.id
        );


        console.log(
            "Booking Reference:",
            bookingReference
        );


        // ==========================================
        // Store Reference for Confirmation Page
        // ==========================================

        sessionStorage.setItem(
            "bookingReference",
            bookingReference
        );


        // ==========================================
        // Go to Confirmation Page
        // ==========================================

        window.location.href =
            "confirmation.html";


        return true;

    }

    catch (error) {

        console.error(
            "Unable to save booking:",
            error
        );


        alert(
            "Unable to save booking. Please try again."
        );


        return false;

    }

}