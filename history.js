document.addEventListener('DOMContentLoaded', () => {
    const orderHistoryList = document.getElementById('order-history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Note: "Completed" in your image is represented as "Served" here for preparation.
    const PREPARATION_STATUSES_ORDERED = ["Pending", "Preparing", "Ready", "Served"]; // No "Cancelled" in this progression
    const PAYMENT_STATUSES = ["Unpaid", "Paid (Cash)", "Paid (Online)", "Refunded", "Cancelled"]; 

    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // For Payment Status Dropdown
    function createPaymentStatusDropdown(orderId, currentStatus) {
        const select = document.createElement('select');
        select.classList.add('status-dropdown', `payment-status-dropdown`);
        select.dataset.orderId = orderId;
        // No statusType needed as it's specifically for payment here
        select.addEventListener('change', (event) => {
             handlePaymentStatusChange(orderId, event.target.value);
        });


        PAYMENT_STATUSES.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            if (status === currentStatus) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        return select;
    }

    function handlePaymentStatusChange(orderId, newStatus) {
        updateOrderStatus(orderId, 'paymentStatus', newStatus, true); // true to trigger re-render for payment background
    }

    function handleProgressOrder(event) {
        const orderId = event.target.dataset.orderId;
        let pastOrders = JSON.parse(localStorage.getItem('antarticanCoOrders')) || [];
        const orderIndex = pastOrders.findIndex(order => order.orderId === orderId);

        if (orderIndex > -1) {
            const currentOrder = pastOrders[orderIndex];
            let nextPrepStatus = currentOrder.preparationStatus;
            let paymentUpdate = false;

            if (currentOrder.preparationStatus === "Pending") {
                nextPrepStatus = "Preparing";
            } else if (currentOrder.preparationStatus === "Preparing") {
                nextPrepStatus = "Ready";
            } else if (currentOrder.preparationStatus === "Ready") {
                nextPrepStatus = "Served"; // This is our "Completed" state for preparation
                if (currentOrder.paymentStatus === "Unpaid") { // Auto-mark paid if completing
                    pastOrders[orderIndex].paymentStatus = "Paid (Cash)";
                    paymentUpdate = true;
                }
            }
            // No progression from "Served" or "Cancelled" via this button

            pastOrders[orderIndex].preparationStatus = nextPrepStatus;
            localStorage.setItem('antarticanCoOrders', JSON.stringify(pastOrders));
            displayOrders(); // Re-render the whole list to reflect changes
        }
    }
    
    function handleDeleteOrder(event) {
        const orderId = event.target.dataset.orderId;
        // Extract display number for the alert
        let pastOrders = JSON.parse(localStorage.getItem('antarticanCoOrders')) || [];
        const orderToDelete = pastOrders.find(order => order.orderId === orderId);
        const displayNum = orderToDelete ? orderToDelete.displayOrderNumber : 'this';

        if (confirm(`Are you sure you want to delete Order #${displayNum}? This cannot be undone.`)) {
            pastOrders = pastOrders.filter(order => order.orderId !== orderId);
            localStorage.setItem('antarticanCoOrders', JSON.stringify(pastOrders));
            displayOrders();
            alert(`Order #${displayNum} deleted.`);
        }
    }


    function updateOrderStatus(orderId, statusType, newStatus, shouldReRender = false) {
        let pastOrders = JSON.parse(localStorage.getItem('antarticanCoOrders')) || [];
        const orderIndex = pastOrders.findIndex(order => order.orderId === orderId);

        if (orderIndex > -1) {
            pastOrders[orderIndex][statusType] = newStatus;
            localStorage.setItem('antarticanCoOrders', JSON.stringify(pastOrders));
            console.log(`Order ${orderId} ${statusType} updated to ${newStatus}`);
            
            if (shouldReRender) {
                displayOrders(); // Re-render for significant changes like payment background
            } else {
                 // Update data-attribute on the card for immediate CSS changes (like left border)
                const card = document.querySelector(`.order-history-card[data-internal-id="${orderId}"]`);
                if (card) {
                    card.dataset[statusType] = newStatus;
                    if (statusType === 'preparationStatus') {
                        const badge = card.querySelector('.status-badge');
                        if (badge) {
                            badge.textContent = newStatus;
                            badge.className = `status-badge status-${newStatus.toLowerCase().replace(/\s+/g, '-')}`;
                        }
                    }
                }
            }
        }
    }


    function displayOrders() {
        if (!orderHistoryList) return;
        orderHistoryList.innerHTML = '';
        let pastOrders = JSON.parse(localStorage.getItem('antarticanCoOrders')) || [];

        if (pastOrders.length === 0) {
            orderHistoryList.innerHTML = '<p class="no-history">No past orders found.</p>';
            return;
        }

        pastOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        pastOrders.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.classList.add('order-history-card');
            orderCard.dataset.internalId = order.orderId; // For easier selection

            const currentPrepStatus = order.preparationStatus || "Pending";
            const currentPaymentStatus = order.paymentStatus || "Unpaid";

            orderCard.dataset.preparationStatus = currentPrepStatus;
            orderCard.dataset.paymentStatus = currentPaymentStatus;

            let itemsHtml = '<ul class="history-items-list">';
            order.items.forEach(item => {
                itemsHtml += `<li>${item.name} (x${item.quantity}) - ₹${(item.price * item.quantity).toFixed(2)}</li>`;
            });
            itemsHtml += '</ul>';
            
            const statusBadge = `<span class="status-badge status-${currentPrepStatus.toLowerCase().replace(/\s+/g, '-')}">${currentPrepStatus}</span>`;

            orderCard.innerHTML = `
                <div class="order-history-header">
                    <h3>Order #${order.displayOrderNumber} ${statusBadge}</h3>
                </div>
                <div class="order-card-meta">
                    <span class="order-timestamp">Placed: ${formatTimestamp(order.timestamp)}</span>
                    <span class="order-total-display"><strong>Total: ₹${order.totalAmount.toFixed(2)}</strong></span>
                </div>
                <div class="order-history-body">
                    <h4>Items:</h4>
                    ${itemsHtml}
                </div>
                <div class="order-history-controls">
                    <div class="progress-action">
                        <!-- Progress button will be injected here -->
                    </div>
                    <div class="payment-action">
                        <label>Payment:</label>
                        <!-- Payment dropdown will be injected here -->
                    </div>
                    <button class="delete-order-btn" data-order-id="${order.orderId}">Delete Order</button>
                </div>
            `;
            
            const progressActionDiv = orderCard.querySelector('.progress-action');
            if (currentPrepStatus !== "Served" && currentPrepStatus !== "Cancelled") { // Don't show progress button if served or cancelled
                let btnText = '';
                let btnClass = '';
                if (currentPrepStatus === "Pending") {
                    btnText = 'Mark Preparing';
                    btnClass = 'progress-mark-preparing';
                } else if (currentPrepStatus === "Preparing") {
                    btnText = 'Mark Ready';
                    btnClass = 'progress-mark-ready';
                } else if (currentPrepStatus === "Ready") {
                    btnText = 'Mark Completed/Paid';
                    btnClass = 'progress-mark-completed-paid';
                }

                if (btnText) {
                    const btn = document.createElement('button');
                    btn.classList.add('progress-btn', btnClass);
                    btn.textContent = btnText;
                    btn.dataset.orderId = order.orderId;
                    btn.addEventListener('click', handleProgressOrder);
                    progressActionDiv.appendChild(btn);
                }
            }
            
            const paymentActionDiv = orderCard.querySelector('.payment-action');
            const paymentDropdown = createPaymentStatusDropdown(order.orderId, currentPaymentStatus);
            paymentActionDiv.appendChild(paymentDropdown);

            orderCard.querySelector('.delete-order-btn').addEventListener('click', handleDeleteOrder);

            orderHistoryList.appendChild(orderCard);
        });
    }

    function clearAllHistory() {
        if (confirm("Are you sure you want to clear all order history? This cannot be undone.")) {
            localStorage.removeItem('antarticanCoOrders');
            displayOrders();
            alert("Order history cleared.");
        }
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearAllHistory);
    }

    displayOrders();
});
