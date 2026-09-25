/*
====================================
Ja-Ela Serenity Villa
Manual External Booking
====================================
*/

(function () {

    "use strict";

    function getConfig() {
        return window.CONFIG || {};
    }

    function getCollection() {
        const config = getConfig();
        return config.firestore?.bookingsCollection || "bookings";
    }

    function calculateNights(checkin, checkout) {
        const start = new Date(checkin + "T00:00:00");
        const end = new Date(checkout + "T00:00:00");
        const ms = end.getTime() - start.getTime();
        return Math.round(ms / 86400000);
    }

    function sourceCode(source) {
        return String(source || "DIRECT")
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function safeReference(value) {
        return String(value || "")
            .trim()
            .replace(/[^A-Za-z0-9-]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function money(value) {
        return Number(value || 0).toFixed(2);
    }

    function updateExternalBookingTotal() {
        const accommodation =
            Number(document.getElementById("externalAccommodation").value) || 0;

        const extraGuestFee =
            Number(document.getElementById("externalExtraGuestFee").value) || 0;

        const cleaningFee =
            Number(document.getElementById("externalCleaningFee").value) || 0;

        const total =
            accommodation +
            extraGuestFee +
            cleaningFee;

        document.getElementById("externalTotal").value = money(total);
    }

    function openExternalBookingModal() {
        const modal = document.getElementById("externalBookingModal");

        if (!modal) {
            return;
        }

        const form = document.getElementById("externalBookingForm");

        if (form) {
            form.reset();
        }

        document.getElementById("externalAdults").value = "2";
        document.getElementById("externalChildren").value = "0";
        document.getElementById("externalPaymentStatus").value = "Paid";
        document.getElementById("externalTotal").value = "0.00";

        modal.style.display = "block";
    }

    function closeExternalBookingModal() {
        const modal = document.getElementById("externalBookingModal");

        if (modal) {
            modal.style.display = "none";
        }
    }

    async function loadExistingBookings() {
        const snapshot =
            await db
                .collection(getCollection())
                .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    function hasDateConflict(bookings, checkin, checkout) {
        return bookings.some(booking => {

            const status =
                String(booking.status || "Pending");

            if (status === "Cancelled") {
                return false;
            }

            if (!booking.checkin || !booking.checkout) {
                return false;
            }

            return (
                booking.checkin < checkout &&
                booking.checkout > checkin
            );
        });
    }

    function hasDuplicateReference(bookings, source, reference) {
        if (!reference) {
            return false;
        }

        return bookings.some(booking =>
            String(booking.source || "").toLowerCase() ===
                String(source || "").toLowerCase() &&
            String(booking.channelBookingReference || "").trim().toLowerCase() ===
                String(reference || "").trim().toLowerCase()
        );
    }

    function buildPaymentFields(paymentStatus, total, depositPaid) {
        let payment = 0;
        let balance = total;
        let balanceStatus = "Balance Due";
        let balancePaid = false;
        let finalPaymentStatus = paymentStatus;

        if (paymentStatus === "Paid") {
            payment = total;
            balance = 0;
            balanceStatus = "Paid";
            balancePaid = true;
            finalPaymentStatus = "Paid";
        }

        if (paymentStatus === "Deposit Paid") {
            payment = Math.min(depositPaid, total);
            balance = Math.max(0, total - payment);
            balanceStatus = balance > 0 ? "Balance Due" : "Paid";
            balancePaid = balance === 0;

            if (balance === 0) {
                finalPaymentStatus = "Paid";
            } else {
                finalPaymentStatus = "Deposit Paid";
            }
        }

        if (paymentStatus === "Deposit Rejected") {
            payment = 0;
            balance = total;
            balanceStatus = "Balance Due";
            balancePaid = false;
            finalPaymentStatus = "Deposit Rejected";
        }

        if (paymentStatus === "Balance Due") {
            payment = Math.min(depositPaid, total);
            balance = Math.max(0, total - payment);
            balanceStatus = balance > 0 ? "Balance Due" : "Paid";
            balancePaid = balance === 0;

            if (balance === 0) {
                finalPaymentStatus = "Paid";
            } else {
                finalPaymentStatus = "Balance Due";
            }
        }

        return {
            depositAmount: payment,
            balanceAmount: balance,
            paymentStatus: finalPaymentStatus,
            balancePaymentStatus: balanceStatus,
            balancePaid
        };
    }

    async function saveExternalBooking(event) {
        event.preventDefault();

        const message =
            document.getElementById("externalBookingMessage");

        message.textContent = "";

        try {
            if (!window.firebase) {
                throw new Error("Firebase is not available.");
            }

            const source =
                document.getElementById("externalSource").value.trim();

            const channelReference =
                document.getElementById("externalReference").value.trim();

            const guestName =
                document.getElementById("externalGuestName").value.trim();

            const email =
                document.getElementById("externalEmail").value.trim();

            const phone =
                document.getElementById("externalPhone").value.trim();

            const country =
                document.getElementById("externalCountry").value.trim();

            const checkin =
                document.getElementById("externalCheckin").value;

            const checkout =
                document.getElementById("externalCheckout").value;

            const adults =
                Number(document.getElementById("externalAdults").value) || 0;

            const children =
                Number(document.getElementById("externalChildren").value) || 0;

            const accommodation =
                Number(document.getElementById("externalAccommodation").value) || 0;

            const extraGuestFee =
                Number(document.getElementById("externalExtraGuestFee").value) || 0;

            const cleaningFee =
                Number(document.getElementById("externalCleaningFee").value) || 0;

            const total =
                accommodation +
                extraGuestFee +
                cleaningFee;

            const paymentStatus =
                document.getElementById("externalPaymentStatus").value;

            const depositPaid =
                Number(document.getElementById("externalDepositPaid").value) || 0;

            const notes =
                document.getElementById("externalNotes").value.trim();

            if (!source) {
                throw new Error("Booking source is required.");
            }

            if (!guestName) {
                throw new Error("Guest name is required.");
            }

            if (!checkin || !checkout) {
                throw new Error("Check-in and check-out dates are required.");
            }

            const nights =
                calculateNights(checkin, checkout);

            if (nights <= 0) {
                throw new Error("Check-out must be after check-in.");
            }

            if (adults + children <= 0) {
                throw new Error("At least one guest is required.");
            }

            if (total <= 0) {
                throw new Error("Booking revenue must be greater than zero.");
            }

            const bookings =
                await loadExistingBookings();

            if (hasDuplicateReference(
                bookings,
                source,
                channelReference
            )) {
                throw new Error(
                    "A booking with this external reference already exists for this source."
                );
            }

            if (hasDateConflict(
                bookings,
                checkin,
                checkout
            )) {
                throw new Error(
                    "These dates overlap an existing active booking."
                );
            }

            const prefix =
                sourceCode(source);

            const referenceSuffix =
                safeReference(channelReference) ||
                "MANUAL";

            const bookingReference =
                `${prefix}-${referenceSuffix}`;

            const payment =
                buildPaymentFields(
                    paymentStatus,
                    total,
                    depositPaid
                );

            const currentUser =
                typeof firebase.auth === "function"
                    ? firebase.auth().currentUser
                    : null;

            const bookingData = {
                bookingReference,
                source,
                channelBookingReference:
                    channelReference,
                isExternalBooking:
                    source !== "Direct",

                guestName,
                email,
                phone,
                country,

                checkin,
                checkout,
                adults,
                children,
                totalGuests:
                    adults + children,
                nights,

                accommodationBase:
                    accommodation,
                accommodation,
                extraGuestFee,
                cleaningFee,
                total,
                currency:
                    getConfig().pricing?.currency || "AUD",

                depositPercentage:
                    total > 0
                        ? (payment.depositAmount / total) * 100
                        : 0,
                depositAmount:
                    payment.depositAmount,
                balanceAmount:
                    payment.balanceAmount,
                paymentStatus:
                    payment.paymentStatus,
                balancePaymentStatus:
                    payment.balancePaymentStatus,
                balancePaid:
                    payment.balancePaid,

                status: "Confirmed",

                specialRequests:
                    notes,
                externalBookingNotes:
                    notes,

                createdAt:
                    firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt:
                    firebase.firestore.FieldValue.serverTimestamp(),
                createdByUid:
                    currentUser ? currentUser.uid : "",
                createdByEmail:
                    currentUser ? (currentUser.email || "") : ""
            };

            await db
                .collection(getCollection())
                .add(bookingData);

            alert(
                "External booking added successfully."
            );

            closeExternalBookingModal();

            if (typeof loadBookings === "function") {
                await loadBookings();
            }
        }
        catch (error) {
            console.error(
                "Unable to add external booking:",
                error
            );

            message.textContent =
                error.message ||
                "Unable to add external booking.";
        }
    }

    function attachExternalBookingEvents() {
        const form =
            document.getElementById("externalBookingForm");

        if (!form) {
            return;
        }

        form.addEventListener(
            "submit",
            saveExternalBooking
        );

        [
            "externalAccommodation",
            "externalExtraGuestFee",
            "externalCleaningFee"
        ].forEach(id => {
            const field =
                document.getElementById(id);

            if (field) {
                field.addEventListener(
                    "input",
                    updateExternalBookingTotal
                );
            }
        });
    }

    window.openExternalBookingModal =
        openExternalBookingModal;

    window.closeExternalBookingModal =
        closeExternalBookingModal;

    window.addEventListener(
        "DOMContentLoaded",
        attachExternalBookingEvents
    );

})();




