require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const YANDEX_TOKEN = process.env.YANDEX_TOKEN;
const YANDEX_API_URL = 'https://cloud-api.yandex.net/v1/disk';

if (!YANDEX_TOKEN) {
  console.error('Error: YANDEX_TOKEN is not defined in .env');
  process.exit(1);
}

// Middleware
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

// Вспомогательные функции
const requestYandexAPI = async (url, options) => {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unknown error from Yandex.Disk API');
    }
    return data;
  } catch (error) {
    console.error(`Error with Yandex API request: ${error.message}`);
    throw new Error('Failed to communicate with Yandex.Disk API');
  }
};

// ===== Маршруты =====

// Получение списка файлов с Яндекс.Диска
app.get('/files', async (req, res) => {
  try {
    const data = await requestYandexAPI(`${YANDEX_API_URL}/resources/files`, {
      headers: { Authorization: `OAuth ${YANDEX_TOKEN}` },
    });

    res.json(data.items.map(item => ({
      name: item.name,
      path: item.file,
      type: path.extname(item.name).toLowerCase(),
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Загрузка файла на Яндекс.Диск
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const localFilePath = req.file.path;
    const fileName = req.file.originalname;

    // Получение ссылки для загрузки
    const { href } = await requestYandexAPI(`${YANDEX_API_URL}/resources/upload?path=${encodeURIComponent(fileName)}&overwrite=true`, {
      headers: { Authorization: `OAuth ${YANDEX_TOKEN}` },
    });

    // Загрузка файла
    const fileStream = fs.createReadStream(localFilePath);
    await fetch(href, {
      method: 'PUT',
      body: fileStream,
    });

    // Удаление локального файла
    fs.unlinkSync(localFilePath);

    res.json({ message: 'File uploaded successfully to Yandex.Disk' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Удаление файла с Яндекс.Диска
app.delete('/delete/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    await requestYandexAPI(`${YANDEX_API_URL}/resources?path=${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: { Authorization: `OAuth ${YANDEX_TOKEN}` },
    });

    res.json({ message: 'File deleted successfully from Yandex.Disk' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

// Загрузка аннотаций для видео
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

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== Запуск сервера =====
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
