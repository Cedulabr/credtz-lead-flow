import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Check, X, User, AlertTriangle, Loader2 } from 'lucide-react';
import { useFaceDetection } from './useFaceDetection';

interface CameraCaptureProps {
  onCapture: (blob: Blob, faceDetected: boolean) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  // Face detection state
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  const [faceConfidence, setFaceConfidence] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [photoFaceResult, setPhotoFaceResult] = useState<{ detected: boolean; confidence: number } | null>(null);
  
  const { initialize, detectFaces, isReady } = useFaceDetection();
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      console.error('Camera error:', err);
    }
  }, [facingMode, stream]);

  // Initialize face detection on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!photo) {
      startCamera();
    }
  }, [facingMode]);

  // Real-time face detection on video feed
  useEffect(() => {
    if (!isReady || photo || !videoRef.current) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      return;
    }

    const runDetection = async () => {
      if (!videoRef.current || !detectionCanvasRef.current || isDetecting) return;
      
      const video = videoRef.current;
      if (video.readyState < 2) return; // Video not ready
      
      setIsDetecting(true);
      
      try {
        const canvas = detectionCanvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Mirror if front camera
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);
        
        const result = await detectFaces(canvas);
        setFaceDetected(result.faceCount === 1);
        setFaceConfidence(result.confidence);
      } catch (err) {
        console.warn('[CameraCapture] Detection error:', err);
      } finally {
        setIsDetecting(false);
      }
    };

    // Run detection every 1.5 seconds
    detectionIntervalRef.current = setInterval(runDetection, 1500);
    // Run once immediately
    runDetection();

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isReady, photo, detectFaces, facingMode, isDetecting]);

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the image if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    // Run face detection on captured photo
    if (isReady) {
      try {
        console.log('[CameraCapture] Running face detection on captured photo...');
        const result = await detectFaces(canvas);
        console.log('[CameraCapture] Photo face detection result:', result);
        setPhotoFaceResult({
          detected: result.faceCount === 1,
          confidence: result.confidence,
        });
      } catch (err) {
        console.error('[CameraCapture] Photo face detection failed:', err);
        setPhotoFaceResult({ detected: false, confidence: 0 });
      }
    } else {
      // Face detection not ready
      setPhotoFaceResult(null);
    }

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPhotoBlob(blob);
          setPhoto(canvas.toDataURL('image/jpeg', 0.8));
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
          // Stop detection interval
          if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
          }
        }
      },
      'image/jpeg',
      0.8
    );
  };

  const retakePhoto = () => {
    setPhoto(null);
    setPhotoBlob(null);
    setPhotoFaceResult(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (photoBlob) {
      const faceWasDetected = photoFaceResult?.detected ?? false;
      onCapture(photoBlob, faceWasDetected);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Camera className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-destructive mb-4">{error}</p>
        <div className="flex gap-2">
          <Button onClick={startCamera}>Tentar Novamente</Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden">
        {!photo ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            {/* Real-time face detection indicator */}
            {isReady && faceDetected !== null && (
              <div 
                className={`absolute inset-0 border-4 rounded-lg pointer-events-none transition-colors ${
                  faceDetected ? 'border-green-500' : 'border-red-500'
                }`}
              />
            )}
            {/* Face status badge */}
            <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
              <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                !isReady 
                  ? 'bg-yellow-500/90 text-white' 
                  : faceDetected 
                    ? 'bg-green-500/90 text-white' 
                    : 'bg-red-500/90 text-white'
              }`}>
                {!isReady ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Carregando...
                  </>
                ) : faceDetected ? (
                  <>
                    <User className="h-3 w-3" />
                    Rosto detectado
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    Nenhum rosto
                  </>
                )}
              </div>
              {isReady && faceConfidence > 0 && (
                <div className="px-2 py-1 rounded text-xs bg-black/50 text-white">
                  {Math.round(faceConfidence)}%
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <img src={photo} alt="Captured" className="w-full h-full object-cover" />
            {/* Photo face detection result */}
            {photoFaceResult !== null && (
              <div 
                className={`absolute inset-0 border-4 rounded-lg pointer-events-none ${
                  photoFaceResult.detected ? 'border-green-500' : 'border-red-500'
                }`}
              />
            )}
            <div className="absolute top-2 left-2">
              <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                photoFaceResult === null 
                  ? 'bg-yellow-500/90 text-white' 
                  : photoFaceResult.detected 
                    ? 'bg-green-500/90 text-white' 
                    : 'bg-red-500/90 text-white'
              }`}>
                {photoFaceResult === null ? (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    Não validado
                  </>
                ) : photoFaceResult.detected ? (
                  <>
                    <User className="h-3 w-3" />
                    Rosto detectado ✓
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    Nenhum rosto detectado!
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hidden canvases for processing */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={detectionCanvasRef} className="hidden" />

      {/* Warning message when no face detected on photo */}
      {photo && photoFaceResult && !photoFaceResult.detected && (
        <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-sm text-yellow-800 font-medium flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Nenhum rosto foi detectado na foto
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Você pode continuar, mas a foto será marcada para revisão
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {!photo ? (
          <>
            <Button variant="outline" size="icon" onClick={toggleCamera}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button onClick={takePhoto} size="lg">
              <Camera className="h-5 w-5 mr-2" />
              Capturar Foto
            </Button>
            <Button variant="outline" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={retakePhoto}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Tirar Outra
            </Button>
            <Button onClick={confirmPhoto}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
