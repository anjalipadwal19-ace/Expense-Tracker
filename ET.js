let currentUser = localStorage.getItem("userName");
let data = JSON.parse(localStorage.getItem(`data_${currentUser}`)) || [];

let pieChart, lineChart;

function showSection(id) {
    if (!currentUser) return;
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    updateUI();
}

function addTransaction(e, type) {
    e.preventDefault();
    const title = document.getElementById(type[0] + "Title").value;
    const desc = document.getElementById(type[0] + "Desc").value;
    const amount = +document.getElementById(type[0] + "Amount").value;
    const category = document.getElementById(type[0] + "Category").value;
    const rawDate = document.getElementById(type[0] + "Date").value;
    const date = formatDate(rawDate);

    if (amount <= 0) {
        alert("Amount must be positive");
        return;
    }

    data.push({
        id: Date.now(),
        title, desc, amount, category, type, date
    });

    localStorage.setItem(`data_${currentUser}`, JSON.stringify(data));
    e.target.reset();
    updateUI();
}

function updateUI() {
    let income = 0, expense = 0;
    let categories = {};
    let months = {};

    document.getElementById("incomeList").innerHTML = "";
    document.getElementById("expenseList").innerHTML = "";
    document.getElementById("recentList").innerHTML = "";
    document.getElementById("monthlyTable").innerHTML = "";

    data.slice().reverse().forEach(t => {
        document.getElementById("recentList").innerHTML +=
            `<tr><td>${t.title}</td><td>${t.date}</td><td>${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</td><td>₹${t.amount}</td></tr>`;
    });

    data.slice().reverse().forEach(t => {
        if (t.type === "income") {
            income += t.amount;
            document.getElementById("incomeList").innerHTML += `
            <tr><td>${t.title}</td><td>${t.date}</td><td>₹${t.amount}</td>
            <td style="text-align:right">
            <button onclick="editTransaction(${t.id})">Edit</button>
            <button onclick="deleteTransaction(${t.id})">Delete</button>
            </td>
            </tr> `;
        } else {
            expense += t.amount;
            categories[t.category] = (categories[t.category] || 0) + t.amount;
            document.getElementById("expenseList").innerHTML += `
            <tr><td>${t.title}</td><td>${t.date}</td><td>₹${t.amount}</td>
            <td style="text-align:right">
            <button onclick="editTransaction(${t.id})">Edit</button>
            <button onclick="deleteTransaction(${t.id})">Delete</button>
            </td>
            </tr> `;   }
        const [d, m, y] = t.date.split("/");
        const month = `${m}/${y}`;
        months[month] = months[month] || { income: 0, expense: 0 };
        months[month][t.type] += t.amount;
    });

    document.getElementById("homeIncome").innerText = income;
    document.getElementById("homeExpense").innerText = expense;
    document.getElementById("homeBalance").innerText = income - expense;

    document.getElementById("tIncome").innerText = income;
    document.getElementById("tExpense").innerText = expense;
    document.getElementById("tBalance").innerText = income - expense;

    drawPie(categories);
    drawLine(months);

    Object.keys(months).forEach(m => {
        document.getElementById("monthlyTable").innerHTML +=
            `<tr><td>${m}</td><td>₹${months[m].income}</td><td>₹${months[m].expense}</td></tr>`;
    });
}

function drawPie(categories) {
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(document.getElementById("expenseChart"), {
        type: "pie",
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories)
            }]
        }
    });
}

function drawLine(months) {
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(document.getElementById("lineChart"), {
        type: "line",
        data: {
            labels: Object.keys(months),
            datasets: [
                {
                    label: "Income",
                    data: Object.values(months).map(m => m.income)
                },
                {
                    label: "Expense",
                    data: Object.values(months).map(m => m.expense)
                }
            ]
        }
    });
}

function exportData(type) {
    const filtered = data.filter(t => t.type === type);

    if (filtered.length === 0) {
        alert("No data to export");
        return;
    }

    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
        type: "application/json"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${type}_data.json`;
    link.click();
}

function importData(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);

            imported.forEach(item => {
                if (item.type === type) {
                    item.id = Date.now() + Math.random();
                    data.push(item);
                }
            });

            localStorage.setItem(`data_${currentUser}`, JSON.stringify(data));
            updateUI();
            alert("Data imported successfully");
        } catch {
            alert("Invalid file");
        }
    };
    reader.readAsText(file);
}

function deleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    data = data.filter(t => t.id !== id);
    localStorage.setItem(`data_${currentUser}`, JSON.stringify(data));
    updateUI();
}

function editTransaction(id) {
    const t = data.find(item => item.id === id);
    if (!t) return;

    const choice = prompt(
        "What do you want to edit?\n1. Title\n2. Amount\n3. Date\n(Enter 1 / 2 / 3 )"
    );

    if (choice === null) return;

    switch (choice) {
        case "1": {
            const newTitle = prompt("Edit title:", t.title);
            if (newTitle === null || newTitle.trim() === "") return;
            t.title = newTitle.trim();
            break;
        }

        case "2": {
            const newAmount = prompt("Edit amount:", t.amount);
            if (newAmount === null || isNaN(newAmount) || Number(newAmount) <= 0) {
                alert("Invalid amount");
                return;
            }
            t.amount = Number(newAmount);
            break;
        }
        case "3": {
            const [d, m, y] = t.date.split("/");
            const newDate = prompt(
                "Edit date (YYYY-MM-DD or DD/MM/YYYY):",
                `${y}-${m}-${d}`
            );

            if (newDate === null || newDate.trim() === "") return;

            if (newDate.includes("-")) {
                t.date = formatDate(newDate);
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(newDate)) {
                t.date = newDate;
            } else {
                alert("Invalid date format");
                return;
            }
            break;
        }
        default:
            alert("Invalid choice");
            return;
    }
    localStorage.setItem(`data_${currentUser}`, JSON.stringify(data));
    updateUI();
}

function formatDate(dateStr) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
}

function saveProfile(event) {
    if (event.key !== "Enter") return;

    const name = document.getElementById("userName").value.trim();
    if (!/^[A-Za-z ]+$/.test(name)) {
        alert("Name should contain only letters");
        return;
    }

    localStorage.setItem("userName", name);
    currentUser = name;

    // Load user-specific data
    data = JSON.parse(localStorage.getItem(`data_${name}`)) || [];

    setInitials(name);
    document.getElementById("mainApp").classList.remove("hidden");
    document.querySelector(".sidebar").classList.remove("disabled");
    document.getElementById("logoutBtn").classList.remove("hidden");

    updateUI();
}
function setInitials(name) {
    const avatar = document.getElementById("avatar");
    if (!name) {
        avatar.textContent = "?";
        return;
    }
    const initials = name
        .split(" ")
        .map(w => w[0].toUpperCase())
        .slice(0, 2)
        .join("");
    avatar.textContent = initials;
}

function uploadAvatar() {
    document.getElementById("avatarInput").click();
}

document.getElementById("avatarInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
        const name = localStorage.getItem("userName");
        localStorage.setItem(`avatar_${name}`, reader.result);

        loadProfile();
    };
    reader.readAsDataURL(file);
});

function loadProfile() {
    const name = localStorage.getItem("userName");
const avatarImg = localStorage.getItem(`avatar_${name}`);

const avatar = document.getElementById("avatar");

setInitials(name);
if (avatarImg) {
    avatar.innerHTML = `<img src="${avatarImg}">`;
}

    if (!name) {
        document.getElementById("mainApp").classList.add("hidden");
        document.querySelector(".sidebar").classList.add("disabled");
        return;
    }

    currentUser = name;
    data = JSON.parse(localStorage.getItem(`data_${name}`)) || [];

    document.getElementById("userName").value = name;

    document.getElementById("mainApp").classList.remove("hidden");
    document.querySelector(".sidebar").classList.remove("disabled");
    document.getElementById("logoutBtn").classList.remove("hidden");

    updateUI();
}
loadProfile();

function logout() {
    if (!confirm("Logout current user?")) return;

    localStorage.removeItem("userName");
    currentUser = null;
    data = [];

    document.getElementById("userName").value = "";
    document.getElementById("mainApp").classList.add("hidden");
    document.querySelector(".sidebar").classList.add("disabled");
    document.getElementById("logoutBtn").classList.add("hidden");

    setInitials("");
}