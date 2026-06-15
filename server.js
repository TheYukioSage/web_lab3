const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Налаштування middleware для обробки JSON та запитів з інших доменів/портів
app.use(cors());
app.use(express.json());

// Вказуємо серверу роздавати статичні файли прямо з поточної папки
app.use(express.static(path.join(__dirname)));

// Підключення до бази даних SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Помилка підключення до БД:', err.message);
    } else {
        console.log('Підключено до бази даних SQLite.');
        
        // Створення таблиці користувачів, якщо вона ще не існує
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT,
            email TEXT UNIQUE,
            gender TEXT,
            birthDate TEXT,
            password TEXT
        )`);
    }
});

// ==========================================
// API ЕНДПОЇНТИ
// ==========================================

// 1. Реєстрація нового користувача
app.post('/api/register', (req, res) => {
    const { fullName, email, gender, birthDate, password } = req.body;

    const sql = 'INSERT INTO users (fullName, email, gender, birthDate, password) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [fullName, email, gender, birthDate, password], function(err) {
        if (err) {
            // Перевірка на унікальність email
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ message: 'Користувач з таким email вже існує.' });
            }
            return res.status(500).json({ message: 'Помилка сервера при реєстрації.' });
        }
        res.status(201).json({ message: 'Реєстрація успішна!', userId: this.lastID });
    });
});

// 2. Вхід користувача
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.get(sql, [email, password], (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Помилка сервера при вході.' });
        }
        if (!row) {
            return res.status(401).json({ message: 'Невірний email або пароль.' });
        }
        // Повертаємо email користувача для збереження на фронтенді (замість токена для простоти)
        res.status(200).json({ message: 'Вхід успішний', user: row.email });
    });
});

// 3. Отримання даних профілю
app.get('/api/profile', (req, res) => {
    const { email } = req.query;

    const sql = 'SELECT fullName, email, gender, birthDate FROM users WHERE email = ?';
    db.get(sql, [email], (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Помилка сервера.' });
        }
        if (!row) {
            return res.status(404).json({ message: 'Користувача не знайдено.' });
        }
        res.status(200).json(row);
    });
});

// 4. Оновлення даних профілю
app.put('/api/profile', (req, res) => {
    const { fullName, gender, birthDate, email } = req.body;

    const sql = 'UPDATE users SET fullName = ?, gender = ?, birthDate = ? WHERE email = ?';
    db.run(sql, [fullName, gender, birthDate, email], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Помилка при оновленні профілю.' });
        }
        res.status(200).json({ message: 'Профіль успішно оновлено.' });
    });
});

// ==========================================
// ЗАПУСК СЕРВЕРА
// ==========================================
app.listen(PORT, () => {
    console.log(`Сервер успішно запущено! Відкрийте http://localhost:${PORT}/index.html у вашому браузері.`);
});