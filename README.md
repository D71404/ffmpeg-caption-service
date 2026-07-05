# FFmpeg Caption Service

A Node.js/Express microservice that burns captions into videos using FFmpeg.

## Features

- Download videos from URL
- Burn in timed captions using FFmpeg's drawtext filter
- Support for custom aspect ratios (9:16, 16:9, etc.)
- API key authentication
- RESTful API

## Prerequisites

- Node.js 18+
- FFmpeg (automatically installed in Docker)
- Docker (optional, for containerized deployment)

## Installation

### Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and set your API_KEY
nano .env

# Start the server
npm start
```

### Docker

```bash
# Build the image
docker build -t ffmpeg-caption-service .

# Run the container
docker run -p 3000:3000 -e API_KEY=your-secret-key ffmpeg-caption-service
```

## API Documentation

### Authentication

All requests require an API key passed in the `x-api-key` header.

```bash
x-api-key: your-secret-key
```

### Endpoints

#### POST /caption

Burns captions into a video.

**Request Body:**

```json
{
  "videoUrl": "https://example.com/video.mp4",
  "aspectRatio": "9:16",
  "captions": [
    {
      "text": "Hello world",
      "start": 0,
      "end": 2.5
    },
    {
      "text": "This is a caption",
      "start": 2.5,
      "end": 5.0
    }
  ]
}
```

**Parameters:**

- `videoUrl` (string, required): URL of the video to process
- `aspectRatio` (string, optional): Aspect ratio for caption positioning (e.g., "9:16", "16:9")
- `captions` (array, required): Array of caption objects
  - `text` (string): Caption text to display
  - `start` (number): Start time in seconds
  - `end` (number): End time in seconds

**Response:**

```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "resultUrl": "http://localhost:3000/output/550e8400-e29b-41d4-a716-446655440000_output.mp4",
  "message": "Captions burned successfully"
}
```

#### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "service": "ffmpeg-caption-service"
}
```

## Example Usage

```bash
curl -X POST http://localhost:3000/caption \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{
    "videoUrl": "https://example.com/video.mp4",
    "aspectRatio": "9:16",
    "captions": [
      {
        "text": "Welcome to the video",
        "start": 0,
        "end": 3
      },
      {
        "text": "Here are some captions",
        "start": 3,
        "end": 6
      }
    ]
  }'
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `API_KEY` - API key for authentication (required)

## Output

Processed videos are stored in the `output/` directory and served via the `/output` endpoint.

## License

MIT
