document.addEventListener('DOMContentLoaded', () => {
    const menuItemsData = [
        // Existing Items
        { id: 1, name: 'Bombay Sandwich', price: 60.00, category: 'food', imageEmoji: '🥪' },
        { id: 2, name: 'Virgin Mint Mojito', price: 45.00, category: 'drinks', imageEmoji: '🍃' },
        { id: 3, name: 'Bhel Puri', price: 50.00, category: 'food', imageEmoji: '🥣' },
        { id: 4, name: 'Blue Curaçao Mojito', price: 70.00, category: 'drinks', imageEmoji: '🍹' },

        // New Savory Food Items
        { id: 5, name: 'Paneer Tikka Sandwich', price: 75.00, category: 'food', imageEmoji: '🧀' },
        { id: 6, name: 'Veggie Maggi Noodles', price: 40.00, category: 'food', imageEmoji: '🍜' },
        { id: 7, name: 'Aloo Tikki Chaat', price: 55.00, category: 'food', imageEmoji: '🥔' },
        { id: 8, name: 'Masala Fries', price: 45.00, category: 'food', imageEmoji: '🍟' },
        { id: 9, name: 'Sweet Corn Chaat', price: 50.00, category: 'food', imageEmoji: '🌽' },
        { id: 10, name: 'Mini Samosas (4 pcs)', price: 40.00, category: 'food', imageEmoji: '🥟' },
        { id: 11, name: 'Veg Cutlet (2 pcs)', price: 50.00, category: 'food', imageEmoji: '🥕' },
        { id: 12, name: 'Chilli Cheese Toast', price: 65.00, category: 'food', imageEmoji: '🌶️' },
        { id: 13, name: 'Sprout Salad Bhel', price: 55.00, category: 'food', imageEmoji: '🌱' },
        { id: 14, name: 'Dahi Puri (6 pcs)', price: 60.00, category: 'food', imageEmoji: '🍥' },

        // New Drink Items
        { id: 15, name: 'Fresh Lime Soda', price: 35.00, category: 'drinks', imageEmoji: '🍋' },
        { id: 16, name: 'Masala Chai', price: 25.00, category: 'drinks', imageEmoji: '☕' },
        { id: 17, name: 'Classic Cold Coffee', price: 60.00, category: 'drinks', imageEmoji: '🧋' },
        { id: 18, name: 'Watermelon Juice', price: 50.00, category: 'drinks', imageEmoji: '🍉' },
        { id: 19, name: 'Mango Lassi', price: 65.00, category: 'drinks', imageEmoji: '🥭' },
        { id: 20, name: 'Jaljeera Cooler', price: 30.00, category: 'drinks', imageEmoji: '🌿' }
    ];

    let currentOrder = [];
    let currentOrderNumber;

    const menuItemsGrid = document.getElementById('menu-items-grid');
    const orderItemsList = document.getElementById('order-items-list');
    const subtotalPriceEl = document.getElementById('subtotal-price');
    const taxAmountEl = document.getElementById('tax-amount');
    const totalPriceEl = document.getElementById('total-price');
    const orderNumberEl = document.getElementById('order-number');
    const clearOrderBtn = document.getElementById('clear-order-btn');
    const sendOrderBtn = document.getElementById('send-order-btn');

    function loadOrderNumber() {
        const savedOrderNumber = localStorage.getItem('antarticanCoNextOrderNumber');
        currentOrderNumber = savedOrderNumber ? parseInt(savedOrderNumber) : 1;
        if (orderNumberEl) { // Check if element exists
             orderNumberEl.textContent = currentOrderNumber;
        }
    }

    function saveNextOrderNumber() {
        localStorage.setItem('antarticanCoNextOrderNumber', currentOrderNumber.toString());
    }

    function renderMenuItems() {
        if (!menuItemsGrid) return; // Guard clause
        menuItemsGrid.innerHTML = '';
        menuItemsData.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('menu-item');
            itemDiv.innerHTML = `
                <div class="menu-item-image">${item.imageEmoji || '🍽️'}</div>
                <div class="menu-item-name">${item.name}</div>
                <div class="menu-item-price">₹${item.price.toFixed(2)}</div>
                <button class="add-to-order-btn" data-id="${item.id}">Add to Order</button>
            `;
            itemDiv.querySelector('.add-to-order-btn').addEventListener('click', () => addItemToOrder(item.id));
            menuItemsGrid.appendChild(itemDiv);
        });
    }

    function addItemToOrder(itemId) {
        const menuItem = menuItemsData.find(item => item.id === itemId);
        if (!menuItem) return;

        const existingOrderItem = currentOrder.find(item => item.id === itemId);
        if (existingOrderItem) {
            existingOrderItem.quantity++;
        } else {
            currentOrder.push({ ...menuItem, quantity: 1 });
        }
        renderCurrentOrder();
    }

    function updateOrderItemQuantity(itemId, change) {
        const orderItem = currentOrder.find(item => item.id === itemId);
        if (!orderItem) return;

        orderItem.quantity += change;
        if (orderItem.quantity <= 0) {
            currentOrder = currentOrder.filter(item => item.id !== itemId);
        }
        renderCurrentOrder();
    }

    function renderCurrentOrder() {
        if (!orderItemsList) return; // Guard clause
        orderItemsList.innerHTML = '';

        if (currentOrder.length === 0) {
            orderItemsList.innerHTML = '<li class="no-items">No items in order.</li>';
            updateTotals(0);
            return;
        }

        let subtotal = 0;
        currentOrder.forEach(item => {
            const listItem = document.createElement('li');
            const itemTotalPrice = item.price * item.quantity;
            subtotal += itemTotalPrice;

            listItem.innerHTML = `
                <div class="item-details">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price-each">(₹${item.price.toFixed(2)} each)</span>
                </div>
                <div class="item-controls">
                    <button class="quantity-btn decrease-qty" data-id="${item.id}">-</button>
                    <span class="item-quantity">${item.quantity}</span>
                    <button class="quantity-btn increase-qty" data-id="${item.id}">+</button>
                    <button class="remove-item-btn" data-id="${item.id}">×</button>
                </div>
                <span class="item-total-price">₹${itemTotalPrice.toFixed(2)}</span>
            `;
            listItem.querySelector('.decrease-qty').addEventListener('click', () => updateOrderItemQuantity(item.id, -1));
            listItem.querySelector('.increase-qty').addEventListener('click', () => updateOrderItemQuantity(item.id, 1));
            listItem.querySelector('.remove-item-btn').addEventListener('click', () => updateOrderItemQuantity(item.id, -item.quantity));

            orderItemsList.appendChild(listItem);
        });
        updateTotals(subtotal);
    }

    function updateTotals(subtotal) {
        const tax = 0;
        const total = subtotal + tax;

        if (subtotalPriceEl) subtotalPriceEl.textContent = `₹${subtotal.toFixed(2)}`;
        if (taxAmountEl) taxAmountEl.textContent = `₹${tax.toFixed(2)}`;
        if (totalPriceEl) totalPriceEl.textContent = `₹${total.toFixed(2)}`;
    }

    function clearOrder() {
        currentOrder = [];
        renderCurrentOrder();
        console.log("Order cleared.");
    }

    function sendOrder() {
        if (currentOrder.length === 0) {
            alert("Cannot send an empty order.");
            return;
        }

        const orderTotal = parseFloat(totalPriceEl.textContent.replace('₹', ''));

        const completedOrder = {
            orderId: `AC-${currentOrderNumber}-${Date.now()}`,
            displayOrderNumber: currentOrderNumber,
            timestamp: new Date().toISOString(),
            items: JSON.parse(JSON.stringify(currentOrder)),
            totalAmount: orderTotal,
            preparationStatus: "Pending", // Default preparation status
            paymentStatus: "Unpaid"       // Default payment status
        };

        let pastOrders = JSON.parse(localStorage.getItem('antarticanCoOrders')) || [];
        pastOrders.push(completedOrder);
        localStorage.setItem('antarticanCoOrders', JSON.stringify(pastOrders));

        console.log(`Order #${completedOrder.displayOrderNumber} Sent and Saved with statuses: Prep=${completedOrder.preparationStatus}, Payment=${completedOrder.paymentStatus}`);
        // console.log(completedOrder); // For debugging the whole order object

        currentOrder = [];
        currentOrderNumber++;
        if (orderNumberEl) orderNumberEl.textContent = currentOrderNumber;
        saveNextOrderNumber();
        renderCurrentOrder();
        alert(`Order #${completedOrder.displayOrderNumber} has been sent and saved!`);
    }

    renderMenuItems();
    loadOrderNumber();
    renderCurrentOrder();

    if (clearOrderBtn) clearOrderBtn.addEventListener('click', clearOrder);
    if (sendOrderBtn) sendOrderBtn.addEventListener('click', sendOrder);
});
