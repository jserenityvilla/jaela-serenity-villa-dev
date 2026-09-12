const admin = require("../functions/node_modules/firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

admin.initializeApp({
    projectId: "ja-ela-serenity-villa-test"
});

const db = admin.firestore();

const expenses = [
    {
        id: "dev-expense-cleaning-001",
        expenseDate: "2026-09-01",
        categoryName: "Cleaning",
        amount: 80.00,
        currency: "AUD",
        description: "DEV test villa cleaning",
        supplier: "DEV Cleaner",
        reference: "DEV-EXP-001",
        expenseType: "Variable Property",
        bookingId: null,
        allocationMethod: "None",
        status: "Active"
    },
    {
        id: "dev-expense-laundry-001",
        expenseDate: "2026-09-03",
        categoryName: "Laundry",
        amount: 45.50,
        currency: "AUD",
        description: "DEV test laundry expense",
        supplier: "DEV Laundry",
        reference: "DEV-EXP-002",
        expenseType: "Variable Property",
        bookingId: null,
        allocationMethod: "None",
        status: "Active"
    },
    {
        id: "dev-expense-maintenance-001",
        expenseDate: "2026-09-05",
        categoryName: "Maintenance",
        amount: 125.00,
        currency: "AUD",
        description: "DEV test maintenance expense",
        supplier: "DEV Maintenance",
        reference: "DEV-EXP-003",
        expenseType: "Fixed Property",
        bookingId: null,
        allocationMethod: "None",
        status: "Active"
    }
];

async function seedExpenses() {

    const categoriesSnapshot =
        await db
            .collection("categories")
            .where("categoryType", "==", "Expense")
            .get();

    const categories = {};

    categoriesSnapshot.forEach(doc => {
        categories[doc.data().name] = doc.id;
    });

    const batch = db.batch();

    for (const expense of expenses) {

        const categoryId =
            categories[expense.categoryName];

        if (!categoryId) {
            throw new Error(
                `Expense category not found: ${expense.categoryName}`
            );
        }

        const ref =
            db.collection("expenses").doc(expense.id);

        batch.set(ref, {
            expenseDate: expense.expenseDate,
            categoryId,
            amount: expense.amount,
            currency: expense.currency,
            description: expense.description,
            supplier: expense.supplier,
            reference: expense.reference,
            expenseType: expense.expenseType,
            bookingId: expense.bookingId,
            allocationMethod: expense.allocationMethod,
            status: expense.status,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: "DEV-SEED",
            updatedBy: "DEV-SEED"
        });
    }

    await batch.commit();

    console.log(
        `SUCCESS: ${expenses.length} DEV expense records seeded.`
    );
}

seedExpenses()
    .catch(error => {
        console.error("Expense seed failed:");
        console.error(error);
        process.exitCode = 1;
    });


