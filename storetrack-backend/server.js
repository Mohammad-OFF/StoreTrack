const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());

const frontendPath = path.join(__dirname, '..', 'storetrack-frontend');
app.use(express.static(frontendPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'storage_db',
};

const pool = mysql.createPool(dbConfig);

pool
  .getConnection()
  .then(() => console.log('✅ Connected to MySQL.'))
  .catch((err) => {
    console.error('❌ MySQL connection error:', err);
    process.exit(1);
  });

// --- USER AUTHENTICATION & REGISTRATION ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: 'Username and password are required' });
  }
  try {
    const [adminRows] = await pool.execute(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    );
    if (adminRows.length > 0) {
      const admin = adminRows[0];
      if (admin.password !== password) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      return res.json({
        message: 'Login successful',
        userId: admin.id,
        role: 'admin',
      });
    }
    const [userRows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    if (userRows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const user = userRows[0];
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.json({ message: 'Login successful', userId: user.id, role: 'user' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Failed to login: ' + error.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res
      .status(400)
      .json({ error: 'Username, password, and email are required' });
  }
  try {
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    const [existingAdmins] = await pool.execute(
      'SELECT * FROM admins WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existingUsers.length > 0 || existingAdmins.length > 0) {
      return res
        .status(400)
        .json({ error: 'Username or email already exists' });
    }
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, password, email]
    );
    res.json({ message: 'Registration successful', userId: result.insertId });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Failed to register: ' + error.message });
  }
});

app.get('/api/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    let [rows] = await pool.execute(
      'SELECT username, email FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) {
      [rows] = await pool.execute(
        'SELECT username, email FROM admins WHERE id = ?',
        [userId]
      );
    }
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// --- PRODUCT & INVENTORY APIS ---
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, inventory, price, category FROM products WHERE inventory > 0'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch products: ' + error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [
      id,
    ]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/add', async (req, res) => {
  const { name, inventory, price, category } = req.body;
  if (!name || inventory == null || price == null || !category) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO products (name, inventory, price, category) VALUES (?, ?, ?, ?)',
      [name, inventory, price, category]
    );
    res.json({ message: 'Product added', id: result.insertId });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product: ' + error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, inventory, price, category } = req.body;
  if (!name || inventory == null || price == null || !category) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const [result] = await pool.execute(
      'UPDATE products SET name = ?, inventory = ?, price = ?, category = ? WHERE id = ?',
      [name, inventory, price, category, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res
      .status(500)
      .json({ error: 'Failed to update product: ' + error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [
      productId,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res
      .status(500)
      .json({ error: 'Failed to delete product: ' + error.message });
  }
});

// --- USER SHOPPING CART & CHECKOUT ---
app.get('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [cartItems] = await pool.execute(
      `
            SELECT p.id, p.name, p.price, sc.quantity, (p.price * sc.quantity) as total_price
            FROM shopping_cart sc
            JOIN products p ON sc.product_id = p.id
            WHERE sc.user_id = ?`,
      [userId]
    );
    res.json(cartItems);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart: ' + error.message });
  }
});

app.post('/api/cart/add', async (req, res) => {
  const { userId, productId, quantity } = req.body;
  if (!userId || !productId || !quantity || quantity < 1) {
    return res
      .status(400)
      .json({ error: 'User ID, Product ID, and quantity are required.' });
  }
  try {
    const [existing] = await pool.execute(
      'SELECT * FROM shopping_cart WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    if (existing.length > 0) {
      await pool.execute(
        'UPDATE shopping_cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
        [quantity, userId, productId]
      );
    } else {
      await pool.execute(
        'INSERT INTO shopping_cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, productId, quantity]
      );
    }
    res.json({ message: 'Product added to cart.' });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res
      .status(500)
      .json({ error: 'Failed to add product to cart: ' + error.message });
  }
});

app.put('/api/cart/update', async (req, res) => {
  const { userId, productId, quantity } = req.body;
  if (!userId || !productId || quantity == null || quantity < 0) {
    return res
      .status(400)
      .json({ error: 'User ID, Product ID, and quantity are required.' });
  }
  try {
    if (quantity === 0) {
      await pool.execute(
        'DELETE FROM shopping_cart WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );
      res.json({ message: 'Product removed from cart.' });
    } else {
      await pool.execute(
        'UPDATE shopping_cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
        [quantity, userId, productId]
      );
      res.json({ message: 'Cart updated.' });
    }
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ error: 'Failed to update cart: ' + error.message });
  }
});

app.post('/api/checkout', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [cartItems] = await connection.execute(
      `
            SELECT sc.product_id, sc.quantity, p.price, p.inventory 
            FROM shopping_cart sc 
            JOIN products p ON sc.product_id = p.id 
            WHERE sc.user_id = ? FOR UPDATE`,
      [userId]
    );

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    let totalAmount = 0;
    for (const item of cartItems) {
      if (item.inventory < item.quantity) {
        await connection.rollback();
        return res
          .status(400)
          .json({
            error: `Insufficient inventory for a product in your cart.`,
          });
      }
      totalAmount += item.price * item.quantity;
    }

    const [orderResult] = await connection.execute(
      'INSERT INTO orders (user_id, total_amount) VALUES (?, ?)',
      [userId, totalAmount]
    );
    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );
      await connection.execute(
        'UPDATE products SET inventory = inventory - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    await connection.execute('DELETE FROM shopping_cart WHERE user_id = ?', [
      userId,
    ]);
    await connection.commit();
    res.json({ message: 'Checkout successful! Your order has been placed.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error during checkout:', error);
    res
      .status(500)
      .json({ error: 'Failed to process order: ' + error.message });
  } finally {
    connection.release();
  }
});

app.get('/api/user/orders/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [orders] = await pool.execute(
      'SELECT id, order_date, total_amount, status FROM orders WHERE user_id = ? ORDER BY order_date DESC',
      [userId]
    );
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

app.get('/api/user/dashboard/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [[user]] = await pool.execute(
      'SELECT username FROM users WHERE id = ?',
      [userId]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const [recentOrders] = await pool.execute(
      'SELECT id, status, order_date, total_amount FROM orders WHERE user_id = ? ORDER BY order_date DESC LIMIT 3',
      [userId]
    );
    const [categories] = await pool.execute(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category ASC'
    );
    res.json({
      username: user.username,
      recentOrders,
      categories: categories.map((c) => c.category),
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

