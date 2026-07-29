# Riscos e Melhorias Futuras - PWA

## Riscos Conhecidos

### 1. Tamanho do IndexedDB
- **Problema:** PDFs grandes podem consumir muito espaço de armazenamento
- **Mitigação atual:** Sem limite implementado
- **Melhoria futura:** 
  - Adicionar limite de tamanho total (ex: 500MB)
  - Mostrar uso de armazenamento ao usuário
  - Permitir limpeza seletiva de PDFs offline

### 2. Performance com ArrayBuffer
- **Problema:** ArrayBuffer grande pode causar lentidão na leitura/escrita
- **Mitigação atual:** Leitura/escrita direta
- **Melhoria futura:**
  - Implementar chunks para leitura/escrita
  - Usar Web Workers para operações de IndexedDB
  - Lazy loading de páginas do PDF

### 3. Compatibilidade Safari
- **Problema:** Safari tem limitações conhecidas com IndexedDB
- **Mitigação atual:** API nativa com tratamento de erros
- **Melhoria futura:**
  - Testes específicos no Safari
  - Fallback para localStorage quando possível
  - Limites conservadores para iOS

### 4. Service Worker no Tauri
- **Problema:** Service worker não deve ser registrado no Tauri desktop
- **Mitigação atual:** `disable: isTauri` no vite-plugin-pwa
- **Melhoria futura:**
  - Verificar se a desabilitação está funcionando corretamente
  - Testes em ambiente Tauri

### 5. Atualização do Service Worker
- **Problema:** SW com `autoUpdate` pode causar problemas se houver mudança no store
- **Mitigação atual:** `registerType: 'autoUpdate'`
- **Melhoria futura:**
  - Considerar `prompt` para atualizações
  - Implementar migração de dados se necessário
  - Testes de atualização entre versões

---

## Melhorias Futuras

### Prioridade Alta
- [ ] **Limite de armazenamento:** Implementar limite de tamanho total para PDFs offline
- [ ] **Indicador de uso:** Mostrar ao usuário quanto espaço está sendo usado
- [ ] **Limpeza seletiva:** Permitir remover PDFs offline individualmente
- [ ] **Tratamento de erros:** Melhorar mensagens de erro para problemas de armazenamento

### Prioridade Média
- [ ] **Ícones PWA:** Criar ícones de alta resolução (192x192, 512x512)
- [ ] **Splash screen:** Adicionar splash screen personalizada
- [ ] **Background sync:** Sincronizar dados quando voltar online
- [ ] **Push notifications:** Notificar sobre atualizações de PDFs
- [ ] **Web Workers:** Mover operações pesadas para Web Workers

### Prioridade Baixa
- [ ] **Cache de imagens:** Cache de thumbnails e capas
- [ ] **Modo avião:** UI específica para modo avião
- [ ] **Compartilhamento:** API de compartilhamento nativa
- [ ] **Badges:** Badge de instalação no ícone

---

## Notas Técnicas

### IndexedDB vs localStorage
- **localStorage:** Limite de ~5MB, síncrono, apenas strings
- **IndexedDB:** Limite maior (geralmente 50% do disco), assíncrono, binários
- **Decisão:** Usar IndexedDB para PDFs (binários) e localStorage para configurações (strings)

### Service Worker Estratégias
- **CacheFirst:** Para assets estáticos (JS, CSS, fonts)
- **NetworkFirst:** Para navegação SPA
- **StaleWhileRevalidate:** Para APIs que podem estar desatualizadas
- **Não cacheia:** PDFs (usam IndexedDB diretamente)

### Detecção de Plataforma
- **Web:** `isTauri() === false` → PWA ativo
- **Desktop:** `isTauri() === true` → PWA desativado, usa SQLite

---

## Dependências Adicionadas

```json
{
  "devDependencies": {
    "vite-plugin-pwa": "^0.21.1"
  }
}
```

## Arquivos Criados/Modificados

### Criados
- `src/lib/pdfStorage.ts` - API IndexedDB para PDFs
- `src/hooks/useOnlineStatus.ts` - Hook de status offline
- `src/components/InstallPrompt.tsx` - Componente de instalação
- `PWA-RISKS.md` - Este arquivo

### Modificados
- `vite.config.ts` - Configuração do plugin PWA
- `package.json` - Dependência vite-plugin-pwa
- `index.html` - Meta tags PWA
- `src/store/appStore.ts` - Ações de gerenciamento offline
- `src/lib/tauri.ts` - Função readFileAsArrayBuffer
- `src/components/Layout.tsx` - Indicador offline
- `src/components/BookCard.tsx` - Status offline e botão salvar
- `src/components/Reader.tsx` - Tratamento PDF não disponível
- `src/components/Library.tsx` - Salvar PDFs automaticamente
- `src/App.tsx` - Adicionar InstallPrompt