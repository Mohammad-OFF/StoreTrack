import { showToast, showLoading, initDarkMode } from '/js/utils.js';

// --- CORE USER FUNCTIONS ---
function checkUserRole() {
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  if (role !== 'user' || !userId) {
    window.location.href = '/login.html';
    return null;
  }
  return userId;
}

function setupCommonListeners(userId) {
  const logoutLink = document.getElementById('logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.clear();
      showToast('Logged out successfully.', 'success');
      window.location.href = '/login.html';
    });
  }

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    initDarkMode(themeToggle);
  }

  updateCartCount(userId);
}

// --- DASHBOARD PAGE ---
async function renderUserDashboard(userId) {
  try {
    showLoading(true);
    const response = await fetch(`/api/user/dashboard/${userId}`);
    const data = await response.json();

    document.getElementById(
      'welcome-message'
    ).textContent = `Welcome back, ${data.username}!`;

    const ordersList = document.getElementById('recent-orders-list');
    if (data.recentOrders && data.recentOrders.length > 0) {
      ordersList.innerHTML = data.recentOrders
        .map(
          (order) => `
                <li class="recent-order-item">
                    <div><strong>Order #${
                      order.id
                    }</strong><br><small>${new Date(
            order.order_date
          ).toLocaleDateString()}</small></div>
                    <span class="order-status-badge status-${order.status.toLowerCase()}">${
            order.status
          }</span>
                </li>`
        )
        .join('');
    } else {
      ordersList.innerHTML = `<p>You have no recent orders.</p>`;
    }

    const categoryGrid = document.getElementById('category-grid');
    if (data.categories && data.categories.length > 0) {
      categoryGrid.innerHTML = data.categories
        .map(
          (cat) => `
                <a href="/user/products.html?category=${encodeURIComponent(
                  cat
                )}" class="category-card">
                    <div class="category-card-overlay"><span class="category-card-name">${cat}</span></div>
                </a>`
        )
        .join('');
    } else {
      categoryGrid.innerHTML = `<p>No product categories found.</p>`;
    }
  } catch (error) {
    showToast('Could not load dashboard data.', 'error');
  } finally {
    showLoading(false);
  }
}

// --- PRODUCTS PAGE ---
async function fetchAndDisplayProducts(userId) {
  const productGrid = document.getElementById('product-grid');
  if (!productGrid) return;
  try {
    showLoading(true);
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');

    const response = await fetch('/api/products');
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    let products = await response.json();

    if (category) {
      products = products.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
      document.getElementById(
        'page-title'
      ).textContent = `Showing: ${category}`;
    }

    productGrid.innerHTML =
      products.length > 0
        ? products
            .map(
              (p) => `
            <div class="product-card">
                <div class="product-info">
                    <h3 class="product-name">${p.name}</h3>
                    <p class="product-category">${p.category}</p>
                    <p class="product-price">$${parseFloat(
                      p.price || 0
                    ).toFixed(2)}</p>
                    <button class="add-to-cart-btn action-button w-full" data-product-id="${
                      p.id
                    }">Add to Cart</button>
                </div>
            </div>`
            )
            .join('')
        : `<p class="empty-cart-message">No products are currently available. Please check back later.</p>`;

    document.querySelectorAll('.add-to-cart-btn').forEach((button) => {
      button.addEventListener('click', () =>
        addToCart(userId, button.dataset.productId)
      );
    });
  } catch (error) {
    console.error('A critical error occurred while fetching products:', error);
    productGrid.innerHTML = `
            <div style="color: red; border: 2px solid red; padding: 1rem; border-radius: 0.5rem;">
                <strong>Error: Could not load products.</strong><br><p><strong>Details:</strong> ${error.message}</p>
            </div>`;
    showToast('Error fetching products.', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Sets up the real-time search filter for the products page.
 */
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach((card) => {
      const cardText = card.textContent.toLowerCase();
      if (cardText.includes(query)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

// --- CART LOGIC ---
async function addToCart(userId, productId) {
  try {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, productId, quantity: 1 }),
    });
    const result = await response.json();
    if (response.ok) {
      showToast(result.message, 'success');
      updateCartCount(userId);
    } else {
      showToast(result.error, 'error');
    }
  } catch (error) {
    showToast('Error adding to cart: ' + error.message, 'error');
  }
}

async function updateCartCount(userId) {
  const cartCountBadge = document.getElementById('cart-count');
  if (!cartCountBadge) return;
  try {
    const response = await fetch(`/api/cart/${userId}`);
    const cartItems = await response.json();
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    cartCountBadge.textContent = totalItems;
    cartCountBadge.style.display = totalItems > 0 ? 'inline-flex' : 'none';
  } catch (error) {
    console.error('Failed to fetch cart count:', error);
  }
}

async function fetchAndDisplayCart(userId) {
  const cartItemsContainer = document.getElementById('cart-items');
  const cartSummary = document.getElementById('cart-summary');
  if (!cartItemsContainer) return;

  try {
    showLoading(true);
    const response = await fetch(`/api/cart/${userId}`);
    const cartItems = await response.json();

    if (cartItems.length === 0) {
      cartItemsContainer.innerHTML = `<div class="empty-cart-message">Your cart is empty. <a href="/user/products.html" class="nav-link">Start Shopping!</a></div>`;
      cartSummary.classList.add('hidden');
    } else {
      cartSummary.classList.remove('hidden');
      cartItemsContainer.innerHTML = cartItems
        .map(
          (item) => `
                <div class="cart-item" data-product-id="${item.id}">
                    <div class="cart-item-details"><p class="cart-item-name">${
                      item.name
                    }</p><p class="cart-item-price">$${parseFloat(
            item.price
          ).toFixed(2)}</p></div>
                    <div class="cart-item-quantity"><button class="quantity-btn" data-change="-1">-</button><input type="number" class="quantity-input" value="${
                      item.quantity
                    }" min="0"><button class="quantity-btn" data-change="1">+</button></div>
                    <p class="cart-item-total">$${parseFloat(
                      item.total_price
                    ).toFixed(2)}</p>
                </div>`
        )
        .join('');

      updateCartSummary(cartItems);
      setupCartItemListeners(userId);
    }
  } catch (error) {
    showToast('Error fetching cart: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

function setupCartItemListeners(userId) {
  document.querySelectorAll('.cart-item').forEach((item) => {
    const productId = item.dataset.productId;
    const input = item.querySelector('.quantity-input');

    const updateItem = () => {
      let newQuantity = parseInt(input.value);
      if (isNaN(newQuantity) || newQuantity < 0) newQuantity = 0;
      updateCartItem(userId, productId, newQuantity);
    };

    item.querySelectorAll('.quantity-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        input.value = Math.max(
          0,
          parseInt(input.value) + parseInt(btn.dataset.change)
        );
        updateItem();
      });
    });
    input.addEventListener('change', updateItem);
  });
}

async function updateCartItem(userId, productId, quantity) {
  try {
    showLoading(true);
    const response = await fetch('/api/cart/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, productId, quantity }),
    });
    if (response.ok) {
      fetchAndDisplayCart(userId);
      updateCartCount(userId);
    } else {
      showToast((await response.json()).error, 'error');
    }
  } catch (error) {
    showToast('Failed to update cart: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

function updateCartSummary(cartItems) {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.total_price),
    0
  );
  const tax = subtotal * 0.19;
  const total = subtotal + tax;
  document.getElementById(
    'summary-subtotal'
  ).textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('summary-tax').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('summary-total').textContent = `$${total.toFixed(2)}`;
}

async function handleCheckout(userId) {
  if (!confirm('Are you sure you want to place this order?')) return;
  try {
    showLoading(true);
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const result = await response.json();
    if (response.ok) {
      showToast(result.message, 'success');
      window.location.href = '/user/orders.html';
    } else {
      showToast(result.error, 'error');
    }
  } catch (error) {
    showToast('Checkout failed: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

// --- ORDERS PAGE ---
async function renderUserOrders(userId) {
  const tableBody = document.querySelector('#ordersTable tbody');
  if (!tableBody) return;
  try {
    showLoading(true);
    const response = await fetch(`/api/user/orders/${userId}`);
    const orders = await response.json();
    tableBody.innerHTML =
      orders.length > 0
        ? orders
            .map(
              (o) => `
            <tr>
                <td>#${o.id}</td>
                <td>${new Date(o.order_date).toLocaleString()}</td>
                <td>$${parseFloat(o.total_amount).toFixed(2)}</td>
                <td>${o.status}</td>
            </tr>`
            )
            .join('')
        : `<tr><td colspan="4" class="text-center p-4">You have not placed any orders yet.</td></tr>`;
  } catch (error) {
    showToast('Error fetching your orders: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  const userId = checkUserRole();
  if (!userId) return;

  const path = window.location.pathname;

  setupCommonListeners(userId);

  if (path.endsWith('/dashboard.html') || path.endsWith('/user/')) {
    renderUserDashboard(userId);
  } else if (path.endsWith('/products.html')) {
    fetchAndDisplayProducts(userId);
    setupSearch(); // This line activates the search bar
  } else if (path.endsWith('/cart.html')) {
    fetchAndDisplayCart(userId);
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => handleCheckout(userId));
    }
  } else if (path.endsWith('/orders.html')) {
    renderUserOrders(userId);
  }
});
