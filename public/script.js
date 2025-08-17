// DOM Elements
const videoUpload = document.getElementById('video-upload');
const uploadLabel = document.querySelector('label[for="video-upload"]');
const fileNameDisplay = document.getElementById('file-name');
const thresholdSlider = document.getElementById('threshold');
const thresholdValue = document.getElementById('threshold-value');
const durationSlider = document.getElementById('duration');
const durationValue = document.getElementById('duration-value');
const processBtn = document.getElementById('process-btn');
const progressSection = document.getElementById('progress-section');
const statusText = document.getElementById('status-text');
const progressBar = document.getElementById('progress-bar');
const logOutput = document.getElementById('log-output');
const resultSection = document.getElementById('result-section');
const resultVideo = document.getElementById('result-video');
const downloadLink = document.getElementById('download-link');

// Modal Elements
const aboutLink = document.getElementById('about-link');
const contactLink = document.getElementById('contact-link');
const aboutModal = document.getElementById('about-modal');
const contactModal = document.getElementById('contact-modal');
const closeAboutModal = document.getElementById('close-about-modal');
const closeContactModal = document.getElementById('close-contact-modal');

let videoFile = null;

// --- WebSocket Setup ---
const socket = new WebSocket(`ws://${window.location.host}`);

socket.onopen = () => {
    console.log('WebSocket connection established.');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'log') {
        logOutput.textContent += data.message + '\n';
        logOutput.scrollTop = logOutput.scrollHeight; // Auto-scroll
    } else if (data.type === 'progress') {
        // Processing takes up the second half of the progress bar (50% to 100%)
        const processingPercent = data.percent < 0 ? 0 : Math.round(data.percent);
        const totalProgress = 50 + Math.round(processingPercent / 2);
        statusText.textContent = `Server is processing... ${processingPercent}%`;
        progressBar.style.width = `${totalProgress}%`;
    } else if (data.type === 'done') {
        statusText.textContent = 'Processing Complete!';
        progressBar.style.width = `100%`; // Fill the bar on completion
        
        // Hide progress section after a short delay
        setTimeout(() => {
            progressSection.classList.add('hidden');
        }, 500);

        processBtn.disabled = false;
        
        resultVideo.src = data.downloadUrl;
        downloadLink.href = data.downloadUrl;
        downloadLink.download = `trimmed_${videoFile.name}`;
        resultSection.classList.remove('hidden');
    } else if (data.type === 'error') {
        statusText.textContent = 'An error occurred!';
        logOutput.textContent += `\n\nSERVER ERROR: ${data.message}\n`;
        progressSection.classList.add('hidden');
        processBtn.disabled = false;
    }
};

socket.onclose = () => {
    console.log('WebSocket connection closed.');
    logOutput.textContent += '\nConnection to server lost. Please refresh the page.';
};

// --- Helper function to handle file selection ---
const handleFileSelect = (file) => {
    if (!file) return;
    const validExtensions = ['.mp4', '.mov', '.webm', '.mkv', '.avi'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (validExtensions.includes(fileExtension)) {
        videoFile = file;
        fileNameDisplay.textContent = videoFile.name;
        processBtn.disabled = false;
        resultSection.classList.add('hidden');
    } else {
        alert(`Unsupported file type. Supported: ${validExtensions.join(', ')}`);
    }
};

// --- Event Listeners ---
videoUpload.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
uploadLabel.addEventListener('dragover', (e) => { e.preventDefault(); uploadLabel.classList.add('bg-gray-600'); });
uploadLabel.addEventListener('dragleave', (e) => { e.preventDefault(); uploadLabel.classList.remove('bg-gray-600'); });
uploadLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadLabel.classList.remove('bg-gray-600');
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
});
window.addEventListener('dragover', (e) => e.preventDefault(), false);
window.addEventListener('drop', (e) => e.preventDefault(), false);

thresholdSlider.addEventListener('input', (e) => { thresholdValue.textContent = `${e.target.value} dB`; });
durationSlider.addEventListener('input', (e) => { durationValue.textContent = `${parseFloat(e.target.value).toFixed(1)} s`; });
processBtn.addEventListener('click', () => { if (videoFile) processVideoWithXHR(); });

aboutLink.addEventListener('click', () => aboutModal.classList.remove('hidden'));
contactLink.addEventListener('click', () => contactModal.classList.remove('hidden'));
closeAboutModal.addEventListener('click', () => aboutModal.classList.add('hidden'));
closeContactModal.addEventListener('click', () => contactModal.classList.add('hidden'));
aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) aboutModal.classList.add('hidden'); });
contactModal.addEventListener('click', (e) => { if (e.target === contactModal) contactModal.classList.add('hidden'); });

const processVideoWithXHR = () => {
    processBtn.disabled = true;
    progressSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    statusText.textContent = 'Preparing to upload...';
    progressBar.style.width = '0%';
    logOutput.textContent = '';

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('threshold', thresholdSlider.value);
    formData.append('duration', durationSlider.value);

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            // Upload takes up the first half of the progress bar (0% to 50%)
            const totalProgress = Math.round(percentComplete / 2);
            statusText.textContent = `Uploading file... ${percentComplete}%`;
            progressBar.style.width = `${totalProgress}%`; 
            
            if (percentComplete === 100) {
                statusText.textContent = 'Upload complete. Analyzing audio...';
                logOutput.textContent = 'This may take a while for large files. Please wait.\n';
            }
        }
    });

    xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
             statusText.textContent = 'An error occurred during upload!';
             logOutput.textContent += `\n\nUPLOAD ERROR: ${xhr.responseText}\n`;
             processBtn.disabled = false;
        }
        // Success is now handled by the WebSocket 'done' message
    };
    
    xhr.onerror = () => {
        statusText.textContent = 'A network error occurred!';
        logOutput.textContent += `\n\nNETWORK ERROR: Could not connect to the server.\n`;
        processBtn.disabled = false;
    };

    xhr.open('POST', '/process', true);
    xhr.send(formData);
};

// Initial state
processBtn.disabled = true;
