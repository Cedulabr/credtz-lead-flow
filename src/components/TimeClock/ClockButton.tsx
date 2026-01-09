import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, Wifi, Camera, CheckCircle2, Loader2, Coffee } from 'lucide-react';
import { useTimeClock } from '@/hooks/useTimeClock';
import { CameraCapture } from './CameraCapture';
import { ConsentModal } from './ConsentModal';
import { clockTypeLabels, type TimeClockType, type TimeClock, type TimeClockBreakType } from './types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ClockButtonProps {
  userId: string;
  companyId: string | null;
  onClockRegistered?: () => void;
}

export function ClockButton({ userId, companyId, onClockRegistered }: ClockButtonProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showBreakSelect, setShowBreakSelect] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [todayRecords, setTodayRecords] = useState<TimeClock[]>([]);
  const [nextClockType, setNextClockType] = useState<TimeClockType>('entrada');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [breakTypes, setBreakTypes] = useState<TimeClockBreakType[]>([]);
  const [selectedBreakType, setSelectedBreakType] = useState<TimeClockBreakType | null>(null);
  const [activeBreak, setActiveBreak] = useState<TimeClock | null>(null);
  
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
    loadBreakTypes();
    checkLocationPermission();
  }, [userId]);

  const loadData = async () => {
    const consent = await checkConsent();
    setHasConsent(consent);
    
    const records = await getTodayRecords();
    setTodayRecords(records);
    
    // Verificar se há uma pausa ativa (início sem fim)
    const pausaInicio = records.filter(r => r.clock_type === 'pausa_inicio');
    const pausaFim = records.filter(r => r.clock_type === 'pausa_fim');
    
    if (pausaInicio.length > pausaFim.length) {
      setActiveBreak(pausaInicio[pausaInicio.length - 1]);
      setNextClockType('pausa_fim');
    } else {
      setActiveBreak(null);
      setNextClockType(getNextClockType(records));
    }
  };

  const loadBreakTypes = async () => {
    const { data } = await supabase
      .from('time_clock_break_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (data) {
      setBreakTypes(data as TimeClockBreakType[]);
    }
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
    
    // Se for início de pausa, mostrar seleção de tipo de pausa
    if (nextClockType === 'pausa_inicio' && breakTypes.length > 0) {
      setShowBreakSelect(true);
      return;
    }
    
    setShowCamera(true);
  };

  const handleBreakTypeSelect = (breakTypeId: string) => {
    const breakType = breakTypes.find(bt => bt.id === breakTypeId);
    setSelectedBreakType(breakType || null);
    setShowBreakSelect(false);
    setShowCamera(true);
  };

  const handleConsentAccept = async () => {
    const ip = await getPublicIP();
    await saveConsent(ip);
    setHasConsent(true);
    setShowConsent(false);
    
    if (nextClockType === 'pausa_inicio' && breakTypes.length > 0) {
      setShowBreakSelect(true);
    } else {
      setShowCamera(true);
    }
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
    const success = await registerClock(nextClockType, blob, companyId, selectedBreakType?.id);
    if (success) {
      setSelectedBreakType(null);
      await loadData();
      onClockRegistered?.();
    }
  };

  const handleCameraCancel = () => {
    setShowCamera(false);
    setSelectedBreakType(null);
  };

  const getBreakTypeName = (breakTypeId: string | null) => {
    if (!breakTypeId) return '';
    const breakType = breakTypes.find(bt => bt.id === breakTypeId);
    return breakType ? ` (${breakType.name})` : '';
  };

  const getButtonLabel = () => {
    if (nextClockType === 'pausa_inicio') {
      return 'Iniciar Pausa';
    }
    if (nextClockType === 'pausa_fim' && activeBreak) {
      const breakName = getBreakTypeName(activeBreak.break_type_id);
      return `Encerrar Pausa${breakName}`;
    }
    return `Registrar ${clockTypeLabels[nextClockType]}`;
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
            variant={nextClockType === 'pausa_inicio' ? 'secondary' : nextClockType === 'pausa_fim' ? 'outline' : 'default'}
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
            ) : nextClockType === 'pausa_inicio' || nextClockType === 'pausa_fim' ? (
              <Coffee className="h-6 w-6 mr-2" />
            ) : (
              <Clock className="h-6 w-6 mr-2" />
            )}
            {getButtonLabel()}
          </Button>

          {activeBreak && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-sm text-yellow-800 font-medium">
                ⏸️ Pausa em andamento{getBreakTypeName(activeBreak.break_type_id)}
              </p>
              <p className="text-xs text-yellow-600">
                Iniciada às {format(new Date(activeBreak.clock_time), 'HH:mm')}
              </p>
            </div>
          )}

          {todayRecords.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">Registros de hoje:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {todayRecords.map((record) => (
                  <Badge key={record.id} variant="secondary" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {clockTypeLabels[record.clock_type as TimeClockType]}
                    {getBreakTypeName(record.break_type_id)} - {format(new Date(record.clock_time), 'HH:mm')}
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

      {/* Dialog para seleção de tipo de pausa */}
      <Dialog open={showBreakSelect} onOpenChange={setShowBreakSelect}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Selecione o Tipo de Pausa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-4">
            {breakTypes.map((breakType) => (
              <Button
                key={breakType.id}
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => handleBreakTypeSelect(breakType.id)}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{breakType.name}</span>
                    {breakType.is_paid ? (
                      <Badge variant="secondary" className="text-xs">Remunerada</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Não Remunerada</Badge>
                    )}
                  </div>
                  {breakType.description && (
                    <p className="text-xs text-muted-foreground mt-1">{breakType.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Max: {breakType.max_duration_minutes} min</p>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Capturar Foto - {clockTypeLabels[nextClockType]}
              {selectedBreakType && ` (${selectedBreakType.name})`}
            </DialogTitle>
          </DialogHeader>
          <CameraCapture onCapture={handlePhotoCapture} onCancel={handleCameraCancel} />
        </DialogContent>
      </Dialog>
    </>
  );
}
