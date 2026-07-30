// Elementos DOM
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const filesList = document.getElementById('files-list');
const loadedFilesUl = document.getElementById('loaded-files-ul');
const btnConvert = document.getElementById('btn-convert');
const statusPanel = document.getElementById('status-panel');
const statusText = document.getElementById('status-text');
const statusPercent = document.getElementById('status-percent');
const progressFill = document.getElementById('progress-fill');
const viewport = document.getElementById('viewport');
const previewBadge = document.getElementById('preview-badge');
const inputGeometricError = document.getElementById('geometric-error');
const inputScale = document.getElementById('scale');

// Estado da Aplicação
let uploadedFiles = {};
let currentModelScene = null;
let threePreview = null;

// Inicializa o visualizador Three.js
function initThree() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;

    // Criar cena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);

    // Criar câmera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(5, 5, 5);

    // Criar renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    
    // Limpar placeholder e adicionar canvas
    viewport.innerHTML = '';
    viewport.appendChild(renderer.domElement);

    // Controles de órbita
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // Grid e helpers para auxiliar visualização
    const gridHelper = new THREE.GridHelper(20, 20, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -1;
    scene.add(gridHelper);

    // Função de animação
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Redimensionamento
    window.addEventListener('resize', () => {
        const w = viewport.clientWidth;
        const h = viewport.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    threePreview = { scene, camera, renderer, controls };
}

// Drag and drop events
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    }, false);
});

dropZone.addEventListener('drop', (e) => {
    handleFiles(e.dataTransfer.files);
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Processa arquivos carregados
function handleFiles(files) {
    for (let file of files) {
        const ext = file.name.split('.').pop().toLowerCase();
        uploadedFiles[file.name] = file;
    }
    updateFilesList();
}

function updateFilesList() {
    loadedFilesUl.innerHTML = '';
    const names = Object.keys(uploadedFiles);
    
    if (names.length === 0) {
        filesList.style.display = 'none';
        btnConvert.disabled = true;
        return;
    }

    filesList.style.display = 'block';
    
    let hasModel = false;
    names.forEach(name => {
        const ext = name.split('.').pop().toLowerCase();
        const li = document.createElement('li');
        
        let typeClass = 'image';
        if (ext === 'obj') { typeClass = 'obj'; hasModel = true; }
        if (ext === 'usdz') { typeClass = 'usdz'; hasModel = true; }
        if (ext === 'mtl') { typeClass = 'mtl'; }

        li.innerHTML = `
            <span>${name}</span>
            <span class="file-type ${typeClass}">${ext}</span>
        `;
        loadedFilesUl.appendChild(li);
    });

    if (hasModel) {
        btnConvert.disabled = false;
        loadPreview();
    }
}

// Faz o preview do arquivo importado na cena Three.js
async function loadPreview() {
    if (!threePreview) {
        initThree();
    }

    // Limpa o modelo atual se existir
    if (currentModelScene) {
        threePreview.scene.remove(currentModelScene);
        currentModelScene = null;
    }

    updateStatus('Lendo e renderizando modelo para preview...', 20);

    const fileNames = Object.keys(uploadedFiles);
    const objFile = fileNames.find(n => n.endsWith('.obj'));
    const usdzFile = fileNames.find(n => n.endsWith('.usdz'));

    try {
        if (objFile) {
            const mtlFile = fileNames.find(n => n.endsWith('.mtl'));
            const objText = await uploadedFiles[objFile].text();
            
            let materials = null;
            if (mtlFile) {
                const mtlText = await uploadedFiles[mtlFile].text();
                const mtlLoader = new THREE.MTLLoader();
                // Passar path base para blob urls pode ser complexo. Nós carregamos as texturas direto se referenciadas localmente.
                materials = mtlLoader.parse(mtlText);
                materials.preload();
            }

            const objLoader = new THREE.OBJLoader();
            if (materials) {
                objLoader.setMaterials(materials);
            }
            
            const object = objLoader.parse(objText);
            displayModel(object, objFile);
        } else if (usdzFile) {
            // Loader do USDZ
            const arrayBuffer = await uploadedFiles[usdzFile].arrayBuffer();
            const loader = new THREE.USDZLoader();
            
            // O USDZLoader retorna um Group/Object3D
            const object = await new Promise((resolve, reject) => {
                try {
                    const loadedObj = loader.parse(arrayBuffer);
                    resolve(loadedObj);
                } catch(e) {
                    reject(e);
                }
            });
            displayModel(object, usdzFile);
        }
        updateStatus('Modelo carregado no preview.', 100);
        setTimeout(() => statusPanel.style.display = 'none', 2000);
    } catch (err) {
        console.error(err);
        updateStatus('Erro ao carregar modelo: ' + err.message, 0);
        previewBadge.textContent = 'Erro';
        previewBadge.className = 'badge';
    }
}

function displayModel(object, filename) {
    // Aplicar escala configurada
    const scale = parseFloat(inputScale.value) || 1.0;
    object.scale.set(scale, scale, scale);

    currentModelScene = object;
    threePreview.scene.add(object);

    // Ajustar a câmera para focar no objeto recém adicionado
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = threePreview.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 4 * Math.tan(fov * 2));
    
    // Evitar zoom infinito em objetos de tamanho zero
    if (cameraZ === 0) cameraZ = 5;

    threePreview.camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
    threePreview.camera.lookAt(center);
    threePreview.controls.target.copy(center);
    threePreview.controls.update();

    previewBadge.textContent = filename;
    previewBadge.className = 'badge active';
}

function updateStatus(text, percent) {
    statusPanel.style.display = 'block';
    statusText.textContent = text;
    statusPercent.textContent = percent + '%';
    progressFill.style.width = percent + '%';
}

// Lógica de Conversão e Exportação para 3D Tiles 1.1
btnConvert.addEventListener('click', async () => {
    if (!currentModelScene) return;

    btnConvert.disabled = true;
    updateStatus('Preparando modelo para exportação...', 10);

    try {
        // 1. Exportar para GLB usando GLTFExporter do Three.js
        updateStatus('Gerando arquivo GLB binário...', 35);
        const exporter = new THREE.GLTFExporter();
        
        const glbBuffer = await new Promise((resolve, reject) => {
            exporter.parse(currentModelScene, function(result) {
                resolve(result); // result é um ArrayBuffer com a flag binary: true
            }, function(error) {
                reject(error);
            }, { binary: true, animations: [] });
        });

        updateStatus('Calculando Bounding Volume...', 65);
        // 2. Calcular Bounding Volume (para o tileset.json)
        const box = new THREE.Box3().setFromObject(currentModelScene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // A estrutura box na especificação 3D Tiles 1.1:
        // [center.x, center.y, center.z, halfaxeX.x, 0, 0, 0, halfaxeY.y, 0, 0, 0, halfaxeZ.z]
        const hx = size.x / 2;
        const hy = size.y / 2;
        const hz = size.z / 2;
        
        const tilesetBox = [
            center.x, center.y, center.z,
            hx, 0, 0,
            0, hy, 0,
            0, 0, hz
        ];

        // 3. Montar tileset.json em conformidade com 3D Tiles 1.1
        const geometricErrorVal = parseFloat(inputGeometricError.value) || 100.0;
        
        const tilesetJson = {
            asset: {
                version: "1.1",
                generator: "OBJ & USDZ to 3D Tiles Converter Web"
            },
            geometricError: geometricErrorVal,
            root: {
                boundingVolume: {
                    box: tilesetBox
                },
                geometricError: 0,
                refine: "ADD",
                content: {
                    uri: "model.glb"
                }
            }
        };

        // 4. Empacotar tudo num arquivo ZIP
        updateStatus('Criando arquivo ZIP para download...', 85);
        const zip = new JSZip();
        
        // Adicionar o tileset.json
        zip.file("tileset.json", JSON.stringify(tilesetJson, null, 2));
        
        // Adicionar o model.glb
        zip.file("model.glb", glbBuffer);

        const zipBlob = await zip.generateAsync({ type: "blob" });

        updateStatus('Concluído! Iniciando download...', 100);

        // Disparar download
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "3d_tileset.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setTimeout(() => {
            statusPanel.style.display = 'none';
            btnConvert.disabled = false;
        }, 3000);

    } catch (error) {
        console.error(error);
        updateStatus('Erro na conversão: ' + error.message, 0);
        btnConvert.disabled = false;
    }
});
