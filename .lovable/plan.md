

## Exibir Observações na Lista de Propostas para Colaboradores

### Problema

As observações cadastradas nos leads do Televendas só aparecem ao abrir o modal de detalhes. Colaboradores precisam visualizar rapidamente as observações diretamente na listagem de propostas, sem precisar clicar em cada uma.

### Solução

Adicionar uma linha de preview da observação nos cards da lista de propostas (`PropostasView.tsx`), visível para todos os perfis (colaborador, gestor, admin).

### Arquivo a modificar

**`src/modules/televendas/views/PropostasView.tsx`**

- Após a Row 3 (detalhes - linha ~250), adicionar uma nova linha condicional que exibe a observação quando presente:

```
{tv.observacao && (
  <div className="flex items-start gap-1.5 mt-1">
    <FileText className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
    <p className="text-[11px] text-muted-foreground italic line-clamp-2">
      {tv.observacao}
    </p>
  </div>
)}
```

- Importar o ícone `FileText` do lucide-react (já usado no projeto)

### Resultado

Cada card de proposta que tiver observação mostrará um preview de até 2 linhas do texto, com ícone de documento e estilo itálico sutil. Trunca automaticamente textos longos. Clicando no card continua abrindo o modal com a observação completa.

