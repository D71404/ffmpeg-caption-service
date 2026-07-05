FROM node:18-bullseye

# Install ffmpeg and DejaVu Sans Bold font
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-dejavu-core \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Verify the font file exists at the expected path
RUN echo "Verifying DejaVu Sans Bold font installation..." \
    && ls -lh /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf \
    && fc-list | grep -i "dejavu.*bold" \
    && echo "Font verification complete!"

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create directories for temp and output files
RUN mkdir -p temp output

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
