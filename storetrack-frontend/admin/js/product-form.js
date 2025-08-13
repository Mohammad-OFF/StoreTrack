import { showToast, initDarkMode } from '/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('role') !== 'admin') {
    window.location.href = '/login.html';
    return;
  }

  initDarkMode(document.querySelector('.theme-toggle')); // This is the corrected line

  const form = document.getElementById('product-form');
  const pageTitle = document.getElementById('page-title');
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (productId) {
    // --- EDIT MODE ---
    pageTitle.textContent = 'Edit Product';
    fetchProductData(productId);
  } else {
    // --- ADD MODE ---
    pageTitle.textContent = 'Add New Product';
  }

  form.addEventListener('submit', handleFormSubmit);

  document.getElementById('logout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/login.html';
  });
});

async function fetchProductData(id) {
  try {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) {
      throw new Error('Product not found');
    }
    const product = await response.json();

    // Populate the form
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-inventory').value = product.inventory;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-category').value = product.category;
  } catch (error) {
    showToast(error.message, 'error');
    // Redirect if product not found, after showing toast
    setTimeout(() => {
      window.location.href = '/admin/dashboard.html#products';
    }, 2000);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const productId = form['product-id'].value;
  const data = Object.fromEntries(new FormData(form));
  delete data.id;

  const method = productId ? 'PUT' : 'POST';
  const url = productId ? `/api/products/${productId}` : '/api/add';

  try {
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (response.ok) {
      showToast(result.message, 'success');
      // Redirect back to the products list after a short delay
      setTimeout(() => {
        window.location.href = '/admin/dashboard.html#products';
      }, 1500);
    } else {
      showToast(result.error, 'error');
    }
  } catch (error) {
    showToast('Form submission failed: ' + error.message, 'error');
  }
}
