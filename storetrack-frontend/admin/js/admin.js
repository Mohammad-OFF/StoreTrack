import { showToast, showLoading, initDarkMode } from '/js/utils.js';

// --- GLOBAL SCOPE & DOM ELEMENTS ---
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
const contentArea = document.getElementById('content-area');
const pageTitle = document.getElementById('page-title');

// --- HTML TEMPLATES ---
const templates = {
  dashboard: `
        <div class="stat-cards-grid">
            <div class="stat-card"><div class="icon products"><i class="fas fa-box"></i></div><div class="info"><h3 id="total-products">--</h3><p>Total Products</p></div></div>
            <div class="stat-card"><div class="icon value"><i class="fas fa-dollar-sign"></i></div><div class="info"><h3 id="total-value">--</h3><p>Total Inventory Value</p></div></div>
            <div class="stat-card"><div class="icon low-stock"><i class="fas fa-exclamation-triangle"></i></div><div class="info"><h3 id="low-stock-count">--</h3><p>Low Stock Items</p></div></div>
        </div>
        <div class="dashboard-grid">
            <div class="chart-container"><canvas id="categoryChart"></canvas></div>
            <div class="info-panel">
                <h3>Low Stock Products</h3>
                <ul id="low-stock-list" class="low-stock-list"><li>Loading...</li></ul>
            </div>
        </div>
    `,
  products: `
        <div class="products-header">
            <h2 class="font-semibold text-xl">Manage All Products</h2>
            <a href="/admin/product-form.html" class="action-button"><i class="fas fa-plus"></i> Add New Product</a>
        </div>
        <div class="admin-card">
            <table id="productTable" class="product-table">
                <thead></thead>
                <tbody></tbody>
            </table>
        </div>
    `,
  orders: `
        <div class="admin-card">
            <h2 class="font-semibold text-xl mb-4">Order Management</h2>
            <table id="ordersTable" class="product-table">
                <thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
                <tbody></tbody>
            </table>
        </div>
    `,
  users: `
        <div class="admin-card">
            <h2 class="font-semibold text-xl mb-4">Registered Users</h2>
            <table id="usersTable" class="product-table">
                <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Date Registered</th></tr></thead>
                <tbody></tbody>
            </table>
        </div>
    `,
};

// --- VIEW RENDERERS ---
async function renderDashboard() {
  pageTitle.textContent = 'Dashboard';
  contentArea.innerHTML = templates.dashboard;
  try {
    const response = await fetch('/api/admin/stats');
    const stats = await response.json();

    document.getElementById('total-products').textContent = stats.totalProducts;
    document.getElementById('total-value').textContent = `$${parseFloat(
      stats.totalInventoryValue
    ).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    document.getElementById('low-stock-count').textContent =
      stats.lowStockCount;

    const lowStockList = document.getElementById('low-stock-list');
    const lowStockResponse = await fetch('/api/admin/products');
    const products = await lowStockResponse.json();
    const lowStockProducts = products.filter((p) => p.inventory < 5);
    lowStockList.innerHTML =
      lowStockProducts.length > 0
        ? lowStockProducts
            .map(
              (p) =>
                `<li class="low-stock-item"><span>${p.name}</span><span>${p.inventory} units</span></li>`
            )
            .join('')
        : '<li>No low stock items. Great job!</li>';

    const ctx = document.getElementById('categoryChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: stats.productsByCategory.map((c) => c.category),
        datasets: [
          {
            data: stats.productsByCategory.map((c) => c.count),
            backgroundColor: [
              '#3b82f6',
              '#10b981',
              '#f97316',
              '#ef4444',
              '#8b5cf6',
            ],
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
      },
    });
  } catch (error) {
    showToast('Failed to load dashboard stats.', 'error');
  }
}

async function renderProducts() {
  pageTitle.textContent = 'Products';
  contentArea.innerHTML = templates.products;

  const tableBody = document.querySelector('#productTable tbody');
  const tableHead = document.querySelector('#productTable thead');

  try {
    const response = await fetch('/api/admin/products');
    const allProducts = await response.json();

    tableHead.innerHTML = `<tr><th>Name</th><th>Status</th><th>Inventory</th><th>Price</th><th>Category</th><th>Actions</th></tr>`;

    tableBody.innerHTML =
      allProducts.length > 0
        ? allProducts
            .map(
              (p) => `
            <tr>
                <td>
                    ${p.name}
                    ${
                      p.inventory <= 0
                        ? '<span class="status-badge-outofstock">✔ Out of Stock</span>'
                        : ''
                    }
                </td>
                <td>
                    <span class="order-status-badge ${
                      p.inventory > 0 ? 'status-delivered' : 'status-processing'
                    }">
                        ${p.inventory > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                </td>
                <td>${p.inventory}</td>
                <td>$${parseFloat(p.price || 0).toFixed(2)}</td>
                <td>${p.category}</td>
                <td class="product-actions">
                    <a href="/admin/product-form.html?id=${
                      p.id
                    }" class="action-button text-sm">Edit</a>
                    <button onclick="deleteProduct(${
                      p.id
                    })" class="action-button-danger text-sm">Delete</button>
                </td>
            </tr>`
            )
            .join('')
        : `<tr><td colspan="6" class="text-center p-4">No products found. Add one to get started!</td></tr>`;
  } catch (error) {
    showToast('Error fetching products: ' + error.message, 'error');
  }
}

async function renderOrders() {
  pageTitle.textContent = 'Orders';
  contentArea.innerHTML = templates.orders;
  const tableBody = document.querySelector('#ordersTable tbody');
  try {
    const response = await fetch('/api/admin/orders');
    const orders = await response.json();
    tableBody.innerHTML =
      orders.length > 0
        ? orders
            .map(
              (o) => `
            <tr>
                <td>#${o.id}</td>
                <td>${o.username}</td>
                <td>${new Date(o.order_date).toLocaleString()}</td>
                <td>$${parseFloat(o.total_amount).toFixed(2)}</td>
                <td>
                    <select class="form-input" onchange="updateOrderStatus(${
                      o.id
                    }, this.value)">
                        <option value="Processing" ${
                          o.status === 'Processing' ? 'selected' : ''
                        }>Processing</option>
                        <option value="Shipped" ${
                          o.status === 'Shipped' ? 'selected' : ''
                        }>Shipped</option>
                        <option value="Delivered" ${
                          o.status === 'Delivered' ? 'selected' : ''
                        }>Delivered</option>
                        <option value="Cancelled" ${
                          o.status === 'Cancelled' ? 'selected' : ''
                        }>Cancelled</option>
                    </select>
                </td>
            </tr>`
            )
            .join('')
        : `<tr><td colspan="5" class="text-center p-4">No orders found.</td></tr>`;
  } catch (error) {
    showToast('Error fetching orders: ' + error.message, 'error');
  }
}

async function renderUsers() {
  pageTitle.textContent = 'Users';
  contentArea.innerHTML = templates.users;
  const tableBody = document.querySelector('#usersTable tbody');
  try {
    const response = await fetch('/api/admin/users');
    const users = await response.json();
    tableBody.innerHTML =
      users.length > 0
        ? users
            .map(
              (u) =>
                `<tr><td>${u.id}</td><td>${u.username}</td><td>${
                  u.email
                }</td><td>${new Date(
                  u.created_at
                ).toLocaleDateString()}</td></tr>`
            )
            .join('')
        : '<tr><td colspan="4" class="text-center p-4">No users found.</td></tr>';
  } catch (error) {
    showToast('Error fetching users: ' + error.message, 'error');
  }
}

// --- ACTION HANDLERS ---
async function deleteProduct(productId) {
  if (
    !confirm(
      'Are you sure you want to PERMANENTLY DELETE this product? This action cannot be undone.'
    )
  )
    return;
  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    showToast(
      response.ok ? result.message : result.error,
      response.ok ? 'success' : 'error'
    );
    if (response.ok) renderProducts();
  } catch (error) {
    showToast('Error deleting product: ' + error.message, 'error');
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    showToast(
      response.ok ? result.message : result.error,
      response.ok ? 'success' : 'error'
    );
  } catch (error) {
    showToast('Failed to update order status: ' + error.message, 'error');
  }
}

// --- NAVIGATION & INITIALIZATION ---
function setupNavigation() {
  const navLinks = {
    dashboard: renderDashboard,
    products: renderProducts,
    orders: renderOrders,
    users: renderUsers,
  };

  const renderContent = () => {
    const hash = window.location.hash.substring(1) || 'dashboard';
    const renderFunction = navLinks[hash] || renderDashboard;

    document
      .querySelectorAll('.sidebar-nav .sidebar-link')
      .forEach((l) => l.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-link[href="#${hash}"]`);
    if (activeLink) activeLink.classList.add('active');

    renderFunction();
  };

  window.addEventListener('hashchange', renderContent);
  renderContent();
}

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('role') !== 'admin') {
    window.location.href = '/login.html';
    return;
  }

  initDarkMode(document.getElementById('themeToggle'));
  setupNavigation();

  document.getElementById('logout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    showToast('Logged out successfully', 'success');
    window.location.href = '/login.html';
  });
});
