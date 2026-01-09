import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, MapPin, Wifi, Camera, CheckCircle2, Loader2 } from 'lucide-react';
import { useTimeClock } from '@/hooks/useTimeClock';
import { CameraCapture } from './CameraCapture';
import { ConsentModal } from './ConsentModal';
import { clockTypeLabels, type TimeClockType, type TimeClock } from './types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface ClockButtonProps {
  userId: string;
  companyId: string | null;
  onClockRegistered?: () => void;
}

export function ClockButton({ userId, companyId, onClockRegistered }: ClockButtonProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [todayRecords, setTodayRecords] = useState<TimeClock[]>([]);
  const [nextClockType, setNextClockType] = useState<TimeClockType>('entrada');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  
  const { toast } = useToast();
  const {
    loading,
    checkConsent,
    saveConsent,
    getPublicIP,
    getTodayRecords,
    getNextClockType,
    registerClock,
  } = useTimeClock(userId);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
    checkLocationPermission();
  }, [userId]);

  const loadData = async () => {
    const consent = await checkConsent();
    setHasConsent(consent);
    
    const records = await getTodayRecords();
    setTodayRecords(records);
    setNextClockType(getNextClockType(records));
  };

  const checkLocationPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setLocationStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'pending');
      result.addEventListener('change', () => {
        setLocationStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'pending');
      });
    } catch {
      setLocationStatus('pending');
    }
  };

  const handleClockClick = async () => {
    if (!hasConsent) {
      setShowConsent(true);
      return;
    }
    setShowCamera(true);
  };

  const handleConsentAccept = async () => {
    const ip = await getPublicIP();
    await saveConsent(ip);
    setHasConsent(true);
    setShowConsent(false);
    setShowCamera(true);
  };

  const handleConsentDecline = () => {
    setShowConsent(false);
    toast({
      title: 'Consentimento necessário',
      description: 'Você precisa aceitar os termos para usar o controle de ponto.',
      variant: 'destructive',
    });
  };

  const handlePhotoCapture = async (blob: Blob) => {
    setShowCamera(false);
    const success = await registerClock(nextClockType, blob, companyId);
    if (success) {
      await loadData();
      onClockRegistered?.();
    }
  };

  const handleCameraCancel = () => {
    setShowCamera(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-4xl font-bold">
            {format(currentTime, 'HH:mm:ss')}
          </CardTitle>
          <CardDescription>
            {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className={`h-4 w-4 ${locationStatus === 'granted' ? 'text-green-500' : locationStatus === 'denied' ? 'text-red-500' : 'text-yellow-500'}`} />
              <span>GPS</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="h-4 w-4 text-green-500" />
              <span>IP</span>
            </div>
            <div className="flex items-center gap-1">
              <Camera className="h-4 w-4 text-green-500" />
              <span>Foto</span>
            </div>
          </div>

          <Button
            onClick={handleClockClick}
            disabled={loading}
            className="w-full h-16 text-lg"
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
            ) : (
              <Clock className="h-6 w-6 mr-2" />
            )}
            Registrar {clockTypeLabels[nextClockType]}
          </Button>

          {todayRecords.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">Registros de hoje:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {todayRecords.map((record) => (
                  <Badge key={record.id} variant="secondary" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {clockTypeLabels[record.clock_type as TimeClockType]} - {format(new Date(record.clock_time), 'HH:mm')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConsentModal
        open={showConsent}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />

      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Capturar Foto - {clockTypeLabels[nextClockType]}
            </DialogTitle>
          </DialogHeader>
          <CameraCapture onCapture={handlePhotoCapture} onCancel={handleCameraCancel} />
        </DialogContent>
      </Dialog>
    </>
  );
}
