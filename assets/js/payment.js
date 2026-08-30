// ======================================================
// Ja-Ela Serenity Villa
// Stripe Deposit Payment
// ======================================================

const CREATE_DEPOSIT_CHECKOUT_URL =
    "https://us-central1-ja-ela-serenity-villa-test.cloudfunctions.net/createDepositCheckout";


// ======================================================
// Get booking ID from URL
// ======================================================

const params =
    new URLSearchParams(window.location.search);

const bookingId =
    params.get("bookingId");


// ======================================================
// Page elements
// ======================================================

const paymentDetails =
    document.getElementById("paymentDetails");

const paymentMessage =
    document.getElementById("paymentMessage");

const payDepositBtn =
    document.getElementById("payDepositBtn");


// ======================================================
// Load booking
// ======================================================

async function loadBooking() {

    if (!bookingId) {

        paymentDetails.innerHTML = `
            <p>
                <strong>Booking information is missing.</strong>
            </p>
        `;

        paymentMessage.innerHTML = `
            <p>
                Please use the payment link provided
                in your booking confirmation email.
            </p>
        `;

        payDepositBtn.disabled = true;

        return;

    }


    try {

        const bookingDoc =
            await db
                .collection("bookings")
                .doc(bookingId)
                .get();


        if (!bookingDoc.exists) {

            paymentDetails.innerHTML = `
                <p>
                    <strong>Booking not found.</strong>
                </p>
            `;

            payDepositBtn.disabled = true;

            return;

        }


        const booking =
            bookingDoc.data();


        const total =
            Number(booking.total) || 0;


        const deposit =
            Number(booking.depositAmount) || 0;


        const currency =
            String(
                booking.currency || "AUD"
            ).toUpperCase();


        const paymentStatus =
            booking.paymentStatus ||
            "Deposit Required";


        paymentDetails.innerHTML = `

            <p>
                <strong>Booking Reference:</strong>
                ${booking.bookingReference || bookingId}
            </p>

            <p>
                <strong>Guest:</strong>
                ${booking.guestName || "-"}
            </p>

            <p>
                <strong>Check-in:</strong>
                ${booking.checkin || "-"}
            </p>

            <p>
                <strong>Check-out:</strong>
                ${booking.checkout || "-"}
            </p>

            <hr>

            <p>
                <strong>Total Booking:</strong>
                ${currency} ${total.toFixed(2)}
            </p>

            <p>
                <strong>Deposit:</strong>
                ${currency} ${deposit.toFixed(2)}
            </p>

            <p>
                <strong>Payment Status:</strong>
                ${paymentStatus}
            </p>

        `;


        // ------------------------------------------
        // Already paid
        // ------------------------------------------

        if (
            paymentStatus === "Deposit Paid" ||
            paymentStatus === "Paid"
        ) {

            paymentMessage.innerHTML = `
                <p>
                    Your deposit has already been received.
                </p>
            `;

            payDepositBtn.disabled = true;

            payDepositBtn.textContent =
                "Deposit Already Paid";

            return;

        }


        // ------------------------------------------
        // Booking must be confirmed
        // ------------------------------------------

        if (
            booking.status !== "Confirmed"
        ) {

            paymentMessage.innerHTML = `
                <p>
                    Your booking has not yet been confirmed.
                    Please wait for the confirmation email.
                </p>
            `;

            payDepositBtn.disabled = true;

            payDepositBtn.textContent =
                "Awaiting Booking Confirmation";

            return;

        }


        // ------------------------------------------
        // Ready for payment
        // ------------------------------------------

        payDepositBtn.disabled = false;

        payDepositBtn.textContent =
            `Pay ${currency} ${deposit.toFixed(2)} Deposit`;

    }

    catch (error) {

        console.error(
            "Unable to load booking:",
            error
        );


        paymentDetails.innerHTML = `
            <p>
                Unable to load your booking details.
            </p>
        `;

        payDepositBtn.disabled = true;

    }

}


// ======================================================
// Start Stripe Checkout
// ======================================================

async function startDepositPayment() {

    if (!bookingId) {

        return;

    }


    payDepositBtn.disabled = true;

    payDepositBtn.textContent =
        "Connecting to Stripe...";


    paymentMessage.innerHTML = `
        <p>
            Please wait while we prepare your secure payment.
        </p>
    `;


    try {

        const response =
            await fetch(
                CREATE_DEPOSIT_CHECKOUT_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        bookingId:
                            bookingId,

                        successUrl:
                            `${window.location.origin}${window.location.pathname}?bookingId=${encodeURIComponent(bookingId)}&payment=success`,

                        cancelUrl:
                            `${window.location.origin}${window.location.pathname}?bookingId=${encodeURIComponent(bookingId)}&payment=cancelled`

                    })
                }
            );


        const result =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                result.error ||
                "Unable to create payment session."
            );

        }


        if (
            !result.checkoutUrl
        ) {

            throw new Error(
                "Stripe checkout URL was not returned."
            );

        }


        window.location.href =
            result.checkoutUrl;

    }

    catch (error) {

        console.error(
            "Stripe payment error:",
            error
        );


        paymentMessage.innerHTML = `
            <p>
                <strong>
                    We could not start the payment.
                </strong>
            </p>

            <p>
                Please try again or contact us
                for assistance.
            </p>
        `;


        payDepositBtn.disabled = false;

        payDepositBtn.textContent =
            "Try Again";

    }

}


// ======================================================
// Payment button
// ======================================================

if (payDepositBtn) {

    payDepositBtn.addEventListener(
        "click",
        startDepositPayment
    );

}


// ======================================================
// Initial load
// ======================================================

loadBooking();
