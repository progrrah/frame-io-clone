document.addEventListener('DOMContentLoaded', () => {
    const projectList = document.getElementById('project-list');
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
  
    uploadForm.addEventListener('submit', (event) => {
      event.preventDefault();
  
      const file = fileInput.files[0];
      if (file) {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.innerHTML = `
          <h3>${file.name}</h3>
          <video width="200" controls>
            <source src="${URL.createObjectURL(file)}" type="${file.type}">
            Your browser does not support the video tag.
          </video>
        `;
  
        projectList.appendChild(projectCard);
        fileInput.value = ''; // Reset input
      } else {
        alert('Please select a file to upload.');
      }
    });
  });
  