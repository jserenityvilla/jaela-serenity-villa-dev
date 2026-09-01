const firebaseAdmin =
  require("firebase-admin");

firebaseAdmin.initializeApp();

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");

const {defineSecret} = require("firebase-functions/params");
const {Resend} = require("resend");
const Stripe = require("stripe");

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const ADMIN_EMAIL = defineSecret("ADMIN_EMAIL");

const STRIPE_SECRET_KEY =
  defineSecret("STRIPE_SECRET_KEY");

const siteBaseUrl =
  process.env.GCLOUD_PROJECT === "ja-ela-serenity-villa-test" ?
    "https://jserenityvilla.github.io/jaela-serenity-villa-test" :
    "https://jaelaserenityvilla.com";

setGlobalOptions({
  maxInstances: 10,
});

/**
 * ============================================================
 * BOOKING REQUEST EMAIL
 * ============================================================
 *
 * Sends the initial booking request email to:
 * 1. Guest
 * 2. Owner/Admin
 */
exports.sendBookingEmail = onRequest(
    {
      secrets: [RESEND_API_KEY, ADMIN_EMAIL],
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({
            success: false,
            error: "Method not allowed",
          });
        }

        const booking = req.body || {};

        const {
          bookingReference,
          guestName,
          email,
          phone,
          country,
          checkin,
          checkout,
          adults,
          children,
          totalGuests,
          nights,
          arrivalTime,
          specialRequests,
          accommodation,
          extraGuestFee,
          cleaningFee,
          total,
          currency,
        } = booking;

        if (!bookingReference || !guestName || !email) {
          return res.status(400).json({
            success: false,
            error: "Missing required booking information.",
          });
        }

        const resend = new Resend(
            RESEND_API_KEY.value(),
        );

        const {data, error} =
          await resend.emails.send({
            from:
              "Ja-Ela Serenity Villa " +
              "<bookings@jaelaserenityvilla.com>",

            to: [
              email,
              ADMIN_EMAIL.value(),
            ],

            subject:
              `Booking Request Received - ` +
              `${bookingReference}`,

            html: `
              <h2>Ja-Ela Serenity Villa</h2>

              <p>
                Dear ${guestName},
              </p>

              <p>
                Thank you for your booking request.
                We have received your request successfully.
              </p>

              <h3>Booking Details</h3>

              <p>
                <strong>Booking Reference:</strong>
                ${bookingReference}
              </p>

              <p>
                <strong>Check-in:</strong>
                ${checkin}
              </p>

              <p>
                <strong>Check-out:</strong>
                ${checkout}
              </p>

              <p>
                <strong>Guests:</strong>
                ${totalGuests}
                (${adults} adults, ${children} children)
              </p>

              <p>
                <strong>Nights:</strong>
                ${nights}
              </p>

              <p>
                <strong>Arrival Time:</strong>
                ${arrivalTime || "Not specified"}
              </p>

              <h3>Price Summary</h3>

              <p>
                <strong>Accommodation:</strong>
                ${currency} ${accommodation}
              </p>

              <p>
                <strong>Extra Guest Fee:</strong>
                ${currency} ${extraGuestFee}
              </p>

              <p>
                <strong>Cleaning Fee:</strong>
                ${currency} ${cleaningFee}
              </p>

              <p>
                <strong>Total:</strong>
                ${currency} ${total}
              </p>

              ${
                specialRequests ?
                  `
                    <h3>Special Requests</h3>
                    <p>${specialRequests}</p>
                  ` :
                  ""
}

              <h3>Guest Contact</h3>

              <p>
                <strong>Email:</strong>
                ${email}
              </p>

              <p>
                <strong>Phone:</strong>
                ${phone || "Not provided"}
              </p>

              <p>
                <strong>Country:</strong>
                ${country || "Not provided"}
              </p>

              <hr>

              <p>
                We will review your booking request
                and contact you shortly.
              </p>

              <p>
                Kind regards,<br>
                Ja-Ela Serenity Villa
              </p>
            `,
          });

        if (error) {
          console.error(
              "Resend error:",
              error,
          );

          return res.status(500).json({
            success: false,
            error: "Unable to send booking email.",
          });
        }

        console.log(
            "Booking email sent successfully:",
            data,
        );

        return res.status(200).json({
          success: true,
          message: "Booking email sent successfully.",
          emailId: data.id,
        });
      } catch (error) {
        console.error(
            "Function error:",
            error,
        );

        return res.status(500).json({
          success: false,
          error: "Unable to process booking email.",
        });
      }
    },
);


/**
 * ============================================================
 * BOOKING CONFIRMATION EMAIL
 * ============================================================
 *
 * Watches:
 * bookings/{bookingId}
 *
 * When the booking changes:
 *
 * Pending → Confirmed
 *
 * a confirmation email is sent to the guest.
 */
exports.sendBookingConfirmationEmail = onDocumentUpdated(
    {
      document: "bookings/{bookingId}",
      secrets: [RESEND_API_KEY],
    },
    async (event) => {
      try {
        const before = event.data.before.data();
        const after = event.data.after.data();

        if (!before || !after) {
          return;
        }

        /*
         * Only send the confirmation email when
         * the booking changes from Pending to Confirmed.
         */
        if (
          before.status !== "Pending" ||
          after.status !== "Confirmed"
        ) {
          return;
        }

        const {
          bookingReference,
          guestName,
          email,
          checkin,
          checkout,
          adults,
          children,
          totalGuests,
          nights,
          arrivalTime,
          accommodation,
          extraGuestFee,
          cleaningFee,
          total,
          currency,
          specialRequests,
        } = after;

        if (!email || !bookingReference) {
          console.error(
              "Confirmation email skipped: " +
              "missing guest email or booking reference.",
          );

          return;
        }

        const resend = new Resend(
            RESEND_API_KEY.value(),
        );

        const {data, error} =
          await resend.emails.send({
            from:
              "Ja-Ela Serenity Villa " +
              "<bookings@jaelaserenityvilla.com>",

            to: [email],

            subject:
              `Booking Confirmed - ${bookingReference}`,

            html: `
              <h2>Ja-Ela Serenity Villa</h2>

              <p>
                Dear ${guestName},
              </p>

              <p>
                We are pleased to confirm that your booking
                at Ja-Ela Serenity Villa has been confirmed.
              </p>

              <h3>Booking Details</h3>

              <p>
                <strong>Booking Reference:</strong>
                ${bookingReference}
              </p>

              <p>
                <strong>Check-in:</strong>
                ${checkin}
              </p>

              <p>
                <strong>Check-out:</strong>
                ${checkout}
              </p>

              <p>
                <strong>Guests:</strong>
                ${totalGuests}
                (${adults} adults, ${children} children)
              </p>

              <p>
                <strong>Nights:</strong>
                ${nights}
              </p>

              <p>
                <strong>Arrival Time:</strong>
                ${arrivalTime || "Not specified"}
              </p>

              <h3>Price Summary</h3>

              <p>
                <strong>Accommodation:</strong>
                ${currency} ${accommodation}
              </p>

              <p>
                <strong>Extra Guest Fee:</strong>
                ${currency} ${extraGuestFee}
              </p>

              <p>
                <strong>Cleaning Fee:</strong>
                ${currency} ${cleaningFee}
              </p>

              <p>
                <strong>Total:</strong>
                ${currency} ${total}
              </p>

              ${
                specialRequests ?
                  `
                    <h3>Special Requests</h3>
                    <p>${specialRequests}</p>
                  ` :
                  ""
}

              <hr>

              <p>
                <strong>
                  Your reservation is now confirmed.
                </strong>
              </p>

              <p>
                We look forward to welcoming you to
                Ja-Ela Serenity Villa.
              </p>

              <p>
                Kind regards,<br>
                Sureka & Mohan<br>
                Ja-Ela Serenity Villa
              </p>
            `,
          });

        if (error) {
          console.error(
              "Resend confirmation email error:",
              error,
          );

          return;
        }

        console.log(
            "Booking confirmation email sent successfully:",
            data,
        );
      } catch (error) {
        console.error(
            "Confirmation function error:",
            error,
        );
      }
    },
);
// ============================================================
// STRIPE - CREATE DEPOSIT CHECKOUT SESSION
// ============================================================

exports.createDepositCheckout = onRequest(
    {
      cors: true,
      secrets: [STRIPE_SECRET_KEY],
    },
    async (req, res) => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({
            error: "Method not allowed",
          });
        }

        const {
          bookingId,
          successUrl,
          cancelUrl,
        } = req.body || {};

        if (!bookingId) {
          return res.status(400).json({
            error: "bookingId is required.",
          });
        }

        const db =
        require("firebase-admin").firestore();

        const bookingRef =
        db.collection("bookings").doc(bookingId);

        const bookingSnapshot =
        await bookingRef.get();

        if (!bookingSnapshot.exists) {
          return res.status(404).json({
            error: "Booking not found.",
          });
        }

        const booking =
        bookingSnapshot.data();

        if (booking.status !== "Confirmed") {
          return res.status(400).json({
            error: "Only confirmed bookings can request payment.",
          });
        }

        const total =
        Number(booking.total) || 0;

        const depositPercentage =
        Number(booking.depositPercentage) || 30;

        const depositAmount =
        Number(booking.depositAmount) ||
        (
          total *
          depositPercentage /
          100
        );

        if (depositAmount <= 0) {
          return res.status(400).json({
            error: "Invalid deposit amount.",
          });
        }

        const stripe =
        new Stripe(
            STRIPE_SECRET_KEY.value(),
        );

        const session =
        await stripe.checkout.sessions.create({

          mode: "payment",

          customer_email:
            booking.email || undefined,

          line_items: [
            {
              price_data: {
                currency:
                  String(
                      booking.currency || "AUD",
                  ).toLowerCase(),

                product_data: {
                  name:
                    "Ja-Ela Serenity Villa - Booking Deposit",
                },

                unit_amount:
                  Math.round(
                      depositAmount * 100,
                  ),
              },

              quantity: 1,
            },
          ],

          metadata: {
            bookingId:
              bookingId,

            bookingReference:
              booking.bookingReference || "",

            paymentType:
              "deposit",
          },

          success_url:
            successUrl ||
            "https://jaelaserenityvilla.com/pages/confirmation.html",

          cancel_url:
            cancelUrl ||
            "https://jaelaserenityvilla.com/pages/booking.html",

        });

        await bookingRef.update({
          paymentStatus:
          "Deposit Checkout Created",

          stripeCheckoutSessionId:
          session.id,

          stripePaymentType:
          "deposit",
        });

        return res.status(200).json({
          checkoutUrl:
          session.url,

          sessionId:
          session.id,
        });
      } catch (error) {
        console.error(
            "Stripe deposit checkout error:",
            error,
        );

        return res.status(500).json({
          error:
          "Unable to create Stripe checkout session.",
        });
      }
    },
);

// ============================================================
// STRIPE - CREATE BALANCE CHECKOUT SESSION
// ============================================================

exports.createBalanceCheckout = onRequest(
    {
      cors: true,
      secrets: [STRIPE_SECRET_KEY],
    },
    async (req, res) => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({
            error: "Method not allowed",
          });
        }

        const {
          bookingId,
          successUrl,
          cancelUrl,
        } = req.body || {};

        if (!bookingId) {
          return res.status(400).json({
            error: "bookingId is required.",
          });
        }

        const db =
        require("firebase-admin").firestore();

        const bookingRef =
        db.collection("bookings").doc(bookingId);

        const bookingSnapshot =
        await bookingRef.get();

        if (!bookingSnapshot.exists) {
          return res.status(404).json({
            error: "Booking not found.",
          });
        }

        const booking =
        bookingSnapshot.data();

        // ------------------------------------------------------
        // Booking must be confirmed
        // ------------------------------------------------------

        if (booking.status !== "Confirmed") {
          return res.status(400).json({
            error:
            "Only confirmed bookings can request balance payment.",
          });
        }

        // ------------------------------------------------------
        // Deposit must already be paid
        // ------------------------------------------------------

        if (booking.depositPaid !== true) {
          return res.status(400).json({
            error:
            "The booking deposit must be paid before the balance can be paid.",
          });
        }

        // ------------------------------------------------------
        // Balance must not already be paid
        // ------------------------------------------------------

        if (
          booking.balancePaymentStatus === "Paid" ||
        booking.balancePaid === true
        ) {
          return res.status(400).json({
            error: "The booking balance has already been paid.",
          });
        }

        // ------------------------------------------------------
        // Calculate remaining balance
        // ------------------------------------------------------

        const total =
        Number(booking.total) || 0;

        const depositAmount =
        Number(booking.depositAmount) || 0;

        const balanceAmount =
        Number(booking.balanceAmount) ||
        (total - depositAmount);

        if (balanceAmount <= 0) {
          return res.status(400).json({
            error: "Invalid balance amount.",
          });
        }

        const stripe =
        new Stripe(
            STRIPE_SECRET_KEY.value(),
        );

        // ------------------------------------------------------
        // Create Stripe Checkout session
        // ------------------------------------------------------

        const session =
        await stripe.checkout.sessions.create({

          mode: "payment",

          customer_email:
            booking.email || undefined,

          line_items: [
            {
              price_data: {
                currency:
                  String(
                      booking.currency || "AUD",
                  ).toLowerCase(),

                product_data: {
                  name:
                    "Ja-Ela Serenity Villa - Booking Balance",
                },

                unit_amount:
                  Math.round(
                      balanceAmount * 100,
                  ),
              },

              quantity: 1,
            },
          ],

          metadata: {
            bookingId:
              bookingId,

            bookingReference:
              booking.bookingReference || "",

            paymentType:
              "balance",
          },

          success_url:
            successUrl ||
            `${siteBaseUrl}/pages/payment.html`,

          cancel_url:
            cancelUrl ||
            `${siteBaseUrl}/pages/payment.html`,
        });

        // ------------------------------------------------------
        // Record checkout session
        // ------------------------------------------------------

        await bookingRef.update({
          balancePaymentStatus:
          "Balance Checkout Created",

          balanceStripeCheckoutSessionId:
          session.id,

          stripePaymentType:
          "balance",
        });

        return res.status(200).json({
          checkoutUrl:
          session.url,

          sessionId:
          session.id,
        });
      } catch (error) {
        console.error(
            "Stripe balance checkout error:",
            error,
        );

        return res.status(500).json({
          error:
          "Unable to create Stripe balance checkout session.",
        });
      }
    },
);

// ============================================================
// STRIPE - PAYMENT WEBHOOK
// ============================================================

// ============================================================
// STRIPE - PAYMENT WEBHOOK
// ============================================================

const STRIPE_WEBHOOK_SECRET =
  defineSecret("STRIPE_WEBHOOK_SECRET");

exports.stripeWebhook = onRequest(
    {
      secrets: [
        STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET,
      ],
    },
    async (req, res) => {
      if (req.method !== "POST") {
        return res.status(405).send("Method not allowed.");
      }

      try {
        const stripe =
        new Stripe(
            STRIPE_SECRET_KEY.value(),
        );

        const signature =
        req.headers["stripe-signature"];

        if (!signature) {
          return res.status(400).send(
              "Missing Stripe signature.",
          );
        }

        const event =
        stripe.webhooks.constructEvent(
            req.rawBody,
            signature,
            STRIPE_WEBHOOK_SECRET.value(),
        );

        console.log(
            "Stripe webhook received:",
            event.type,
        );

        // ======================================================
        // CHECKOUT SESSION COMPLETED
        // ======================================================

        if (
          event.type ===
        "checkout.session.completed"
        ) {
          const session =
          event.data.object;

          const bookingId =
          session.metadata &&
          session.metadata.bookingId;

          const paymentType =
          session.metadata &&
          session.metadata.paymentType;

          if (!bookingId) {
            console.error(
                "Stripe webhook: bookingId missing.",
            );

            return res.status(400).send(
                "bookingId missing.",
            );
          }

          const db =
          require("firebase-admin").firestore();

          const bookingRef =
          db
              .collection("bookings")
              .doc(bookingId);

          const bookingSnapshot =
          await bookingRef.get();

          if (!bookingSnapshot.exists) {
            console.error(
                "Stripe webhook: booking not found:",
                bookingId,
            );

            return res.status(404).send(
                "Booking not found.",
            );
          }

          const booking =
          bookingSnapshot.data();


          // ==================================================
          // DEPOSIT PAYMENT
          // ==================================================

          if (paymentType === "deposit") {
            const total =
            Number(booking.total) || 0;

            const depositPercentage =
            Number(
                booking.depositPercentage,
            ) || 30;

            const depositAmount =
            Number(
                booking.depositAmount,
            ) ||
            (
              total *
              depositPercentage /
              100
            );

            const balanceAmount =
            total -
            depositAmount;


            await bookingRef.update({

              paymentStatus:
              "Deposit Paid",

              depositPaid:
              true,

              depositPaidAt:
              firebaseAdmin
                  .firestore
                  .FieldValue
                  .serverTimestamp(),

              stripePaymentIntentId:
              session.payment_intent || null,

              stripeCheckoutSessionId:
              session.id,

              balanceAmount:
              balanceAmount,

              balancePaymentStatus:
              "Balance Due",

            });


            console.log(
                "Deposit payment recorded:",
                bookingId,
            );
          }


          // ==================================================
          // BALANCE PAYMENT
          // ==================================================

          if (paymentType === "balance") {
            const total =
            Number(booking.total) || 0;

            const depositAmount =
            Number(
                booking.depositAmount,
            ) || 0;

            const expectedBalance =
            Number(
                booking.balanceAmount,
            ) ||
            (
              total -
              depositAmount
            );


            const stripeAmount =
            Number(
                session.amount_total,
            ) || 0;


            const expectedStripeAmount =
            Math.round(
                expectedBalance * 100,
            );


            // ----------------------------------------------
            // Verify Stripe amount
            // ----------------------------------------------

            if (
              stripeAmount !==
            expectedStripeAmount
            ) {
              console.error(
                  "Stripe balance amount mismatch:",
                  {
                    bookingId,
                    stripeAmount,
                    expectedStripeAmount,
                  },
              );

              return res.status(400).send(
                  "Balance payment amount mismatch.",
              );
            }


            // ----------------------------------------------
            // Record successful balance payment
            // ----------------------------------------------

            await bookingRef.update({

              paymentStatus:
              "Paid",

              balancePaid:
              true,

              balancePaidAt:
              firebaseAdmin
                  .firestore
                  .FieldValue
                  .serverTimestamp(),

              balancePaymentStatus:
              "Paid",

              balanceStripePaymentIntentId:
              session.payment_intent || null,

              balanceStripeCheckoutSessionId:
              session.id,

            });


            console.log(
                "Balance payment recorded:",
                bookingId,
            );
          }
        }


        // ======================================================
        // Return success to Stripe
        // ======================================================

        return res.status(200).send(
            "Webhook received.",
        );
      } catch (error) {
        console.error(
            "Stripe webhook error:",
            error,
        );

        return res.status(400).send(
            "Webhook error.",
        );
      }
    },
);
// ============================================================
// BALANCE PAYMENT REMINDER & CANCELLATION CHECKER
// ============================================================
//
// Runs every hour.
//
// Rules:
// 1. Guest may pay the balance early.
// 2. Balance becomes due 168 hours (7 days) before check-in.
// 3. If unpaid at the due time, send a reminder.
// 4. Guest receives a 48-hour grace period.
// 5. If still unpaid after the grace period, cancel the booking.
// 6. The 30% deposit is retained as the cancellation fee.
// ============================================================

exports.checkBalancePaymentDeadlines = onSchedule(
    {
      schedule: "every 1 hours",
      timeZone: "Asia/Colombo",
      secrets: [
        RESEND_API_KEY,
        ADMIN_EMAIL,
      ],
    },
    async () => {
      try {
        const db =
        firebaseAdmin.firestore();


        const now =
        new Date();

        console.log(
            "Balance payment deadline check started:",
            now.toISOString(),
        );

        const snapshot =
        await db
            .collection("bookings")
            .where("status", "==", "Confirmed")
            .get();

        if (snapshot.empty) {
          console.log(
              "No confirmed bookings found.",
          );

          return;
        }


        const resend =
        new Resend(
            RESEND_API_KEY.value(),
        );


        for (const doc of snapshot.docs) {
          const booking =
          doc.data();

          const bookingId =
          doc.id;


          // ----------------------------------------------------
          // Skip bookings where balance is already paid
          // ----------------------------------------------------

          if (
            booking.balancePaid === true ||
          booking.balancePaymentStatus === "Paid" ||
          booking.paymentStatus === "Paid"
          ) {
            continue;
          }


          // ----------------------------------------------------
          // Check required check-in date
          // ----------------------------------------------------

          if (!booking.checkin) {
            console.warn(
                "Skipping booking without check-in date:",
                bookingId,
            );

            continue;
          }


          // ----------------------------------------------------
          // Convert YYYY-MM-DD check-in date
          // to Colombo local midnight.
          // ----------------------------------------------------

          const checkinDate =
          new Date(
              `${booking.checkin}T00:00:00+05:30`,
          );

          if (
            Number.isNaN(
                checkinDate.getTime(),
            )
          ) {
            console.warn(
                "Invalid check-in date:",
                bookingId,
                booking.checkin,
            );

            continue;
          }


          // ----------------------------------------------------
          // Read configured deadlines
          // ----------------------------------------------------

          const balanceDueHoursValue =
          Number(
              booking.balanceDueHoursBeforeCheckin,
          );

          const balanceDueHours =
          Number.isFinite(balanceDueHoursValue) &&
          balanceDueHoursValue >= 0 ?
            balanceDueHoursValue :
            168;


          const gracePeriodHoursValue =
          Number(
              booking.balanceGracePeriodHours,
          );

          const gracePeriodHours =
          Number.isFinite(gracePeriodHoursValue) &&
          gracePeriodHoursValue >= 0 ?
            gracePeriodHoursValue :
            48;


          // ----------------------------------------------------
          // Calculate balance due time
          // ----------------------------------------------------

          const balanceDueTime =
          new Date(
              checkinDate.getTime() -
            (
              balanceDueHours *
              60 *
              60 *
              1000
            ),
          );


          // ----------------------------------------------------
          // Calculate cancellation deadline
          // ----------------------------------------------------

          const cancellationTime =
          new Date(
              balanceDueTime.getTime() +
            (
              gracePeriodHours *
              60 *
              60 *
              1000
            ),
          );

          console.log(
              "Balance booking evaluation:",
              {
                bookingId,
                bookingReference: booking.bookingReference,
                status: booking.status,
                checkin: booking.checkin,
                now: now.toISOString(),
                balanceDueTime: balanceDueTime.toISOString(),
                cancellationTime: cancellationTime.toISOString(),
                balanceDueHours,
                gracePeriodHours,
                balanceReminderSent: booking.balanceReminderSent,
                balancePaid: booking.balancePaid,
                balancePaymentStatus: booking.balancePaymentStatus,
                email: booking.email,
              },
          );


          // ----------------------------------------------------
          // Before balance due time
          // ----------------------------------------------------

          if (
            now <
          balanceDueTime
          ) {
            continue;
          }


          // ----------------------------------------------------
          // Balance is now due
          // ----------------------------------------------------

          const bookingRef =
          db
              .collection("bookings")
              .doc(bookingId);


          // ====================================================
          // REMINDER
          // ====================================================

          if (
            now >= balanceDueTime &&
          now < cancellationTime &&
          booking.balanceReminderSent !== true
          ) {
            const total =
           Number(
               booking.total,
           ) || 0;

            const depositAmount =
            Number(
                booking.depositAmount,
            ) || 0;

            const calculatedBalance =
            total -
            depositAmount;

            const storedBalance =
            Number(
                booking.balanceAmount,
            );

            const balanceAmount =
            storedBalance > 0 ?
              storedBalance :
              calculatedBalance;

            const currency =
            String(
                booking.currency || "AUD",
            ).toUpperCase();


            if (
              booking.email &&
            booking.bookingReference
            ) {
              const paymentUrl =
              siteBaseUrl +
              "/pages/payment.html" +
              "?bookingId=" +
              encodeURIComponent(
                  bookingId,
              );


              const {error} =
              await resend.emails.send({

                from:
                  "Ja-Ela Serenity Villa " +
                  "<bookings@jaelaserenityvilla.com>",

                to: [
                  booking.email,
                ],

                subject:
                  `Balance Payment Due - ` +
                  `${booking.bookingReference}`,

                html: `

                  <h2>
                    Ja-Ela Serenity Villa
                  </h2>

                  <p>
                    Dear ${booking.guestName || "Guest"},
                  </p>

                  <p>
                    This is a reminder that the remaining
                    balance for your reservation is now due.
                  </p>

                  <h3>
                    Booking Details
                  </h3>

                  <p>
                    <strong>
                      Booking Reference:
                    </strong>
                    ${booking.bookingReference}
                  </p>

                  <p>
                    <strong>
                      Check-in:
                    </strong>
                    ${booking.checkin}
                  </p>

                  <p>
                    <strong>
                      Check-out:
                    </strong>
                    ${booking.checkout || ""}
                  </p>

                  <p>
                    <strong>
                      Balance Due:
                    </strong>
                    ${currency}
                    ${balanceAmount.toFixed(2)}
                  </p>

                  <p>
                    Please complete the balance payment
        within ${gracePeriodHours} hours to keep your reservation
         confirmed.
                  </p>

                  <p>
                    <a href="${paymentUrl}">
                      Pay Balance
                    </a>
                  </p>

                  <p>
                    If you have already paid the balance,
                    please disregard this message.
                  </p>

                  <p>
                    Kind regards,<br>
                    Sureka & Mohan<br>
                    Ja-Ela Serenity Villa
                  </p>

                `,
              });


              if (error) {
                console.error(
                    "Balance reminder email failed:",
                    bookingId,
                    error,
                );

                continue;
              }


              await bookingRef.update({

                balanceReminderSent:
                true,

                balanceReminderSentAt:
                firebaseAdmin
                    .firestore
                    .FieldValue
                    .serverTimestamp(),

                balancePaymentStatus:
                "Balance Reminder Sent",

              });


              console.log(
                  "Balance reminder sent:",
                  bookingId,
              );
            }

            continue;
          }


          // ====================================================
          // 48-HOUR GRACE PERIOD EXPIRED
          // ====================================================

          if (
            now >= cancellationTime &&
          booking.balancePaid !== true &&
          booking.balancePaymentStatus !== "Paid" &&
    booking.balanceCancellationProcessed !== true
          ) {
            const total =
            Number(
                booking.total,
            ) || 0;

            const depositAmount =
            Number(
                booking.depositAmount,
            ) || 0;

            const cancellationFeePercentage =
          Number(
              booking.cancellationFeePercentage,
          ) || 30;

            const cancellationFee =
              depositAmount ||
          (
            total *
              cancellationFeePercentage /
            100
          );

            // -----------------------------------------------
            // Cancel booking
            // -----------------------------------------------

            await bookingRef.update({

              status:
              "Cancelled",

              cancellationReason:
              "Balance payment not received within grace period.",

              cancellationFee:
              cancellationFee,

              cancellationFeePercentage:
              cancellationFeePercentage,

              cancellationFeeRetained:
              true,

              cancelledAt:
              firebaseAdmin
                  .firestore
                  .FieldValue
                  .serverTimestamp(),

              balancePaymentStatus:
              "Balance Payment Expired",

              balanceCancellationProcessed:
              true,

              balanceCancellationProcessedAt:
              firebaseAdmin
                  .firestore
                  .FieldValue
                  .serverTimestamp(),

            });


            console.log(
                "Booking cancelled after balance grace period:",
                bookingId,
            );


            // -----------------------------------------------
            // Notify guest
            // -----------------------------------------------

            if (
              booking.email
            ) {
              await resend.emails.send({

                from:
                "Ja-Ela Serenity Villa " +
                "<bookings@jaelaserenityvilla.com>",

                to: [
                  booking.email,
                ],

                subject:
                `Booking Cancelled - ` +
                `${booking.bookingReference}`,

                html: `

                <h2>
                  Ja-Ela Serenity Villa
                </h2>

                <p>
                  Dear ${booking.guestName || "Guest"},
                </p>

                <p>
                  Unfortunately, your reservation
                  has been cancelled because the remaining
                  balance was not received within the
                  required grace period.
                </p>

                <p>
                  <strong>
                    Booking Reference:
                  </strong>
                  ${booking.bookingReference}
                </p>

                <p>
                  <strong>
                    Cancellation Fee:
                  </strong>
                  ${String(
      booking.currency || "AUD",
  ).toUpperCase()}
                  ${cancellationFee.toFixed(2)}
                </p>

                <p>
                  The cancellation fee represents the
                  deposit already paid for the reservation.
                </p>

                <p>
                  If you believe this cancellation was made
                  in error, please contact us.
                </p>

                <p>
                  Kind regards,<br>
                  Sureka & Mohan<br>
                  Ja-Ela Serenity Villa
                </p>

              `,
              });
            }


            // -----------------------------------------------
            // Notify admin
            // -----------------------------------------------

            await resend.emails.send({

              from:
              "Ja-Ela Serenity Villa " +
              "<bookings@jaelaserenityvilla.com>",

              to: [
                ADMIN_EMAIL.value(),
              ],

              subject:
              `Booking Automatically Cancelled - ` +
              `${booking.bookingReference}`,

              html: `

              <h2>
                Booking Automatically Cancelled
              </h2>

              <p>
                <strong>
                  Booking Reference:
                </strong>
                ${booking.bookingReference}
              </p>

              <p>
                <strong>
                  Guest:
                </strong>
                ${booking.guestName || ""}
              </p>

              <p>
                <strong>
                  Check-in:
                </strong>
                ${booking.checkin}
              </p>

              <p>
                <strong>
                  Balance:
                </strong>
                ${String(
      booking.currency || "AUD",
  ).toUpperCase()}
                ${(
    Number(
        booking.balanceAmount,
    ) || 0
  ).toFixed(2)}
              </p>

              <p>
                <strong>
                  Cancellation Fee Retained:
                </strong>
                ${String(
      booking.currency || "AUD",
  ).toUpperCase()}
                ${cancellationFee.toFixed(2)}
              </p>

              <p>
                The booking was automatically cancelled
                after the 48-hour balance-payment grace
                period expired.
              </p>

            `,
            });
          }
        }


        console.log(
            "Balance payment deadline check completed.",
        );
      } catch (error) {
        console.error(
            "Balance payment deadline checker error:",
            error,
        );

        throw error;
      }
    },
);
