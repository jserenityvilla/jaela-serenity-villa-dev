const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const {Resend} = require("resend");

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const ADMIN_EMAIL = defineSecret("ADMIN_EMAIL");

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
