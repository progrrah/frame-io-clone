const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Маршруты API
// Загрузка файлов
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File not uploaded' });
  }
  res.json({ filePath: `/uploads/${req.file.filename}` });
});

// Удаление файлов
app.delete('/delete/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ message: 'File deleted' });
  }
  res.status(404).json({ error: 'File not found' });
});

// Получение списка файлов
app.get('/files', (req, res) => {
  const uploadPath = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadPath)) {
    return res.json([]);
  }
  const files = fs.readdirSync(uploadPath).map(file => ({
    name: file,
    path: `/uploads/${file}`,
  }));
  res.json(files);
});

// Обработка всех остальных маршрутов для SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
