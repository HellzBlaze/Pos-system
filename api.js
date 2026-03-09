const api = {
  async getMenu() {
    const res = await fetch('/api/menu');
    return res.json();
  },
  async getNextOrderNumber() {
    const res = await fetch('/api/next-order-number');
    return res.json();
  },
  async getOrders() {
    const res = await fetch('/api/orders');
    return res.json();
  },
  async createOrder(items) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    if (!res.ok) throw new Error('Failed to create order');
    return res.json();
  },
  async updateOrderStatus(orderId, statusType, newStatus) {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusType, newStatus })
    });
    if (!res.ok) throw new Error('Failed to update order status');
    return res.json();
  },
  async deleteOrder(orderId) {
    const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete order');
    return res.json();
  },
  async clearOrders() {
    const res = await fetch('/api/orders', { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear order history');
    return res.json();
  }
};
