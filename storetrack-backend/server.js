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