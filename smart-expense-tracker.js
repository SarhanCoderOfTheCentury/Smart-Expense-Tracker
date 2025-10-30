// Retrieve existing transactions or start empty
const transactions = JSON.parse(localStorage.getItem("transactions")) || [];

const formatter = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    signDisplay: "always"
})

//DOM elements
const list = document.querySelector('.transaction-list-items'); // fixed selector
const form = document.querySelector('form'); // fixed selector
const balance = document.querySelector('.balance-amount');
const income = document.querySelector('.income-amount');
const expense = document.querySelector('.expense-amount');
const dateInput = document.getElementById('myDate');
const aiResponseDiv = document.querySelector('.ai-response');
const aiResponsebtn = document.querySelector('.get-ai-response-btn');

//Today's date
dateInput.defaultValue = new Date().toISOString().split('T')[0]; // fixed date

form.addEventListener('submit', addTransaction);

//Function to format the amount entered in add transaction
function formatCurrency(value) {
    if (value === 0) {
        return formatter.format(0).replace(/^[+-]/, "");
    }
    return formatter.format(value);
}

//Income categories
const incomeCategories = ["salary", "business", "investment", "misc-income"]; // fixed array

//Function to create an item for Transaction
function createItem({ id, name, amount, date, type }) {
    const sign = type === 'income' ? 1 : -1;
    const li = document.createElement("li");
    li.className = 'transaction-list-item'

    li.innerHTML = `
                            <div class="transaction-item">
                                <p>${name}</p>
                                <span>${type}</span>
                            </div>
                            <div class="transaction-amount"><span>Rs.${amount}</span></div>`;

    li.addEventListener("click", (e) => {
        e.stopPropagation(); // fixed
        if (confirm("Delete Transaction")) {
            deleteTransaction(id);
        }
    });

    return li;
};

//Add transaction
function addTransaction(e) {
    e.preventDefault();

    const formData = new FormData(form);
    form.reset();

    const category = formData.get("expense-type");
    const transactionType = incomeCategories.includes(category) ? "income" : "expense";

    const newTransaction = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        name: formData.get('name'),
        amount: parseFloat(formData.get('amount')),
        date: new Date(formData.get('event_date')), // fixed field name
        type: transactionType
    };

    if (!newTransaction.name || isNaN(newTransaction.amount) || !newTransaction.date) {
        alert("Please fill in all the fields correctly") // fixed typo
        return;
    }

    transactions.push(newTransaction);
    saveTransactions();
    renderList();
    updateTotal();
}

// Saving transactions
function saveTransactions() {
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem("transactions", JSON.stringify(transactions));
}

//Update header totals
function updateTotal() {
    const incomeTotal = transactions.filter((t) => t.type === "income")?.reduce((sum, t) => sum + t.amount, 0);
    const expenseTotal = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

    //Balance calculation;
    const balanceTotal = incomeTotal - expenseTotal;

    balance.textContent = formatCurrency(balanceTotal).replace(/^\+/, ""); // fixed regex
    income.textContent = formatCurrency(incomeTotal)
    expense.textContent = formatCurrency(expenseTotal);
}

//Rendering transaction list by adding newly created transaction items
function renderList() {
    list.innerHTML = ''; //=>Intially clearing the list, then adding all the transactions
    transactions.forEach((transaction) => {
        list.appendChild(createItem(transaction));
    });
}

// Delete a transaction
function deleteTransaction(id) {
    const index = transactions.findIndex((t) => t.id === id);
    if (index !== -1) {
        transactions.splice(index, 1)
        saveTransactions();
        renderList();
        updateTotal();
    }
}

const generateAIResponse = async (aiPrompt) => {
    try {

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer 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",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "z-ai/glm-4.5-air:free",
                messages: [
                    { role: "user", content: aiPrompt }
                ]
            }) // use the JSON string as body
        })
        //Retrieving data and converting it to JSON
        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        console.log(data);

        //Accessing the message content generated by AI
        const botMessage = data?.choices?.[0]?.message?.content?.replace(/^#+\s*/gm, '')

            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/^\s*[-•]\s+/gm, '')            // Remove bullets like - or •
            .replace(/^[/\?]+|[/\?]+$/g, '')         // Trim slashes and question marks at edges
            .trim();

        return botMessage;
    }
    catch (err) {
        console.log(err);
        return "Sorry, AI response could not be generated.";
    }
}

aiResponsebtn.addEventListener('click', async () => {
    const allTransactions = JSON.stringify(transactions); // Convert transactions to a string for AI prompt
    const aiPrompt = "Assist me in managing my expenses and income. Provide insights on my spending habits, suggest ways to save money, and help me set financial goals based on my transaction history. I want you to give me to the point response, no extra wording, and give suggestions in points" + allTransactions;

    aiResponseDiv.innerHTML = "<div>Loading AI response...</div>"; // show loading

    const response = await generateAIResponse(aiPrompt); // await the async function
    aiResponseDiv.innerHTML = `
     <div class="ai-response-header">
     <h3>AI Response</h3>
     </div>
    <div style="white-space: pre-wrap;">${response}</div>`; // display response
})

// Create a pie chart using Chart.js
const Chart = window.Chart; // Ensure Chart.js is available globally
const ctx = document.getElementById('expenseChart').getContext('2d');
const colorPalette = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#C9CBCF', '#8BC34A'
];

const labels = transactions.map(t => t.name);
const values = transactions.map(t => t.amount);
const colors = labels.map((_, index) => colorPalette[index % colorPalette.length]);

const expenseChart = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] },

    options: {
        responsive: false,
        plugins: {
            legend: { position: 'bottom' ,  labels: {
                color: '#FFFFFF' // makes legend text white
            } },
           // Set label color to white
        }
    }
});

expenseChart.update();

//Initial load
renderList();
updateTotal();





