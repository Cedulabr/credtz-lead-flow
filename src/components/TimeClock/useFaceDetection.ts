import { useState, useCallback, useRef } from 'react';
import type { FaceDetectionResult, AuditFlag } from './types';

// face-api.js CDN URL for models
const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

let faceapi: any = null;
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

async function loadFaceApi(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // Dynamic import of face-api.js
      const module = await import('face-api.js');
      faceapi = module;

      // Load the tiny face detector model (smallest and fastest)
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
      modelsLoaded = true;
    } catch (error) {
      console.error('Failed to load face-api.js:', error);
      throw error;
    }
  })();

  return loadingPromise;
}

// Calculate image sharpness using Laplacian variance
function calculateSharpness(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 100;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Convert to grayscale and calculate Laplacian variance
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Grayscale value at current pixel
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      // Grayscale values at neighboring pixels
      const top = (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3;
      const bottom = (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3;
      const left = (data[(y * width + x - 1) * 4] + data[(y * width + x - 1) * 4 + 1] + data[(y * width + x - 1) * 4 + 2]) / 3;
      const right = (data[(y * width + x + 1) * 4] + data[(y * width + x + 1) * 4 + 1] + data[(y * width + x + 1) * 4 + 2]) / 3;
      
      // Laplacian
      const laplacian = Math.abs(top + bottom + left + right - 4 * gray);
      
      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 100;

  const mean = sum / count;
  const variance = (sumSq / count) - (mean * mean);
  
  // Normalize variance to a 0-100 scale (empirical thresholds)
  // Lower variance = blurrier image
  return Math.min(100, variance / 5);
}

export function useFaceDetection() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initAttempted = useRef(false);

  const initialize = useCallback(async () => {
    if (isReady || initAttempted.current) return;
    initAttempted.current = true;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await loadFaceApi();
      setIsReady(true);
    } catch (err) {
      setError('Falha ao carregar detecção facial');
      console.error('Face detection init error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  const detectFaces = useCallback(async (
    imageSource: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement
  ): Promise<FaceDetectionResult> => {
    const flags: AuditFlag[] = [];
    let faceCount = 0;
    let confidence = 0;
    let isBlurry = false;

    // Check blur first (works without face-api)
    if (imageSource instanceof HTMLCanvasElement) {
      const sharpness = calculateSharpness(imageSource);
      if (sharpness < 30) {
        isBlurry = true;
        flags.push({
          code: 'foto_borrada',
          label: 'Foto borrada ou de baixa qualidade',
          scoreDelta: -20,
        });
      }
    }

    // Try face detection if face-api is loaded
    if (modelsLoaded && faceapi) {
      try {
        const detections = await faceapi.detectAllFaces(
          imageSource,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        );

        faceCount = detections.length;
        confidence = faceCount > 0 ? Math.max(...detections.map((d: any) => d.score)) * 100 : 0;

        if (faceCount === 0) {
          flags.push({
            code: 'foto_invalida',
            label: 'Nenhum rosto detectado',
            scoreDelta: -80,
          });
        } else if (faceCount > 1) {
          flags.push({
            code: 'multiplos_rostos',
            label: `${faceCount} rostos detectados`,
            scoreDelta: -40,
          });
        }
      } catch (err) {
        console.error('Face detection error:', err);
        // Don't penalize if detection fails - continue without face validation
      }
    }

    return {
      faceCount,
      confidence,
      isBlurry,
      flags,
    };
  }, []);

  const validatePhoto = useCallback(async (
    canvas: HTMLCanvasElement
  ): Promise<FaceDetectionResult> => {
    // Initialize if not ready
    if (!isReady && !isLoading) {
      await initialize();
    }
    
    return detectFaces(canvas);
  }, [isReady, isLoading, initialize, detectFaces]);

  return {
    isLoading,
    isReady,
    error,
    initialize,
    detectFaces,
    validatePhoto,
  };
}
