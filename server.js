const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const fetch = require('node-fetch');

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

// Загрузка файла в локальную директорию
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File not uploaded' });
  }
  res.json({ filePath: `/uploads/${req.file.filename}` });
});

// Загрузка файла на Yandex Disk
app.post('/yandex/upload', upload.single('file'), async (req, res) => {
  const { token } = req.body;
  const file = req.file;

  if (!token || !file) {
    return res.status(400).json({ error: 'Token and file are required.' });
  }

  try {
    const uploadLinkResponse = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(file.originalname)}`,
      {
        headers: {
          Authorization: `OAuth ${token}`,
        },
      }
    );

    if (!uploadLinkResponse.ok) {
      throw new Error('Failed to get upload link.');
    }

    const { href } = await uploadLinkResponse.json();

    await fetch(href, {
      method: 'PUT',
      body: fs.createReadStream(file.path),
    });

    res.json({ success: true, message: 'File uploaded to Yandex Disk successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение списка файлов с Yandex Disk
app.get('/yandex/files', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(400).json({ error: 'Token is required.' });
  }

  try {
    const response = await fetch('https://cloud-api.yandex.net/v1/disk/resources?path=disk:/', {
      headers: {
        Authorization: `OAuth ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch files.');
    }

    const data = await response.json();
    res.json(data._embedded.items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Удаление файла с Yandex Disk
app.delete('/yandex/delete/:filename', async (req, res) => {
  const token = req.headers.authorization;
  const { filename } = req.params;

  if (!token || !filename) {
    return res.status(400).json({ error: 'Token and filename are required.' });
  }

  try {
    const response = await fetch(`https://cloud-api.yandex.net/v1/disk/resources?path=disk:/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `OAuth ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete file.');
    }

    res.json({ success: true, message: 'File deleted from Yandex Disk successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Удаление файлов из локальной директории
app.delete('/delete/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ message: 'File deleted' });
  }
  res.status(404).json({ error: 'File not found' });
});

// Получение списка файлов из локальной директории
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
