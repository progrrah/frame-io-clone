const API_BASE_URL = 'https://cloud-api.yandex.net/v1/disk';

// Установите ваш токен доступа
const ACCESS_TOKEN = 'YANDEX_TOKEN=y0__wgBEImhkZkDGO2oNCCPk-P_EcXXnTZAEG_FOStEgplh23vJQU1B';

// Утилита для выполнения запросов
async function yandexDiskRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    Authorization: `OAuth ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error: ${error.message}`);
  }

  return response.json();
}

// Получение списка файлов и папок
async function getDiskContents(path = '/') {
  try {
    const data = await yandexDiskRequest(`/resources?path=${encodeURIComponent(path)}`);
    console.log('Disk Contents:', data);
    return data;
  } catch (error) {
    console.error('Failed to fetch disk contents:', error);
  }
}

// Загрузка файла на Яндекс.Диск
async function uploadFileToDisk(filePath, file) {
  try {
    // Получить URL для загрузки
    const uploadData = await yandexDiskRequest(`/resources/upload?path=${encodeURIComponent(filePath)}`, 'GET');

    // Загрузить файл на указанный URL
    const uploadResponse = await fetch(uploadData.href, {
      method: 'PUT',
      body: file,
    });

    if (uploadResponse.ok) {
      console.log('File uploaded successfully.');
    } else {
      console.error('Failed to upload file.');
    }
  } catch (error) {
    console.error('Failed to upload file:', error);
  }
}

// Удаление файла или папки с Яндекс.Диска
async function deleteFromDisk(path) {
  try {
    await yandexDiskRequest(`/resources?path=${encodeURIComponent(path)}`, 'DELETE');
    console.log('File or folder deleted successfully.');
  } catch (error) {
    console.error('Failed to delete file or folder:', error);
  }
}

// Пример использования (добавьте вызовы функций в зависимости от ваших потребностей)

document.getElementById('getFiles').addEventListener('click', async () => {
    const files = await getDiskContents();
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Очистить список
  
    // Отобразить файлы
    files._embedded.items.forEach(file => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.textContent = file.name;
      fileList.appendChild(li);
    });
  });
  
  document.getElementById('uploadFile').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
  
    if (!file) {
      alert('Please select a file to upload.');
      return;
    }
  
    const filePath = `/${file.name}`;
    await uploadFileToDisk(filePath, file);
    alert('File uploaded successfully.');
  });
  