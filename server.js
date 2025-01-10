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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Для хранения аннотаций в памяти (можно заменить на базу данных)
const annotationsData = {};

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
    type: path.extname(file).toLowerCase(),
  }));
  res.json(files);
});

// Фильтрация файлов по типу
app.get('/files/filter', (req, res) => {
  const { type } = req.query;
  const uploadPath = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadPath)) {
    return res.json([]);
  }
  const files = fs.readdirSync(uploadPath)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      if (type === 'video') {
        return ['.mp4', '.avi', '.mov'].includes(ext);
      } else if (type === 'text') {
        return ['.md', '.txt'].includes(ext);
      }
      return false;
    })
    .map(file => ({
      name: file,
      path: `/uploads/${file}`,
      type: path.extname(file).toLowerCase(),
    }));
  res.json(files);
});

// Поиск файлов
app.get('/search', (req, res) => {
  const { query } = req.query;
  const uploadPath = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadPath)) {
    return res.json([]);
  }
  const files = fs.readdirSync(uploadPath)
    .filter(file => file.toLowerCase().includes(query.toLowerCase()))
    .map(file => ({
      name: file,
      path: `/uploads/${file}`,
    }));
  res.json(files);
});

// Сохранение аннотаций
app.post('/annotations', (req, res) => {
  const { videoPath, annotations } = req.body;

  if (!videoPath || !Array.isArray(annotations)) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  annotationsData[videoPath] = annotations;
  res.json({ message: 'Annotations saved' });
});

// Загрузка аннотаций для определенного видео
app.get('/annotations', (req, res) => {
  const { video } = req.query;

  if (!video) {
    return res.status(400).json({ error: 'Video parameter is required' });
  }

  const annotations = annotationsData[video] || [];
  res.json({ annotations });
});

// Загрузка всех аннотаций
app.get('/all-annotations', (req, res) => {
  res.json(annotationsData);
});

// Маршрут для annotation.html
app.get('/annotation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'annotation.html'));
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
