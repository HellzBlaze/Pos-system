document.addEventListener('DOMContentLoaded', async () => {
  let menuItemsData = [];
  let currentOrder = [];
  let currentOrderNumber = 1;

  const menuItemsGrid = document.getElementById('menu-items-grid');
  const orderItemsList = document.getElementById('order-items-list');
  const subtotalPriceEl = document.getElementById('subtotal-price');
  const taxAmountEl = document.getElementById('tax-amount');
  const totalPriceEl = document.getElementById('total-price');
  const orderNumberEl = document.getElementById('order-number');
  const clearOrderBtn = document.getElementById('clear-order-btn');
  const sendOrderBtn = document.getElementById('send-order-btn');

  function updateTotals(subtotal) {
    const tax = 0;
    subtotalPriceEl.textContent = `₹${subtotal.toFixed(2)}`;
    taxAmountEl.textContent = `₹${tax.toFixed(2)}`;
    totalPriceEl.textContent = `₹${(subtotal + tax).toFixed(2)}`;
  }

  function renderCurrentOrder() {
    orderItemsList.innerHTML = '';
    if (currentOrder.length === 0) {
      orderItemsList.innerHTML = '<li class="no-items">No items in order.</li>';
      updateTotals(0);
      return;
    }

    let subtotal = 0;
    currentOrder.forEach(item => {
      subtotal += item.price * item.quantity;
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="item-details">
          <span class="item-name">${item.name}</span>
          <span class="item-price-each">(₹${item.price.toFixed(2)} each)</span>
        </div>
        <div class="item-controls">
          <button class="quantity-btn decrease-qty" data-id="${item.id}">-</button>
          <span class="item-quantity">${item.quantity}</span>
          <button class="quantity-btn increase-qty" data-id="${item.id}">+</button>
          <span class="item-total-price">₹${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      `;
      li.querySelector('.decrease-qty').addEventListener('click', () => updateOrderItemQuantity(item.id, -1));
      li.querySelector('.increase-qty').addEventListener('click', () => updateOrderItemQuantity(item.id, 1));
      orderItemsList.appendChild(li);
    });

    updateTotals(subtotal);
  }

  function updateOrderItemQuantity(itemId, change) {
    const item = currentOrder.find(i => i.id === itemId);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) currentOrder = currentOrder.filter(i => i.id !== itemId);
    renderCurrentOrder();
  }

  function addItemToOrder(itemId) {
    const item = menuItemsData.find(i => i.id === itemId);
    if (!item) return;
    const existing = currentOrder.find(i => i.id === itemId);
    if (existing) existing.quantity += 1;
    else currentOrder.push({ ...item, quantity: 1 });
    renderCurrentOrder();
  }

  function renderMenuItems() {
    menuItemsGrid.innerHTML = '';
    menuItemsData.forEach(item => {
      const div = document.createElement('div');
      div.classList.add('menu-item');
      div.innerHTML = `
        <div class="menu-item-image">${item.imageEmoji || '🍽️'}</div>
        <div class="menu-item-name">${item.name}</div>
        <div class="menu-item-price">₹${item.price.toFixed(2)}</div>
        <button class="add-to-order-btn" data-id="${item.id}">Add to Order</button>
      `;
      div.querySelector('.add-to-order-btn').addEventListener('click', () => addItemToOrder(item.id));
      menuItemsGrid.appendChild(div);
    });
  }

  clearOrderBtn.addEventListener('click', () => {
    currentOrder = [];
    renderCurrentOrder();
  });

  sendOrderBtn.addEventListener('click', async () => {
    if (currentOrder.length === 0) {
      alert('Add items before sending the order.');
      return;
    }
    try {
      const created = await api.createOrder(currentOrder);
      currentOrder = [];
      currentOrderNumber = created.nextOrderNumber;
      orderNumberEl.textContent = currentOrderNumber;
      renderCurrentOrder();
      alert(`Order #${created.displayOrderNumber} sent successfully!`);
    } catch (error) {
      alert('Unable to send order. Please try again.');
    }
  });

  menuItemsData = await api.getMenu();
  const orderNumData = await api.getNextOrderNumber();
  currentOrderNumber = orderNumData.nextOrderNumber;
  orderNumberEl.textContent = currentOrderNumber;
  renderMenuItems();
  renderCurrentOrder();
});
