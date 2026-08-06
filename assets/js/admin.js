/*
====================================
Ja-Ela Serenity Villa
Admin Dashboard
====================================
*/

const tableBody = document.getElementById("bookingTableBody");
const totalBookings = document.getElementById("totalBookings");
const pendingBookings = document.getElementById("pendingBookings");
const confirmedBookings = document.getElementById("confirmedBookings");
const totalRevenue = document.getElementById("totalRevenue");


loadBookings();


async function loadBookings() {

    tableBody.innerHTML = "";

    let total = 0;
    let pending = 0;
    let confirmed = 0;
    let revenue = 0;

    try {

        const snapshot = await db
            .collection("bookings")
            .orderBy("createdAt", "desc")
            .get();

        snapshot.forEach(doc => {

            const booking = doc.data();

            total++;

            if (booking.status === "Pending")
                pending++;

            if (booking.status === "Confirmed")
                confirmed++;

            revenue += booking.total || 0;

            addBookingRow(doc.id, booking);

        });

        totalBookings.textContent = total;
        pendingBookings.textContent = pending;
        confirmedBookings.textContent = confirmed;
        totalRevenue.textContent = "$" + revenue;

    }
    catch (error) {

        console.error(error);

    }

}
function addBookingRow(id, booking) {

    const checkin = booking.checkin;

    const checkout = booking.checkout;

    const nights =
        calculateNights(checkin, checkout);

    tableBody.innerHTML += `

<tr>

<td>${id.substring(0,8)}</td>

<td>

<strong>${booking.guestName}</strong><br>

${booking.email}

</td>

<td>${checkin}</td>

<td>${nights}</td>

<td>$${booking.total}</td>

<td>${booking.status}</td>

<td>

<button onclick="viewBooking('${id}')">

View

</button>

</td>

</tr>

`;

}
function calculateNights(checkin, checkout) {

    if (!checkin || !checkout)
        return 0;

    let start;
    let end;

    // dd/mm/yyyy
    if (checkin.includes("/")) {

        const c = checkin.split("/");
        const o = checkout.split("/");

        start = new Date(c[2], c[1] - 1, c[0]);
        end = new Date(o[2], o[1] - 1, o[0]);

    }

    // yyyy-mm-dd
    else {

        start = new Date(checkin);
        end = new Date(checkout);

    }

    return Math.ceil(
        (end - start) / (1000 * 60 * 60 * 24)
    );

}
async function viewBooking(id){

    const booking =
        await db.collection("bookings")
        .doc(id)
        .get();

    const data = booking.data();

    document.getElementById("bookingDetails").innerHTML = `

        <p><strong>Reference:</strong> ${id}</p>

        <p><strong>Name:</strong> ${data.guestName}</p>

        <p><strong>Email:</strong> ${data.email}</p>

        <p><strong>Phone:</strong> ${data.phone}</p>

        <p><strong>Country:</strong> ${data.country}</p>

        <hr>

        <p><strong>Check-in:</strong> ${data.checkin}</p>

        <p><strong>Check-out:</strong> ${data.checkout}</p>

        <p><strong>Adults:</strong> ${data.adults}</p>

        <p><strong>Children:</strong> ${data.children}</p>

        <p><strong>Arrival:</strong> ${data.arrivalTime || "-"}</p>

        <hr>

        <p><strong>Special Requests</strong></p>

        <p>${data.specialRequests || "-"}</p>

        <hr>

        <p>

            <strong>Status:</strong>

            ${data.status}

        </p>

    `;

    document.getElementById("bookingModal").style.display="block";

}
function closeModal(){

    document.getElementById("bookingModal")
    .style.display="none";

}
async function confirmBooking() {

    if (!window.selectedBookingId) return;

    try {

        await db.collection("bookings")
            .doc(window.selectedBookingId)
            .update({

                status: "Confirmed"

            });

        alert("Booking confirmed.");

        closeModal();

        loadBookings();

    } catch (error) {

        console.error(error);

        alert("Unable to confirm booking.");

    }

}

async function deleteBooking() {

    if (!window.selectedBookingId) return;

    if (!confirm("Delete this booking?"))
        return;

    try {

        await db.collection("bookings")
            .doc(window.selectedBookingId)
            .delete();

        alert("Booking deleted.");

        closeModal();

        loadBookings();

    } catch (error) {

        console.error(error);

        alert("Unable to delete booking.");

    }

}
document
.getElementById("confirmBookingBtn")
.addEventListener("click", confirmBooking);

document
.getElementById("deleteBookingBtn")
.addEventListener("click", deleteBooking);

