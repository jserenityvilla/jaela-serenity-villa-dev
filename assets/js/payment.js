// ======================================================
// Ja-Ela Serenity Villa
// Stripe Deposit + Balance Payment
// ======================================================

// ------------------------------------------------------
// Stripe Checkout Cloud Functions
// ------------------------------------------------------

const CREATE_DEPOSIT_CHECKOUT_URL =
    "https://us-central1-ja-ela-serenity-villa-test.cloudfunctions.net/createDepositCheckout";

const CREATE_BALANCE_CHECKOUT_URL =
    "https://us-central1-ja-ela-serenity-villa-test.cloudfunctions.net/createBalanceCheckout";


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
// Current payment type
// ======================================================

let currentPaymentType =
    null;


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


        const balance =
            Number(booking.balanceAmount) ||
            Math.max(
                0,
                total - deposit
            );


        const currency =
            String(
                booking.currency || "AUD"
            ).toUpperCase();


        const paymentStatus =
            booking.paymentStatus ||
            "Deposit Required";


        const balancePaymentStatus =
            booking.balancePaymentStatus ||
            "Balance Due";


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
                <strong>Balance:</strong>
                ${currency} ${balance.toFixed(2)}
            </p>

            <p>
                <strong>Payment Status:</strong>
                ${paymentStatus}
            </p>

        `;


        // ==================================================
        // CANCELLED BOOKING
        // ==================================================

        if (
            booking.status === "Cancelled"
        ) {

            currentPaymentType =
                null;

            paymentMessage.innerHTML = `
                <p>
                    This booking has been cancelled.
                    No further payment can be made.
                </p>
            `;

            payDepositBtn.disabled =
                true;

            payDepositBtn.textContent =
                "Booking Cancelled";

            return;
        }


        // ==================================================
        // FULLY PAID
        // ==================================================

        if (
            paymentStatus === "Paid" ||
            balancePaymentStatus === "Paid" ||
            booking.balancePaid === true
        ) {

            currentPaymentType =
                null;

            paymentMessage.innerHTML = `
                <p>
                    <strong>
                        Your booking has been fully paid.
                    </strong>
                </p>
            `;

            payDepositBtn.disabled =
                true;

            payDepositBtn.textContent =
                "Booking Fully Paid";

            return;
        }


        // ==================================================
        // DEPOSIT STILL REQUIRED
        // ==================================================

        if (
            paymentStatus === "Deposit Required" ||
            paymentStatus === "Deposit Checkout Created"
        ) {

            currentPaymentType =
                "deposit";

            paymentMessage.innerHTML = `
                <p>
                    Your booking deposit is required
                    to secure the reservation.
                </p>
            `;

            payDepositBtn.disabled =
                false;

            payDepositBtn.textContent =
                `Pay ${currency} ${deposit.toFixed(2)} Deposit`;

            return;
        }


        // ==================================================
        // DEPOSIT PAID — BALANCE DUE
        // ==================================================

        if (
            paymentStatus === "Deposit Paid" &&
            balancePaymentStatus !== "Paid"
        ) {

            if (balance <= 0) {

                currentPaymentType =
                    null;

                paymentMessage.innerHTML = `
                    <p>
                        No outstanding balance remains.
                    </p>
                `;

                payDepositBtn.disabled =
                    true;

                payDepositBtn.textContent =
                    "No Balance Due";

                return;
            }


            currentPaymentType =
                "balance";

            paymentMessage.innerHTML = `
                <p>
                    Your deposit has been received.
                </p>

                <p>
                    You may pay the remaining balance
                    at any time.
                </p>
            `;

            payDepositBtn.disabled =
                false;

            payDepositBtn.textContent =
                `Pay ${currency} ${balance.toFixed(2)} Balance`;

            return;
        }


        // ==================================================
        // FALLBACK
        // ==================================================

        currentPaymentType =
            null;

        payDepositBtn.disabled =
            true;

        payDepositBtn.textContent =
            "Payment Unavailable";

        paymentMessage.innerHTML = `
            <p>
                Payment is currently unavailable
                for this booking.
            </p>
        `;

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

        paymentMessage.innerHTML = `
            <p>
                Please try again or contact us
                for assistance.
            </p>
        `;

        payDepositBtn.disabled =
            true;

    }

}


// ======================================================
// Start Stripe Checkout
// ======================================================

async function startPayment() {

    if (
        !bookingId ||
        !currentPaymentType
    ) {

        return;
    }


    payDepositBtn.disabled =
        true;

    payDepositBtn.textContent =
        "Connecting to Stripe...";


    paymentMessage.innerHTML = `
        <p>
            Please wait while we prepare
            your secure payment.
        </p>
    `;


    const checkoutUrl =
        currentPaymentType === "balance"
            ? CREATE_BALANCE_CHECKOUT_URL
            : CREATE_DEPOSIT_CHECKOUT_URL;


    try {

        const response =
            await fetch(
                checkoutUrl,
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
                ${error.message || "Please try again."}
            </p>
        `;


        payDepositBtn.disabled =
            false;


        if (
            currentPaymentType === "balance"
        ) {

            payDepositBtn.textContent =
                "Try Balance Payment Again";

        } else {

            payDepositBtn.textContent =
                "Try Deposit Payment Again";

        }

    }

}


// ======================================================
// Payment button
// ======================================================

if (payDepositBtn) {

    payDepositBtn.addEventListener(
        "click",
        startPayment
    );

}


// ======================================================
// Initial load
// ======================================================

loadBooking();