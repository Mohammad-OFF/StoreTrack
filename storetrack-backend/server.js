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

