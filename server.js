require('dotenv').config();
const express = require('express');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Ensure output directory exists
const OUTPUT_DIR = path.join(__dirname, 'output');
const TEMP_DIR = path.join(__dirname, 'temp');

async function ensureDirectories() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

// API Key middleware
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }

  next();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ffmpeg-caption-service' });
});

// Caption endpoint
app.post('/caption', authenticateApiKey, async (req, res) => {
  const { videoUrl, aspectRatio, captions } = req.body;

  // Validate input
  if (!videoUrl || !captions || !Array.isArray(captions)) {
    return res.status(400).json({
      error: 'Missing required fields: videoUrl and captions array required'
    });
  }

  const jobId = uuidv4();
  const inputPath = path.join(TEMP_DIR, `${jobId}_input.mp4`);
  const outputPath = path.join(OUTPUT_DIR, `${jobId}_output.mp4`);

  try {
    // Download video
    console.log(`[${jobId}] Downloading video from ${videoUrl}`);
    const response = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream',
      timeout: 60000
    });

    const writer = require('fs').createWriteStream(inputPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`[${jobId}] Video downloaded successfully`);

    // Build ffmpeg drawtext filters for captions
    const drawTextFilters = captions.map((caption, index) => {
      const { text, start, end } = caption;

      // Escape special characters for ffmpeg
      const escapedText = text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');

      // Calculate position based on aspect ratio
      const yPosition = aspectRatio === '9:16' ? 'h*0.75' : 'h*0.85';

      return `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${escapedText}':fontcolor=white:fontsize=48:borderw=3:bordercolor=black:x=(w-text_w)/2:y=${yPosition}:enable='between(t,${start},${end})'`;
    });

    const filterComplex = drawTextFilters.join(',');

    console.log(`[${jobId}] Processing ${captions.length} captions`);
    console.log(`[${jobId}] Filter string: ${filterComplex}`);

    // Process video with ffmpeg
    await new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .outputOptions([
          '-vf', filterComplex,
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-c:a', 'copy'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`[${jobId}] FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          console.log(`[${jobId}] Processing: ${progress.percent?.toFixed(1)}% done`);
        })
        .on('end', () => {
          console.log(`[${jobId}] Processing complete`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[${jobId}] FFmpeg error:`, err);
          reject(err);
        });

      command.run();
    });

    // Clean up input file
    await fs.unlink(inputPath).catch(err => console.error('Failed to delete input:', err));

    // Return result URL
    const resultUrl = `${req.protocol}://${req.get('host')}/output/${jobId}_output.mp4`;

    res.json({
      success: true,
      jobId,
      resultUrl,
      message: 'Captions burned successfully'
    });

  } catch (error) {
    console.error(`[${jobId}] Error:`, error);

    // Clean up files on error
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    res.status(500).json({
      error: 'Failed to process video',
      message: error.message
    });
  }
});

// Serve output files
app.use('/output', express.static(OUTPUT_DIR));

// Start server
ensureDirectories().then(() => {
  app.listen(PORT, () => {
    console.log(`FFmpeg Caption Service running on port ${PORT}`);
    console.log(`API Key required: ${process.env.API_KEY ? 'Yes' : 'WARNING: No API_KEY set!'}`);
  });
}).catch(err => {
  console.error('Failed to create directories:', err);
  process.exit(1);
});
