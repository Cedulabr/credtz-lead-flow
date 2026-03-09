import { useState, useCallback, useRef } from 'react';
import type { FaceDetectionResult, AuditFlag } from './types';

// face-api.js CDN URL for models
const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

let faceapi: any = null;
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 3;

async function loadFaceApi(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      console.log('[FaceDetection] Loading face-api.js...');
      
      // Dynamic import of face-api.js
      const module = await import('face-api.js');
      faceapi = module;

      // Load the tiny face detector model (smallest and fastest)
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
      modelsLoaded = true;
      loadAttempts = 0;
      console.log('[FaceDetection] ✓ Models loaded successfully');
    } catch (error) {
      console.error('[FaceDetection] ✗ Failed to load face-api.js:', error);
      loadAttempts++;
      loadingPromise = null; // Reset so it can retry
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
  const [isReady, setIsReady] = useState(modelsLoaded);
  const [error, setError] = useState<string | null>(null);
  const initAttempted = useRef(false);

  const initialize = useCallback(async () => {
    // Allow retry if previous attempts failed
    if (isReady) return true;
    if (initAttempted.current && loadAttempts >= MAX_LOAD_ATTEMPTS) {
      console.warn('[FaceDetection] Max load attempts reached, skipping');
      return false;
    }
    
    initAttempted.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      await loadFaceApi();
      setIsReady(true);
      return true;
    } catch (err) {
      const errorMsg = `Falha ao carregar detecção facial (tentativa ${loadAttempts}/${MAX_LOAD_ATTEMPTS})`;
      setError(errorMsg);
      console.error('[FaceDetection]', errorMsg, err);
      return false;
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
      console.log('[FaceDetection] Sharpness score:', sharpness);
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
        console.log('[FaceDetection] Running face detection...');
        const detections = await faceapi.detectAllFaces(
          imageSource,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        );

        faceCount = detections.length;
        confidence = faceCount > 0 ? Math.max(...detections.map((d: any) => d.score)) * 100 : 0;
        console.log('[FaceDetection] Detected', faceCount, 'faces, confidence:', confidence);

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
        console.error('[FaceDetection] Detection error:', err);
        // Penalize when detection fails after models loaded
        flags.push({
          code: 'foto_erro_deteccao',
          label: 'Erro na detecção facial',
          scoreDelta: -10,
        });
      }
    } else {
      // Models not loaded - add fallback flag
      console.warn('[FaceDetection] Models not loaded, adding fallback flag');
      flags.push({
        code: 'foto_nao_validada',
        label: 'Validação facial indisponível',
        scoreDelta: -10,
      });
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
    // Try to initialize if not ready
    if (!isReady && !isLoading) {
      const success = await initialize();
      if (!success) {
        console.warn('[FaceDetection] Could not initialize, proceeding with limited validation');
      }
    }
    
    return detectFaces(canvas);
  }, [isReady, isLoading, initialize, detectFaces]);

  return {
    isLoading,
    isReady: modelsLoaded, // Use module-level state for accuracy
    error,
    initialize,
    detectFaces,
    validatePhoto,
  };
}
