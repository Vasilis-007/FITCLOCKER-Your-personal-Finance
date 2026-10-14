const form = document.querySelector("#transaction-form");
const descriptionInput = document.querySelector("#description");
const amountInput = document.querySelector("#amount");
const typeInput = document.querySelector("#type");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");

const balanceEL = document.querySelector("#balance");
const incomeEL = document.querySelector("#income");
const expensesEL = document.querySelector("#expenses");
const transactionListEL = document.querySelector("#transaction-list");
const emptyMessageEL = document.querySelector("#empty-message");
const countEL = document.querySelector("#transaction-count");
const chartMessageEL = document.querySelector("#chart-message");

const money = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

let spendingChart = null;

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem("fintrack-transactions") || "[]");

    if (!Array.isArray(saved)) return [];

    return saved.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.description === "string" &&
        Number.isFinite(item.amount) &&
        item.amount > 0 &&
        ["income", "expense"].includes(item.type) &&
        typeof item.category === "string" &&
        typeof item.date === "string"
    );
  } catch (error) {
    console.error("Could not load transactions:", error);
    return [];
  }
}

let transactions = loadTransactions();

function saveTransactions() {
  localStorage.setItem("fintrack-transactions", JSON.stringify(transactions));
}

function formatMoney(value) {
  return money.format(value);
}

function updateSummary() {
  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const balance = totalIncome - totalExpenses;

  if (balanceEL) balanceEL.textContent = formatMoney(balance);
  if (incomeEL) incomeEL.textContent = formatMoney(totalIncome);
  if (expensesEL) expensesEL.textContent = formatMoney(totalExpenses);
}

function renderTransactions() {
  if (!transactionListEL || !emptyMessageEL || !countEL) return;

  if (transactions.length === 0) {
    transactionListEL.innerHTML = "";
    emptyMessageEL.hidden = false;
    countEL.textContent = "0 transactions";
    return;
  }

  emptyMessageEL.hidden = true;
  countEL.textContent = `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;

  transactionListEL.innerHTML = transactions
    .map(
      (item) => `
        <tr>
          <td>${item.description}</td>
          <td>${item.category}</td>
          <td>${item.type === "income" ? "Income" : "Expense"}</td>
          <td class="${item.type === "income" ? "green" : "red"}">${item.type === "income" ? "+" : "-"}${formatMoney(item.amount)}</td>
          <td>${item.date}</td>
          <td><button type="button" class="delete-btn" data-id="${item.id}">Delete</button></td>
        </tr>
      `
    )
    .join("");
}

function getExpenseBreakdown() {
  return transactions
    .filter((item) => item.type === "expense")
    .reduce((totals, item) => {
      const category = item.category || "Other";
      totals[category] = (totals[category] || 0) + item.amount;
      return totals;
    }, {});
}

function renderSpendingChart() {
  const canvas = document.querySelector("#spending-chart");

  if (!canvas) return;

  const totals = getExpenseBreakdown();
  const labels = Object.keys(totals);
  const values = Object.values(totals);

  if (!labels.length) {
    if (spendingChart) {
      spendingChart.destroy();
      spendingChart = null;
    }

    if (chartMessageEL) {
      chartMessageEL.textContent = "Add expenses to see your spending";
    }

    return;
  }

  if (chartMessageEL) {
    chartMessageEL.textContent = "Your spending by category";
  }

  if (spendingChart) {
    spendingChart.destroy();
  }

  spendingChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            "#635bdb",
            "#159b72",
            "#e35d6a",
            "#f7b267",
            "#4ecdc4",
            "#f4a261",
            "#7f7f7f",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${money.format(context.parsed)}`,
          },
        },
      },
    },
  });
}

function refreshDashboard() {
  updateSummary();
  renderTransactions();
  renderSpendingChart();
}

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const description = descriptionInput?.value.trim();
    const amount = Number(amountInput?.value);
    const type = typeInput?.value;
    const category = categoryInput?.value;
    const date = dateInput?.value;

    if (!description || !Number.isFinite(amount) || amount <= 0 || !type || !category || !date) {
      alert("Please complete all transaction fields correctly.");
      return;
    }

    const newTransaction = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      description,
      amount,
      type,
      category,
      date,
    };

    transactions = [newTransaction, ...transactions];
    saveTransactions();
    refreshDashboard();
    form.reset();
    dateInput.value = getToday();
  });
}

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) return;

  const deleteButton = target.closest(".delete-btn");

  if (!deleteButton) return;

  const { id } = deleteButton.dataset;
  if (!id) return;

  transactions = transactions.filter((item) => item.id !== id);
  saveTransactions();
  refreshDashboard();
});

if (dateInput) {
  dateInput.value = getToday();
}

refreshDashboard();

