# ON ROUTE — v9.1 (GitHub Pages)

App estático (HTML/CSS/JS) com armazenamento em `localStorage`.
Inclui: **Sincronizar via link**, **Copiar mês (+28 dias)**, **Importar**, **+ Incluir médico**, **Visão Dia/Semana**, **Cadastro** e **grade 30min (08:00–18:00)**.

## Como publicar no GitHub Pages

### Opção A — Pelo site (sem terminal)
1. Crie um repositório no GitHub (ex.: `onroute`).
2. Clique em **Add file → Upload files** e envie `index.html`, `styles.css`, `app.js` (e este `README.md` se quiser).
3. Vá em **Settings → Pages**.
4. Em **Build and deployment / Source**, selecione **Deploy from a branch**.
5. Escolha **Branch: `main`** e **Folder: `/ (root)`**. Salve.
6. Aguarde ~1 minuto. O site ficará em: `https://SEU-USUARIO.github.io/NOME-DO-REPO/`

> Dica: use `?reset=1` no fim da URL para limpar dados antigos do navegador, se necessário.

### Opção B — Via terminal (git)
```bash
git init
git add .
git commit -m "ON ROUTE v9.1"
git branch -M main
git remote add origin git@github.com:SEU-USUARIO/onroute.git
git push -u origin main
```
Depois habilite **Settings → Pages** como acima.

## Observações
- O botão **Sincronizar** gera link com o parâmetro `?sync=...`. Ao abrir esse link em outro dispositivo, os dados são importados automaticamente.
- Se a URL ficar muito longa, podemos gerar uma versão **v9.2** com compressão de dados no link, ou migrar para Drive Sync.
- Para forçar limpeza de dados locais, use `?reset=1` no final da URL do app.
