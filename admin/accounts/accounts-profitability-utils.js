(function (global) {
    "use strict";

    const CONFIRMED = "Confirmed";
    const ACTIVE = "Active";

    function number(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function parseDate(value) {
        if (!value) {
            return null;
        }

        const date = new Date(`${value}T00:00:00`);

        return Number.isNaN(date.getTime())
            ? null
            : date;
    }

    function startOfDay(date) {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
    }

    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    function maxDate(a, b) {
        return a > b ? a : b;
    }

    function minDate(a, b) {
        return a < b ? a : b;
    }

    function overlapDays(startA, endAExclusive, startB, endBExclusive) {
        const start = maxDate(startA, startB);
        const end = minDate(endAExclusive, endBExclusive);

        if (end <= start) {
            return 0;
        }

        return Math.round(
            (end.getTime() - start.getTime()) /
            86400000
        );
    }

    function bookingOverlapNights(booking, periodFrom, periodTo) {
        const checkIn = parseDate(booking.checkin);
        const checkOut = parseDate(booking.checkout);

        if (!checkIn || !checkOut) {
            return 0;
        }

        const periodStart = startOfDay(periodFrom);
        const periodEndExclusive = addDays(
            startOfDay(periodTo),
            1
        );

        return overlapDays(
            checkIn,
            checkOut,
            periodStart,
            periodEndExclusive
        );
    }

    function totalGuests(booking) {
        return (
            number(booking.totalGuests) ||
            number(booking.adults) + number(booking.children)
        );
    }

    function bookingRevenue(booking, periodFrom, periodTo) {
        if ((booking.status || "") !== CONFIRMED) {
            return 0;
        }

        const checkOut = parseDate(booking.checkout);
        const periodStart = startOfDay(periodFrom);
        const periodEnd = startOfDay(periodTo);

        const totalNights = number(booking.nights);

        if (totalNights <= 0) {
            return 0;
        }

        const overlapNights =
            bookingOverlapNights(
                booking,
                periodFrom,
                periodTo
            );

        const accommodation = number(
            booking.accommodation
        );

        const extraGuestFee = number(
            booking.extraGuestFee
        );

        const cleaningFee = number(
            booking.cleaningFee
        );

        const nightlyStayRevenue =
            accommodation + extraGuestFee;

        const nightlyAllocation =
            nightlyStayRevenue *
            (overlapNights / totalNights);

        const cleaningRecognized =
            checkOut &&
            checkOut >= periodStart &&
            checkOut <= periodEnd
                ? cleaningFee
                : 0;

        return (
            nightlyAllocation +
            cleaningRecognized
        );
    }

    function revenueBreakdown(bookings, periodFrom, periodTo) {
        let accommodation = 0;
        let extraGuestFee = 0;
        let cleaningFee = 0;

        bookings.forEach(booking => {
            if ((booking.status || "") !== CONFIRMED) {
                return;
            }

            const checkOut = parseDate(booking.checkout);
            const periodStart = startOfDay(periodFrom);
            const periodEnd = startOfDay(periodTo);

            const totalNights = number(booking.nights);

            if (totalNights <= 0) {
                return;
            }

            const overlapNights =
                bookingOverlapNights(
                    booking,
                    periodFrom,
                    periodTo
                );

            const bookingAccommodation =
                number(booking.accommodation);

            const bookingExtraGuestFee =
                number(booking.extraGuestFee);

            const bookingCleaningFee =
                number(booking.cleaningFee);

            const allocation =
                overlapNights / totalNights;

            accommodation +=
                bookingAccommodation * allocation;

            extraGuestFee +=
                bookingExtraGuestFee * allocation;

            if (
                checkOut &&
                checkOut >= periodStart &&
                checkOut <= periodEnd
            ) {
                cleaningFee += bookingCleaningFee;
            }
        });

        return {
            accommodation,
            extraGuestFee,
            cleaningFee
        };
    }

    function periodCalendarNights(periodFrom, periodTo) {
        const start = startOfDay(periodFrom);
        const end = startOfDay(periodTo);

        if (end < start) {
            return 0;
        }

        return Math.round(
            (end.getTime() - start.getTime()) /
            86400000
        ) + 1;
    }

    function occupiedNights(bookings, periodFrom, periodTo) {
        const ranges = [];

        for (const booking of bookings) {
            if ((booking.status || "") !== CONFIRMED) {
                continue;
            }

            const checkIn = parseDate(booking.checkin);
            const checkOut = parseDate(booking.checkout);

            if (!checkIn || !checkOut) {
                continue;
            }

            const periodStart = startOfDay(periodFrom);
            const periodEndExclusive = addDays(
                startOfDay(periodTo),
                1
            );

            const start = maxDate(
                checkIn,
                periodStart
            );

            const end = minDate(
                checkOut,
                periodEndExclusive
            );

            if (end > start) {
                ranges.push({
                    start,
                    end
                });
            }
        }

        let total = 0;

        for (const range of ranges) {
            total += overlapDays(
                range.start,
                range.end,
                range.start,
                range.end
            );
        }

        return total;
    }

    function expenseTotal(expenses) {
        return expenses
            .filter(
                expense =>
                    (expense.status || ACTIVE) === ACTIVE
            )
            .reduce(
                (sum, expense) =>
                    sum + number(expense.amount),
                0
            );
    }

    function utilityTotal(
        utilityBills,
        bookings,
        periodFrom,
        periodTo
    ) {
        const reportingStart = startOfDay(periodFrom);
        const reportingEnd = startOfDay(periodTo);

        return utilityBills
            .filter(
                bill =>
                    (bill.status || ACTIVE) === ACTIVE
            )
            .reduce(
                (sum, bill) => {
                    const amount = number(bill.amount);
                    const allocationMethod =
                        String(
                            bill.allocationMethod || "None"
                        ).trim();

                    // Property-level utility:
                    // recognise the bill using its bill date.
                    if (allocationMethod === "None") {
                        const billDate =
                            parseDate(bill.billDate);

                        if (
                            billDate &&
                            billDate >= reportingStart &&
                            billDate <= reportingEnd
                        ) {
                            return sum + amount;
                        }

                        return sum;
                    }

                    // Allocate the utility bill across occupied
                    // nights within its billing period.
                    if (
                        allocationMethod ===
                        "Occupied Nights"
                    ) {
                        const billingStart =
                            parseDate(
                                bill.billingPeriodFrom
                            );

                        const billingEnd =
                            parseDate(
                                bill.billingPeriodTo
                            );

                        if (
                            !billingStart ||
                            !billingEnd ||
                            billingEnd < billingStart
                        ) {
                            return sum;
                        }

                        const totalOccupiedNights =
                            occupiedNights(
                                bookings,
                                billingStart,
                                billingEnd
                            );

                        if (totalOccupiedNights <= 0) {
                            return sum;
                        }

                        const allocationStart =
                            maxDate(
                                billingStart,
                                reportingStart
                            );

                        const allocationEnd =
                            minDate(
                                billingEnd,
                                reportingEnd
                            );

                        if (
                            allocationEnd <
                            allocationStart
                        ) {
                            return sum;
                        }

                        const reportingOccupiedNights =
                            occupiedNights(
                                bookings,
                                allocationStart,
                                allocationEnd
                            );

                        return (
                            sum +
                            amount *
                                (
                                    reportingOccupiedNights /
                                    totalOccupiedNights
                                )
                        );
                    }

                    // Direct Booking:
                    // preserve the existing behaviour for a valid
                    // booking-linked utility. A later test will
                    // explicitly cover cross-period behaviour.
                    if (
                        allocationMethod ===
                        "Direct Booking"
                    ) {
                        return sum + amount;
                    }

                    return sum;
                },
                0
            );
    }

    function calculateProfitability({
        bookings = [],
        expenses = [],
        utilityBills = [],
        periodFrom,
        periodTo
    }) {
        if (!periodFrom || !periodTo) {
            throw new Error(
                "periodFrom and periodTo are required."
            );
        }

        const revenue = bookings.reduce(
            (sum, booking) =>
                sum +
                bookingRevenue(
                    booking,
                    periodFrom,
                    periodTo
                ),
            0
        );

        const expensesTotal =
            expenseTotal(expenses);

        const utilitiesTotal =
            utilityTotal(utilityBills, bookings, periodFrom, periodTo);

        const netProfit =
            revenue -
            expensesTotal -
            utilitiesTotal;

        const bookedNights =
            occupiedNights(
                bookings,
                periodFrom,
                periodTo
            );

        const calendarNights =
            periodCalendarNights(
                periodFrom,
                periodTo
            );

        const occupancy =
            calendarNights > 0
                ? bookedNights / calendarNights
                : 0;

        const profitPerNight =
            bookedNights > 0
                ? netProfit / bookedNights
                : 0;

        const profitMargin =
            revenue > 0
                ? netProfit / revenue
                : 0;

        const confirmedBookings =
            bookings.filter(
                booking =>
                    booking.status === CONFIRMED
            );

        const guestCount =
            confirmedBookings.reduce(
                (sum, booking) =>
                    sum + totalGuests(booking),
                0
            );

        const guestNights =
            confirmedBookings.reduce(
                (sum, booking) =>
                    sum +
                    totalGuests(booking) *
                    bookingOverlapNights(
                        booking,
                        periodFrom,
                        periodTo
                    ),
                0
            );

        return {
            revenue,
            expenses: expensesTotal,
            utilities: utilitiesTotal,
            netProfit,
            bookedNights,
            calendarNights,
            occupancy,
            profitPerNight,
            profitMargin,
            confirmedBookings:
                confirmedBookings.length,
            totalGuests: guestCount,
            guestNights,
            revenuePerGuest:
                guestCount > 0
                    ? revenue / guestCount
                    : 0,
            revenuePerGuestNight:
                guestNights > 0
                    ? revenue / guestNights
                    : 0
        };
    }

    global.AccountsProfitabilityUtils = {
        bookingRevenue,
        revenueBreakdown,
        bookingOverlapNights,
        periodCalendarNights,
        occupiedNights,
        calculateProfitability
    };

})(typeof window !== "undefined" ? window : globalThis);






