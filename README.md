# Conversor de OBJ/USDZ para 3D Tiles 1.1

Esta é uma ferramenta estática hospedada no GitHub Pages que realiza a conversão de modelos nos formatos **OBJ** (com suporte opcional a MTL) e **USDZ** para a especificação **3D Tiles 1.1** (contendo `tileset.json` e `model.glb` no padrão moderno).

Tudo roda diretamente no navegador, garantindo segurança e privacidade para os seus arquivos.

## 🚀 Como Executar Localmente

Como a aplicação é 100% estática, basta ter um servidor local para desenvolvimento para carregar os recursos do Three.js corretamente.

Você pode subir um servidor local rapidamente usando Python, Node, ou similar:

### Usando Python:
```bash
python3 -m http.server 8000
```
Acesse no seu navegador: `http://localhost:8000`

### Usando Node.js (se tiver o `http-server` instalado):
```bash
npx http-server .
```

## 🛠️ Especificações Técnicas

- **Processador 3D**: [Three.js](https://threejs.org/) para parsing dos formatos OBJ e USDZ, renderização de preview interativo e exportação em binário `.glb` (`GLTFExporter`).
- **Padrão Utilizado**: **3D Tiles 1.1** (a versão mais moderna que aceita glTF/GLB nativamente sem precisar envelopar em arquivos legados `.b3dm`).
- **Zip Compression**: [JSZip](https://stuk.github.io/jszip/) para consolidar o `tileset.json` gerado dinamicamente e o arquivo `model.glb` em uma pasta compactada `.zip` pronta para download.
