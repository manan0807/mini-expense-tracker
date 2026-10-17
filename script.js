
const form = document.getElementById("expense-form");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const expenseDateInput = document.getElementById("expense-date");

const totalDisplay = document.getElementById("total");
const totalLabel = document.getElementById("total-label");
const expenseList = document.getElementById("expense-list");
const expenseCount = document.getElementById("expense-count");

const viewMode = document.getElementById("view-mode");
const filterDate = document.getElementById("filter-date");
const filterMonth = document.getElementById("filter-month");
const dateLabel = document.getElementById("date-label");
const monthLabel = document.getElementById("month-label");

const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");
const formHeading = document.getElementById("form-heading");

const STORAGE_KEY = "expenses";

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function createId() {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadExpenses() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

        if (!Array.isArray(saved)) {
            return [];
        }

        let migrated = false;

        const result = saved
            .filter(expense =>
                expense &&
                typeof expense.title === "string" &&
                Number.isFinite(Number(expense.amount)) &&
                Number(expense.amount) > 0
            )
            .map(expense => {
                const updated = {
                    ...expense,
                    id: expense.id || createId(),
                    category: expense.category || "Other",
                    date: expense.date || getToday(),
                    amount: Number(expense.amount)
                };

                if (!expense.id || !expense.date) {
                    migrated = true;
                }

                return updated;
            });

        if (migrated) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        }

        return result;
    } catch (error) {
        alert("Saved expenses could not be read. Check the browser's local storage.");
        return [];
    }
}

let expenses = loadExpenses();
let editingId = null;

function saveExpenses() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
        return true;
    } catch (error) {
        alert("Could not save expenses. Browser storage may be unavailable or full.");
        return false;
    }
}

function resetForm() {
    form.reset();
    expenseDateInput.value = getToday();
    editingId = null;
    formHeading.textContent = "Add Expense";
    saveButton.textContent = "Add Expense";
    cancelButton.hidden = true;
}

function renderExpenses() {
    expenseList.innerHTML = "";

    const mode = viewMode.value;
    const selectedPeriod = mode === "daily"
        ? filterDate.value
        : filterMonth.value;

    totalLabel.textContent = mode === "daily"
        ? "Total Expenses for Selected Day"
        : "Total Expenses for Selected Month";

    const filteredExpenses = expenses
        .filter(expense => {
            if (!selectedPeriod || !expense.date) {
                return false;
            }

            return mode === "daily"
                ? expense.date === selectedPeriod
                : expense.date.startsWith(selectedPeriod);
        })
        .sort((a, b) => {
            if (a.date !== b.date) {
                return b.date.localeCompare(a.date);
            }

            return b.id.localeCompare(a.id);
        });

    const total = filteredExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
    );

    totalDisplay.textContent = "₹" + total.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    expenseCount.textContent =
        `${filteredExpenses.length} expense${filteredExpenses.length === 1 ? "" : "s"}`;

    if (filteredExpenses.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "No expenses found for this period.";
        expenseList.appendChild(empty);
        return;
    }

    filteredExpenses.forEach(expense => {
        const item = document.createElement("li");
        item.className = "expense-item";

        const details = document.createElement("div");
        details.className = "expense-details";

        const name = document.createElement("strong");
        name.textContent = expense.title;

        const info = document.createElement("small");
        info.textContent = `${expense.category} · ${expense.date}`;

        details.append(name, info);

        const amount = document.createElement("span");
        amount.className = "expense-amount";
        amount.textContent = "₹" + expense.amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const actions = document.createElement("div");
        actions.className = "item-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "edit-button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editExpense(expense.id));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteExpense(expense.id));

        actions.append(editButton, deleteButton);
        item.append(details, amount, actions);
        expenseList.appendChild(item);
    });
}

function editExpense(id) {
    const expense = expenses.find(entry => entry.id === id);

    if (!expense) {
        return;
    }

    editingId = id;
    titleInput.value = expense.title;
    amountInput.value = expense.amount;
    categoryInput.value = expense.category;
    expenseDateInput.value = expense.date;

    formHeading.textContent = "Edit Expense";
    saveButton.textContent = "Save Changes";
    cancelButton.hidden = false;

    form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteExpense(id) {
    const confirmed = confirm("Delete this expense?");

    if (!confirmed) {
        return;
    }

    const previousExpenses = expenses;
    expenses = expenses.filter(expense => expense.id !== id);

    if (!saveExpenses()) {
        expenses = previousExpenses;
        return;
    }

    if (editingId === id) {
        resetForm();
    }

    renderExpenses();
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const date = expenseDateInput.value;

    if (
        !title ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !date
    ) {
        alert("Please enter a valid name, amount and date.");
        return;
    }

    const previousExpenses = expenses;

    if (editingId !== null) {
        expenses = expenses.map(expense => {
            if (expense.id !== editingId) {
                return expense;
            }

            return {
                ...expense,
                title,
                amount,
                category,
                date
            };
        });
    } else {
        expenses = [
            ...expenses,
            {
                id: createId(),
                title,
                amount,
                category,
                date
            }
        ];
    }

    if (!saveExpenses()) {
        expenses = previousExpenses;
        return;
    }

    // Show the date or month of the entry just saved.
    if (viewMode.value === "daily") {
        filterDate.value = date;
    } else {
        filterMonth.value = date.slice(0, 7);
    }

    resetForm();
    renderExpenses();
});

cancelButton.addEventListener("click", resetForm);

viewMode.addEventListener("change", () => {
    const daily = viewMode.value === "daily";

    filterDate.hidden = !daily;
    dateLabel.hidden = !daily;

    filterMonth.hidden = daily;
    monthLabel.hidden = daily;

    renderExpenses();
});

filterDate.addEventListener("change", renderExpenses);
filterMonth.addEventListener("change", renderExpenses);

const today = getToday();
filterDate.value = today;
filterMonth.value = today.slice(0, 7);
expenseDateInput.value = today;

renderExpenses();
