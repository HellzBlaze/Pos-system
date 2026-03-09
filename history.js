document.addEventListener('DOMContentLoaded', () => {
  const orderHistoryList = document.getElementById('order-history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  function formatTimestamp(ts) {
    return new Date(ts).toLocaleString();
  }

  function createPaymentStatusDropdown(orderId, currentStatus) {
    const select = document.createElement('select');
    select.classList.add('payment-status-dropdown');
    ['Unpaid', 'Paid'].forEach(status => {
      const opt = document.createElement('option');
      opt.value = status;
      opt.textContent = status;
      if (status === currentStatus) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', async e => {
      await api.updateOrderStatus(orderId, 'paymentStatus', e.target.value);
      displayOrders();
    });
    return select;
  }

  async function handleDeleteOrder(event) {
    const orderId = parseInt(event.target.dataset.orderId, 10);
    if (!confirm(`Delete order #${orderId}?`)) return;
    await api.deleteOrder(orderId);
    displayOrders();
  }

  async function handleProgressOrder(event) {
    const orderId = parseInt(event.target.dataset.orderId, 10);
    const currentText = event.target.textContent;
    let newStatus = 'Pending';
    if (currentText.includes('Preparing')) newStatus = 'Preparing';
    else if (currentText.includes('Ready')) newStatus = 'Ready';
    else if (currentText.includes('Completed/Paid')) {
      newStatus = 'Served';
      await api.updateOrderStatus(orderId, 'paymentStatus', 'Paid');
    }
    await api.updateOrderStatus(orderId, 'preparationStatus', newStatus);
    displayOrders();
  }

  async function displayOrders() {
    orderHistoryList.innerHTML = '';
    const pastOrders = await api.getOrders();

    if (pastOrders.length === 0) {
      orderHistoryList.innerHTML = '<p class="no-history">No past orders found.</p>';
      return;
    }

    pastOrders.forEach(order => {
      const orderCard = document.createElement('div');
      orderCard.classList.add('order-history-card');
      orderCard.dataset.internalId = order.orderId;
      orderCard.dataset.preparationStatus = order.preparationStatus;
      orderCard.dataset.paymentStatus = order.paymentStatus;

      let itemsHtml = '<ul class="history-items-list">';
      order.items.forEach(item => {
        itemsHtml += `<li>${item.name} (x${item.quantity}) - ₹${(item.price * item.quantity).toFixed(2)}</li>`;
      });
      itemsHtml += '</ul>';

      const statusBadge = `<span class="status-badge status-${order.preparationStatus.toLowerCase().replace(/\s+/g, '-')}">${order.preparationStatus}</span>`;

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
          <div class="progress-action"></div>
          <div class="payment-action"><label>Payment:</label></div>
          <button class="delete-order-btn" data-order-id="${order.orderId}">Delete Order</button>
        </div>
      `;

      const progressActionDiv = orderCard.querySelector('.progress-action');
      if (order.preparationStatus !== 'Served' && order.preparationStatus !== 'Cancelled') {
        const btn = document.createElement('button');
        btn.classList.add('progress-btn');
        if (order.preparationStatus === 'Pending') btn.textContent = 'Mark Preparing';
        if (order.preparationStatus === 'Preparing') btn.textContent = 'Mark Ready';
        if (order.preparationStatus === 'Ready') btn.textContent = 'Mark Completed/Paid';
        btn.dataset.orderId = order.orderId;
        btn.addEventListener('click', handleProgressOrder);
        progressActionDiv.appendChild(btn);
      }

      const paymentActionDiv = orderCard.querySelector('.payment-action');
      paymentActionDiv.appendChild(createPaymentStatusDropdown(order.orderId, order.paymentStatus));
      orderCard.querySelector('.delete-order-btn').addEventListener('click', handleDeleteOrder);
      orderHistoryList.appendChild(orderCard);
    });
  }

  clearHistoryBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all order history? This cannot be undone.')) return;
    await api.clearOrders();
    displayOrders();
    alert('Order history cleared.');
  });

  displayOrders();
});
