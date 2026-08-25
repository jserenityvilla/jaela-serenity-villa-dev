/*
====================================
Ja-Ela Serenity Villa
Admin Dashboard
====================================
*/

let allBookings = [];
let selectedBookingId = null;
let selectedBookingStatus = null;
let activeFilter = "all";


// ======================================================
// Page Initialisation
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Admin dashboard loaded.");

    attachSearch();

    attachModalButtons();

    attachDashboardFilters();

    loadBookings();

});


// ======================================================
// Load Bookings
// ======================================================

async function loadBookings() {

    const tableBody =
        document.getElementById("bookingTableBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="7">
                Loading bookings...
            </td>
        </tr>
    `;

    try {

        const snapshot = await db
            .collection("bookings")
            .orderBy("createdAt", "desc")
            .get();

        allBookings = [];

        snapshot.forEach(doc => {

            allBookings.push({

                id: doc.id,

                ...doc.data()

            });

        });

        updateDashboardStats(allBookings);

        applyFilters();

        console.log(
            "Bookings loaded:",
            allBookings.length
        );

    }

    catch (error) {

        console.error(
            "Unable to load bookings:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    Unable to load bookings.
                </td>
            </tr>
        `;

    }

}


// ======================================================
// Update Dashboard Statistics
// ======================================================

function updateDashboardStats(bookings) {

    let pending = 0;

    let confirmed = 0;

    let cancelled = 0;

    let revenue = 0;


    bookings.forEach(booking => {

        const status =
            booking.status || "Pending";


        if (status === "Pending") {

            pending++;

        }


        if (status === "Confirmed") {

            confirmed++;

        }


        if (status === "Cancelled") {

            cancelled++;

        }


        revenue +=
            Number(booking.total) || 0;

    });


    document.getElementById(
        "totalBookings"
    ).textContent =
        bookings.length;


    document.getElementById(
        "pendingBookings"
    ).textContent =
        pending;


    document.getElementById(
        "confirmedBookings"
    ).textContent =
        confirmed;


    const cancelledElement =
        document.getElementById(
            "cancelledBookings"
        );

    if (cancelledElement) {

        cancelledElement.textContent =
            cancelled;

    }


    document.getElementById(
        "totalRevenue"
    ).textContent =
        "AUD $" + revenue.toFixed(2);

}


// ======================================================
// Dashboard Tile Filters
// ======================================================

function attachDashboardFilters() {

    const totalTile =
        document.getElementById(
            "totalBookings"
        );

    const pendingTile =
        document.getElementById(
            "pendingBookings"
        );

    const confirmedTile =
        document.getElementById(
            "confirmedBookings"
        );

    const cancelledTile =
        document.getElementById(
            "cancelledBookings"
        );


    if (totalTile) {

        totalTile.parentElement
            .addEventListener(
                "click",
                () => {

                    setDashboardFilter(
                        "all"
                    );

                }
            );

    }


    if (pendingTile) {

        pendingTile.parentElement
            .addEventListener(
                "click",
                () => {

                    setDashboardFilter(
                        "Pending"
                    );

                }
            );

    }


    if (confirmedTile) {

        confirmedTile.parentElement
            .addEventListener(
                "click",
                () => {

                    setDashboardFilter(
                        "Confirmed"
                    );

                }
            );

    }


    if (cancelledTile) {

        cancelledTile.parentElement
            .addEventListener(
                "click",
                () => {

                    setDashboardFilter(
                        "Cancelled"
                    );

                }
            );

    }

}


// ======================================================
// Set Dashboard Filter
// ======================================================

function setDashboardFilter(filter) {

    activeFilter = filter;


    const searchField =
        document.getElementById(
            "searchBookings"
        );

    if (searchField) {

        searchField.value = "";

    }


    updateActiveTile();

    applyFilters();

}


// ======================================================
// Apply Filters
// ======================================================

function applyFilters() {

    let filteredBookings =
        [...allBookings];


    if (activeFilter !== "all") {

        filteredBookings =
            filteredBookings.filter(
                booking => {

                    return (
                        booking.status ||
                        "Pending"
                    ) === activeFilter;

                }
            );

    }


    renderBookings(
        filteredBookings
    );

}


// ======================================================
// Highlight Active Tile
// ======================================================

function updateActiveTile() {

    const tiles =
        document.querySelectorAll(
            ".stat-card"
        );


    tiles.forEach(tile => {

        tile.classList.remove(
            "active-filter"
        );

    });


    let selectedId = null;


    if (activeFilter === "all") {

        selectedId =
            "totalBookings";

    }


    if (activeFilter === "Pending") {

        selectedId =
            "pendingBookings";

    }


    if (activeFilter === "Confirmed") {

        selectedId =
            "confirmedBookings";

    }


    if (activeFilter === "Cancelled") {

        selectedId =
            "cancelledBookings";

    }


    if (!selectedId) {

        return;

    }


    const selectedElement =
        document.getElementById(
            selectedId
        );


    if (selectedElement) {

        selectedElement.parentElement
            .classList.add(
                "active-filter"
            );

    }

}


// ======================================================
// Render Bookings
// ======================================================

function renderBookings(bookings) {

    const tableBody =
        document.getElementById(
            "bookingTableBody"
        );


    if (bookings.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    No bookings found.
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML = "";


    bookings.forEach(booking => {

        addBookingRow(
            booking.id,
            booking
        );

    });

}


// ======================================================
// Add Booking Row
// ======================================================

function addBookingRow(id, booking) {

    const checkin =
        booking.checkin || "-";


    const nights =
        Number(booking.nights) ||
        calculateNights(
            checkin,
            booking.checkout || "-"
        );


    const total =
        Number(booking.total) || 0;


    const status =
        booking.status || "Pending";


    const reference =
        booking.bookingReference ||
        id.substring(0, 8);


    const statusClass =
        status.toLowerCase();


    const row =
        document.createElement("tr");


    row.innerHTML = `

        <td>

            <strong>
                ${reference}
            </strong>

        </td>


        <td>

            <strong>
                ${booking.guestName || "-"}
            </strong>

            <br>

            ${booking.email || "-"}

        </td>


        <td>
            ${checkin}
        </td>


        <td>
            ${nights}
        </td>


        <td>
            AUD $${total.toFixed(2)}
        </td>


        <td>

            <span
                class="booking-status status-${statusClass}">

                ${status}

            </span>

        </td>


        <td>

            <button
                onclick="viewBooking('${id}')">

                View

            </button>

        </td>

    `;


    document
        .getElementById(
            "bookingTableBody"
        )
        .appendChild(row);

}


// ======================================================
// Calculate Nights
// ======================================================

function calculateNights(
    checkin,
    checkout
) {

    if (!checkin || !checkout) {

        return 0;

    }


    let start;

    let end;


    if (checkin.includes("/")) {

        const c =
            checkin.split("/");

        const o =
            checkout.split("/");


        start =
            new Date(
                c[2],
                c[1] - 1,
                c[0]
            );


        end =
            new Date(
                o[2],
                o[1] - 1,
                o[0]
            );

    }
    else {

        start =
            new Date(checkin);

        end =
            new Date(checkout);

    }


    return Math.ceil(
        (end - start) /
        (1000 * 60 * 60 * 24)
    );

}


// ======================================================
// View Booking
// ======================================================

async function viewBooking(id) {

    try {

        selectedBookingId = id;

        window.selectedBookingId = id;


        const doc =
            await db
                .collection("bookings")
                .doc(id)
                .get();


        if (!doc.exists) {

            alert(
                "Booking could not be found."
            );

            return;

        }


        const data =
            doc.data();


        selectedBookingStatus =
            data.status || "Pending";


        const reference =
            data.bookingReference ||
            id;


        document.getElementById(
            "bookingDetails"
        ).innerHTML = `

            <p>
                <strong>Booking Reference:</strong>
                ${reference}
            </p>

            <p>
                <strong>Name:</strong>
                ${data.guestName || "-"}
            </p>

            <p>
                <strong>Email:</strong>
                ${data.email || "-"}
            </p>

            <p>
                <strong>Phone:</strong>
                ${data.phone || "-"}
            </p>

            <p>
                <strong>Country:</strong>
                ${data.country || "-"}
            </p>

            <hr>

            <p>
                <strong>Check-in:</strong>
                ${data.checkin || "-"}
            </p>

            <p>
                <strong>Check-out:</strong>
                ${data.checkout || "-"}
            </p>

            <p>
                <strong>Nights:</strong>
                ${data.nights || "-"}
            </p>

            <p>
                <strong>Adults:</strong>
                ${data.adults || 0}
            </p>

            <p>
                <strong>Children:</strong>
                ${data.children || 0}
            </p>

            <p>
                <strong>Arrival Time:</strong>
                ${data.arrivalTime || "-"}
            </p>

            <hr>

            <p>
                <strong>Special Requests:</strong>
            </p>

            <p>
                ${data.specialRequests || "-"}
            </p>

            <hr>

            <p>
                <strong>Total:</strong>
                AUD $${(
                    Number(data.total) || 0
                ).toFixed(2)}
            </p>

            <p>
                <strong>Status:</strong>
                ${data.status || "Pending"}
            </p>

        `;


        updateModalButtons();


        document.getElementById(
            "bookingModal"
        ).style.display = "block";

    }

    catch (error) {

        console.error(
            "Unable to load booking:",
            error
        );

        alert(
            "Unable to load booking details."
        );

    }

}


// ======================================================
// Update Modal Buttons
// ======================================================

function updateModalButtons() {

    const confirmButton =
        document.getElementById(
            "confirmBookingBtn"
        );


    const cancelButton =
        document.getElementById(
            "deleteBookingBtn"
        );


    if (!confirmButton ||
        !cancelButton) {

        return;

    }


    // ------------------------------------------
    // Pending
    // ------------------------------------------

    if (
        selectedBookingStatus ===
        "Pending"
    ) {

        confirmButton.disabled =
            false;

        cancelButton.disabled =
            false;

        confirmButton.textContent =
            "Confirm Booking";

        cancelButton.textContent =
            "Cancel Booking";

    }


    // ------------------------------------------
    // Confirmed
    // ------------------------------------------

    else if (
        selectedBookingStatus ===
        "Confirmed"
    ) {

        confirmButton.disabled =
            true;

        cancelButton.disabled =
            false;

        confirmButton.textContent =
            "Already Confirmed";

        cancelButton.textContent =
            "Cancel Booking";

    }


    // ------------------------------------------
    // Cancelled
    // ------------------------------------------

    else if (
        selectedBookingStatus ===
        "Cancelled"
    ) {

        confirmButton.disabled =
            true;

        cancelButton.disabled =
            true;

        confirmButton.textContent =
            "Booking Cancelled";

        cancelButton.textContent =
            "Booking Cancelled";

    }

}


// ======================================================
// Close Modal
// ======================================================

function closeModal() {

    document.getElementById(
        "bookingModal"
    ).style.display = "none";


    selectedBookingId = null;

    selectedBookingStatus = null;

    window.selectedBookingId = null;

}


// ======================================================
// Confirm Booking
// ======================================================

async function confirmBooking() {

    const id =
        selectedBookingId ||
        window.selectedBookingId;


    if (!id) {

        alert(
            "No booking selected."
        );

        return;

    }


    if (
        selectedBookingStatus !==
        "Pending"
    ) {

        return;

    }


    try {

        await db
            .collection("bookings")
            .doc(id)
            .update({

                status: "Confirmed"

            });


        alert(
            "Booking confirmed successfully."
        );


        closeModal();

        loadBookings();

    }

    catch (error) {

        console.error(
            "Unable to confirm booking:",
            error
        );

        alert(
            "Unable to confirm booking."
        );

    }

}


// ======================================================
// Cancel Booking
// ======================================================

async function deleteBooking() {

    const id =
        selectedBookingId ||
        window.selectedBookingId;


    if (!id) {

        alert(
            "No booking selected."
        );

        return;

    }


    if (
        selectedBookingStatus ===
        "Cancelled"
    ) {

        return;

    }


    if (!confirm(
        "Cancel this booking?"
    )) {

        return;

    }


    try {

        await db
            .collection("bookings")
            .doc(id)
            .update({

                status: "Cancelled"

            });


        alert(
            "Booking cancelled."
        );


        closeModal();

        loadBookings();

    }

    catch (error) {

        console.error(
            "Unable to cancel booking:",
            error
        );

        alert(
            "Unable to cancel booking."
        );

    }

}


// ======================================================
// Search Bookings
// ======================================================

function attachSearch() {

    const searchField =
        document.getElementById(
            "searchBookings"
        );


    if (!searchField) {

        return;

    }


    searchField.addEventListener(
        "input",
        function () {

            const searchTerm =
                this.value
                    .trim()
                    .toLowerCase();


            let filteredBookings =
                [...allBookings];


            if (
                activeFilter !==
                "all"
            ) {

                filteredBookings =
                    filteredBookings.filter(
                        booking => {

                            return (
                                booking.status ||
                                "Pending"
                            ) === activeFilter;

                        }
                    );

            }


            if (searchTerm) {

                filteredBookings =
                    filteredBookings.filter(
                        booking => {

                            const reference =
                                (
                                    booking.bookingReference ||
                                    ""
                                ).toLowerCase();


                            const guestName =
                                (
                                    booking.guestName ||
                                    ""
                                ).toLowerCase();


                            const email =
                                (
                                    booking.email ||
                                    ""
                                ).toLowerCase();


                            return (

                                reference.includes(
                                    searchTerm
                                )

                                ||

                                guestName.includes(
                                    searchTerm
                                )

                                ||

                                email.includes(
                                    searchTerm
                                )

                            );

                        }
                    );

            }


            renderBookings(
                filteredBookings
            );

        }
    );

}


// ======================================================
// Modal Buttons
// ======================================================

function attachModalButtons() {

    const confirmButton =
        document.getElementById(
            "confirmBookingBtn"
        );


    const cancelButton =
        document.getElementById(
            "deleteBookingBtn"
        );


    if (confirmButton) {

        confirmButton.addEventListener(
            "click",
            confirmBooking
        );

    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            deleteBooking
        );

    }

}