import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RadarStats } from '../types';
import { motion } from 'framer-motion';

interface Props {
  stats: RadarStats | null;
  loading: boolean;
  onCardClick: (smartFilter: string) => void;
  activeFilter?: string;
}

const cards = [
  { key: 'alta_rentabilidade', label: 'Alta Rentabilidade Portabilidade', description: 'Clientes com parcelas ou saldo alto', icon: '💰', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30' },
  { key: 'refinanciamento_forte', label: 'Refinanciamento Forte', description: 'Clientes com +36 parcelas pagas', icon: '🔥', color: 'from-red-500/20 to-rose-500/20 border-red-500/30' },
  { key: 'parcelas_altas', label: 'Parcelas Altas', description: 'Clientes com parcela acima de 600', icon: '📈', color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30' },
  { key: 'muitos_contratos', label: 'Muitos Contratos', description: 'Clientes com 6+ contratos', icon: '⚠️', color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30' },
];

export function RadarSummaryCards({ stats, loading, onCardClick, activeFilter }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card
            className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg bg-gradient-to-br ${card.color} ${activeFilter === card.key ? 'ring-2 ring-primary shadow-lg' : ''}`}
            onClick={() => onCardClick(card.key)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-2xl">{card.icon}</p>
                  <h3 className="font-semibold text-sm text-foreground">{card.label}</h3>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </div>
                <div className="text-right">
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <motion.p
                      className="text-2xl font-bold text-foreground"
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                    >
                      {stats?.[card.key as keyof RadarStats]?.toLocaleString('pt-BR') || '—'}
                    </motion.p>
                  )}
                  <p className="text-xs text-muted-foreground">encontrados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
