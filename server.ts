import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Generate Image Endpoint
  app.post('/api/generate-image', async (req, res) => {
    try {
      const { description, size } = req.body;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: description || 'A professional company logo, vector style, flat colors' }]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: size || "1K"
          }
        }
      });
      
      let base64Image = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
      
      if (base64Image) {
        res.json({ imageUrl: base64Image });
      } else {
        res.status(500).json({ error: 'No image generated in the response.' });
      }
    } catch (error: any) {
      console.error('Image generation error:', error);
      res.status(500).json({ error: error.message || 'Image generation failed' });
    }
  });

  // Start Video Generation Endpoint
  app.post('/api/generate-video', async (req, res) => {
    try {
      const { image, mimeType, description, aspectRatio } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: 'Image data is required.' });
      }

      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: description || 'A beautiful, cinematic logo animation reveal',
        image: {
          imageBytes: image,
          mimeType: mimeType || 'image/png',
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio || '16:9'
        }
      });
      
      res.json({ operationName: operation.name });
    } catch (error: any) {
      console.error('Video generation start error:', error);
      res.status(500).json({ error: error.message || 'Video generation failed to start' });
    }
  });

  // Poll Video Generation Status Endpoint
  app.post('/api/video-status', async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) return res.status(400).json({ error: 'operationName is required' });
      
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      
      res.json({ done: updated.done });
    } catch (error: any) {
      console.error('Video status error:', error);
      res.status(500).json({ error: error.message || 'Video status check failed' });
    }
  });

  // Download Generated Video Endpoint
  app.post('/api/video-download', async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) return res.status(400).json({ error: 'operationName is required' });
      
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) {
        return res.status(404).json({ error: 'Video URI not found on completed operation.' });
      }
      
      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY as string },
      });
      
      if (!videoRes.ok) {
        throw new Error(`Failed to fetch video from URI: ${videoRes.statusText}`);
      }
      
      res.setHeader('Content-Type', 'video/mp4');
      const arrayBuffer = await videoRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error('Video download error:', error);
      res.status(500).json({ error: error.message || 'Video download failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
