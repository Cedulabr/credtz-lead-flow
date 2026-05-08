## Problema

No Painel de Risco (`AuditDashboard`), ao clicar no ícone de olho para ver a foto da batida (ex.: Sabrina, 28/04/2026 16:00:55 saída), a imagem não abre.

**Causa:** o bucket `time-clock-photos` é privado, mas esse painel renderiza `<img src={record.photo_url} />` direto, sem gerar Signed URL. Registros antigos guardam URL pública completa (`/storage/.../public/time-clock-photos/...`) que retorna 400/403, e registros novos guardam só o caminho relativo, que também não carrega sem assinatura.

Os outros pontos de exibição (`ManagerDashboard`, `AdminControl`) já foram corrigidos com o helper `resolveTimeClockPhotoUrl` — falta aplicar a mesma correção aqui.

## Mudança

Atualizar `src/components/TimeClock/AuditDashboard.tsx`:

1. Importar `resolveTimeClockPhotoUrl` de `./photoUrl` e `toast` de `sonner`.
2. Substituir o `<Dialog>` inline da coluna "Foto" por um botão controlado que:
   - Ao clicar, chama `resolveTimeClockPhotoUrl(record.photo_url)`.
   - Em sucesso, abre um modal único compartilhado mostrando a imagem assinada.
   - Em falha, exibe `toast.error('Não foi possível abrir a foto')`.
3. Adicionar estado no componente:
   - `selectedPhotoUrl: string | null`
   - `photoLoading: boolean`
   - Modal único renderizado uma vez no fim do componente (em vez de um `<Dialog>` por linha).
4. Mostrar `Loader2` enquanto a URL assinada está sendo gerada.

## Escopo

- Apenas frontend, apenas `AuditDashboard.tsx`.
- Sem mudanças em RLS, banco, edge functions ou no helper já existente.
- Sem alterar como a foto é armazenada — só como é exibida.

## Validação

- Reabrir o Painel de Risco e clicar no olho na batida da Sabrina (28/04 16:00:55) — a foto deve abrir.
- Testar uma batida recente (caminho relativo) e uma antiga (URL pública) para confirmar que ambas funcionam.
