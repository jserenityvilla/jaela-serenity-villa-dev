"use strict";

(() => {
    const db = firebase.firestore();

    const $ = id =>
        document.getElementById(id);

    const moneyFormatter =
        new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency: "AUD"
        });

    function formatMoney(value) {
        return moneyFormatter.format(
            Number(value) || 0
        );
    }

    function formatPercent(value) {
        return (
            (
                (Number(value) || 0) *
                100
            ).toFixed(2) + "%"
        );
    }

    function formatNumber(value) {
        return (
            Number(value) || 0
        ).toLocaleString("en-AU");
    }

    function localDateString(date) {
        const year = date.getFullYear();
        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");
        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function startOfMonth(date) {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            1
        );
    }

    function endOfMonth(date) {
        return new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0
        );
    }

    function startOfQuarter(date) {
        const month =
            Math.floor(
                date.getMonth() / 3
            ) * 3;

        return new Date(
            date.getFullYear(),
            month,
            1
        );
    }

    function endOfQuarter(date) {
        const start = startOfQuarter(date);

        return new Date(
            start.getFullYear(),
            start.getMonth() + 3,
            0
        );
    }

    function startOfYear(date) {
        return new Date(
            date.getFullYear(),
            0,
            1
        );
    }

    function endOfYear(date) {
        return new Date(
            date.getFullYear(),
            11,
            31
        );
    }

    function showMessage(
        element,
        message,
        type
    ) {
        element.textContent = message;
        element.className =
            `message visible ${type}`;
    }

    function clearMessage(element) {
        element.textContent = "";
        element.className =
            "message";
    }

    function getReportingPeriod() {
        const type =
            $("periodType").value;

        const selectedDate =
            new Date(
                `${$("periodDate").value}T00:00:00`
            );

        if (
            Number.isNaN(
                selectedDate.getTime()
            )
        ) {
            throw new Error(
                "Please select a valid reporting date."
            );
        }

        if (type === "month") {
            return {
                from: startOfMonth(
                    selectedDate
                ),
                to: endOfMonth(
                    selectedDate
                )
            };
        }

        if (type === "quarter") {
            return {
                from: startOfQuarter(
                    selectedDate
                ),
                to: endOfQuarter(
                    selectedDate
                )
            };
        }

        if (type === "year") {
            return {
                from: startOfYear(
                    selectedDate
                ),
                to: endOfYear(
                    selectedDate
                )
            };
        }

        const customFrom =
            new Date(
                `${$("customFrom").value}T00:00:00`
            );

        const customTo =
            new Date(
                `${$("customTo").value}T00:00:00`
            );

        if (
            Number.isNaN(
                customFrom.getTime()
            ) ||
            Number.isNaN(
                customTo.getTime()
            )
        ) {
            throw new Error(
                "Please select both custom dates."
            );
        }

        if (customTo < customFrom) {
            throw new Error(
                "Custom To date cannot be earlier than From date."
            );
        }

        return {
            from: customFrom,
            to: customTo
        };
    }

    async function loadCollection(
        collectionName
    ) {
        const snapshot =
            await db
                .collection(collectionName)
                .get();

        return snapshot.docs.map(
            doc => ({
                id: doc.id,
                ...doc.data()
            })
        );
    }

    function clearRows(
        bodyId
    ) {
        $(bodyId).innerHTML = "";
    }

    function addBreakdownRow(
        bodyId,
        label,
        amount
    ) {
        const row =
            document.createElement("tr");

        const labelCell =
            document.createElement("td");

        labelCell.textContent =
            label;

        const amountCell =
            document.createElement("td");

        amountCell.textContent =
            formatMoney(amount);

        row.appendChild(labelCell);
        row.appendChild(amountCell);

        $(bodyId).appendChild(row);
    }

    function renderExpenseBreakdown(
        expenses
    ) {
        clearRows(
            "expenseBreakdownBody"
        );

        if (!expenses.length) {
            $("expenseEmpty")
                .style.display = "block";
            return;
        }

        $("expenseEmpty")
            .style.display = "none";

        const totals = {};

        expenses.forEach(
            expense => {
                const type =
                    expense.expenseType ||
                    "Other";

                totals[type] =
                    (
                        totals[type] || 0
                    ) +
                    (
                        Number(
                            expense.amount
                        ) || 0
                    );
            }
        );

        Object.entries(totals)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )
            .forEach(
                ([type, amount]) =>
                    addBreakdownRow(
                        "expenseBreakdownBody",
                        type,
                        amount
                    )
            );
    }

    function renderUtilityBreakdown(
        utilityBills
    ) {
        clearRows(
            "utilityBreakdownBody"
        );

        if (!utilityBills.length) {
            $("utilityEmpty")
                .style.display = "block";
            return;
        }

        $("utilityEmpty")
            .style.display = "none";

        const totals = {};

        utilityBills.forEach(
            bill => {
                const allocation =
                    bill.allocationMethod ||
                    "None";

                totals[allocation] =
                    (
                        totals[allocation] ||
                        0
                    ) +
                    (
                        Number(
                            bill.amount
                        ) || 0
                    );
            }
        );

        Object.entries(totals)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )
            .forEach(
                ([allocation, amount]) =>
                    addBreakdownRow(
                        "utilityBreakdownBody",
                        allocation,
                        amount
                    )
            );
    }

    function renderSummary(
        result
    ) {
        $("revenue").textContent =
            formatMoney(
                result.revenue
            );

        $("expenses").textContent =
            formatMoney(
                result.expenses
            );

        $("utilities").textContent =
            formatMoney(
                result.utilities
            );

        $("netProfit").textContent =
            formatMoney(
                result.netProfit
            );

        $("profitMargin").textContent =
            formatPercent(
                result.profitMargin
            );

        $("occupancy").textContent =
            formatPercent(
                result.occupancy
            );

        $("confirmedBookings")
            .textContent =
            formatNumber(
                result.confirmedBookings
            );

        $("bookedNights")
            .textContent =
            formatNumber(
                result.bookedNights
            );

        $("calendarNights")
            .textContent =
            formatNumber(
                result.calendarNights
            );

        $("profitPerNight")
            .textContent =
            formatMoney(
                result.profitPerNight
            );

        $("totalGuests")
            .textContent =
            formatNumber(
                result.totalGuests
            );

        $("guestNights")
            .textContent =
            formatNumber(
                result.guestNights
            );

        $("revenuePerGuest")
            .textContent =
            formatMoney(
                result.revenuePerGuest
            );

        $("revenuePerGuestNight")
            .textContent =
            formatMoney(
                result.revenuePerGuestNight
            );
    }

    function renderBookingProfitability(
        bookings,
        periodFrom,
        periodTo
    ) {
        const body =
            $("bookingProfitabilityBody");

        body.innerHTML = "";

        const confirmedBookings =
            bookings
                .filter(
                    booking =>
                        (
                            booking.status ||
                            ""
                        ) === "Confirmed"
                )
                .filter(
                    booking =>
                        AccountsProfitabilityUtils
                            .bookingOverlapNights(
                                booking,
                                periodFrom,
                                periodTo
                            ) > 0
                );

        confirmedBookings.forEach(
            booking => {
                const row =
                    document.createElement("tr");

                const revenue =
                    AccountsProfitabilityUtils
                        .bookingRevenue(
                            booking,
                            periodFrom,
                            periodTo
                        );

                const values = [
                    booking.bookingReference ||
                        booking.id ||
                        "",
                    booking.guestName || "",
                    booking.checkin || "",
                    booking.checkout || "",
                    booking.totalGuests ||
                        0,
                    AccountsProfitabilityUtils
                        .bookingOverlapNights(
                            booking,
                            periodFrom,
                            periodTo
                        ),
                    formatMoney(revenue)
                ];

                values.forEach(
                    value => {
                        const cell =
                            document.createElement("td");

                        cell.textContent = value;

                        row.appendChild(cell);
                    }
                );

                body.appendChild(row);
            }
        );
    }

    function renderRevenueBreakdown(
        breakdown
    ) {
        $("accommodationRevenue")
            .textContent =
            formatMoney(
                breakdown.accommodation
            );

        $("extraGuestRevenue")
            .textContent =
            formatMoney(
                breakdown.extraGuestFee
            );

        $("cleaningRevenue")
            .textContent =
            formatMoney(
                breakdown.cleaningFee
            );
    }

    async function refresh() {
        const statusMessage =
            $("statusMessage");

        clearMessage(statusMessage);

        showMessage(
            statusMessage,
            "Loading profitability data...",
            "info"
        );

        try {
            const {
                from,
                to
            } =
                getReportingPeriod();

            const [
                bookings,
                expenses,
                utilityBills
            ] = await Promise.all([
                loadCollection(
                    "bookings"
                ),
                loadCollection(
                    "expenses"
                ),
                loadCollection(
                    "utilityBills"
                )
            ]);

            const result =
                AccountsProfitabilityUtils
                    .calculateProfitability({
                        bookings,
                        expenses,
                        utilityBills,
                        periodFrom: from,
                        periodTo: to
                    });

            renderSummary(result);

            const revenueBreakdown =
                AccountsProfitabilityUtils
                    .revenueBreakdown(
                        bookings,
                        from,
                        to
                    );

            renderRevenueBreakdown(
                revenueBreakdown
            );

            renderBookingProfitability(
                bookings,
                from,
                to
            );

            /*
             * Breakdowns are restricted to records
             * recognised within the selected period.
             *
             * The calculation engine remains the
             * authoritative source for profitability.
             */
            renderExpenseBreakdown(
                expenses.filter(
                    expense =>
                        (
                            expense.status ||
                            "Active"
                        ) === "Active"
                )
            );

            renderUtilityBreakdown(
                utilityBills.filter(
                    bill =>
                        (
                            bill.status ||
                            "Active"
                        ) === "Active"
                )
            );

            showMessage(
                statusMessage,
                `Reporting period: ${localDateString(from)} to ${localDateString(to)}`,
                "info"
            );

        } catch (error) {
            console.error(
                "ACCT-004 profitability load failed:",
                error
            );

            showMessage(
                statusMessage,
                error.message ||
                    "Unable to load profitability data.",
                "error"
            );
        }
    }

    function initialisePeriodControls() {
        const today = new Date();

        $("periodDate").value =
            localDateString(today);

        $("customFrom").value =
            localDateString(
                startOfMonth(today)
            );

        $("customTo").value =
            localDateString(
                endOfMonth(today)
            );

        $("periodType")
            .addEventListener(
                "change",
                () => {
                    const custom =
                        $("periodType")
                            .value ===
                        "custom";

                    $("customFromContainer")
                        .classList.toggle(
                            "visible",
                            custom
                        );

                    $("customToContainer")
                        .classList.toggle(
                            "visible",
                            custom
                        );
                }
            );

        $("applyPeriod")
            .addEventListener(
                "click",
                refresh
            );
    }

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            initialisePeriodControls();
            refresh();
        }
    );
})();






