import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Check, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

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

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!photo) {
      startCamera();
    }
  }, [facingMode]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Espelhar a imagem se for câmera frontal
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPhotoBlob(blob);
          setPhoto(canvas.toDataURL('image/jpeg', 0.8));
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
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
    startCamera();
  };

  const confirmPhoto = () => {
    if (photoBlob) {
      onCapture(photoBlob);
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
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
        ) : (
          <img src={photo} alt="Captured" className="w-full h-full object-cover" />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

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
