// Import necessary packages
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

// Set paths for ffmpeg and ffprobe
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = 3000;

// --- Create necessary directories ---
const uploadsDir = path.join(__dirname, 'uploads');
const processedDir = path.join(__dirname, 'public', 'videos');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir);

// --- WebSocket Helper Function ---
const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

// --- WebSocket Connection Handling ---
wss.on('connection', ws => {
    console.log('Client connected via WebSocket');
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/videos', express.static(path.join(__dirname, 'public', 'videos')));

// --- API Endpoint for Processing Video ---
app.post('/process', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');

    const inputPath = req.file.path;
    const outputFileName = `trimmed-${path.parse(req.file.filename).name}.mp4`;
    const outputPath = path.join(processedDir, outputFileName);
    const { threshold, duration } = req.body;

    broadcast({ type: 'log', message: `--- Received new video processing request ---` });
    broadcast({ type: 'log', message: `Processing ${req.file.originalname}... (This may be slow for large files)` });
    broadcast({ type: 'log', message: `Settings: Threshold=${threshold}dB, Duration=${duration}s` });

    let silenceData = '';

    ffmpeg(inputPath)
        .withAudioFilter(`silencedetect=noise=${threshold}dB:d=${duration}`)
        .format('null').output('-')
        .on('stderr', (stderrLine) => {
            if (stderrLine.includes('silence_start') || stderrLine.includes('silence_end')) {
                silenceData += stderrLine + '\n';
            }
        })
        .on('end', () => {
            broadcast({ type: 'log', message: 'Silence detection finished.' });
            ffmpeg.ffprobe(inputPath, (err, metadata) => {
                if (err) return res.status(500).send('Error getting video metadata.');
                
                const totalDuration = metadata.format.duration;
                const audibleSegments = parseSilenceData(silenceData, totalDuration);

                if (audibleSegments.length === 0) {
                    broadcast({ type: 'error', message: 'No audible segments found.' });
                    return res.status(400).send('No audible segments found.');
                }
                
                const segmentsLog = JSON.stringify(audibleSegments, null, 2);
                broadcast({ type: 'log', message: `Audible segments:\n${segmentsLog}` });

                // --- RELIABLE (but slower) PROCESSING LOGIC ---
                const filter = filterComplex(audibleSegments);

                ffmpeg(inputPath)
                    .complexFilter(filter, ['v', 'a'])
                    .on('progress', (progress) => {
                        broadcast({ type: 'progress', percent: progress.percent });
                    })
                    .on('end', () => {
                        broadcast({ type: 'log', message: 'Processing finished successfully!' });
                        fs.unlinkSync(inputPath);
                        broadcast({ type: 'done', downloadUrl: `/videos/${outputFileName}` });
                        res.status(200).send('Processing started.');

                        // Automatically delete the processed file after 10 minutes
                        setTimeout(() => {
                            fs.unlink(outputPath, (err) => {
                                if (err && err.code !== 'ENOENT') {
                                    console.error(`Error deleting temporary file ${outputPath}:`, err);
                                } else {
                                    console.log(`Successfully deleted temporary file: ${outputPath}`);
                                }
                            });
                        }, 10 * 60 * 1000); // 10 minutes in milliseconds
                    })
                    .on('error', (err) => {
                        broadcast({ type: 'error', message: `Error during video processing: ${err.message}` });
                        fs.unlinkSync(inputPath);
                    })
                    .save(outputPath);
            });
        })
        .on('error', (err) => {
            broadcast({ type: 'error', message: `Error during silence detection: ${err.message}` });
            fs.unlinkSync(inputPath);
            res.status(500).send('Error analyzing video.');
        })
        .run();
});

const parseSilenceData = (data, totalDuration) => {
    const lines = data.trim().split('\n');
    let lastSilenceEnd = 0;
    const audibleSegments = [];
    lines.forEach(line => {
        const startMatch = line.match(/silence_start: ([\d.]+)/);
        if (startMatch) {
            const silenceStart = parseFloat(startMatch[1]);
            if (silenceStart > lastSilenceEnd) {
                audibleSegments.push({ start: lastSilenceEnd, end: silenceStart });
            }
        }
        const endMatch = line.match(/silence_end: ([\d.]+)/);
        if (endMatch) {
            lastSilenceEnd = parseFloat(endMatch[1].split(' ')[0]);
        }
    });
    if (totalDuration > lastSilenceEnd) {
        audibleSegments.push({ start: lastSilenceEnd, end: totalDuration });
    }
    return audibleSegments;
};

const filterComplex = (segments) => {
    return segments.map((segment, index) =>
        `[0:v]trim=start=${segment.start}:end=${segment.end},setpts=PTS-STARTPTS[v${index}];` +
        `[0:a]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS[a${index}];`
    ).join('') +
    segments.map((_, index) => `[v${index}][a${index}]`).join('') +
    `concat=n=${segments.length}:v=1:a=1[v][a]`;
};


// --- Start the server ---
server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
