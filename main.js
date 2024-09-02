import * as THREE from 'three';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import MeshoptDecoder from 'https://cdn.skypack.dev/meshoptimizer/meshopt_decoder.js';
import { Stats } from "./stats.js";
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { N8AOPass, N8AOPostPass } from './N8AO.js';
import { ShadowMesh } from 'three/addons/objects/ShadowMesh.js';
import { BloomEffect, Effect, EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset } from "postprocessing";
async function main() {
    // Setup basic renderer, controls, and profiler
    let clientWidth = window.innerWidth;
    let clientHeight = window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 10, 10000);
    camera.position.set(50, 75, 50);
    const renderer = new THREE.WebGLRenderer({
        stencil: true
    });
    renderer.setSize(clientWidth, clientHeight);
    document.body.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 25, 0);
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    // Setup scene
    // Skybox
    const environment = new THREE.CubeTextureLoader().load([
        "skybox/Box_Right.jpg",
        "skybox/Box_Left.jpg",
        "skybox/Box_Top.jpg",
        "skybox/Box_Bottom.jpg",
        "skybox/Box_Front.jpg",
        "skybox/Box_Back.jpg"
    ]);
    environment.colorSpace = THREE.SRGBColorSpace;
    scene.background = environment;

    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xefefe0 });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.position.y = -10.1;
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    //scene.add(groundMesh);
    function addLight(scene){
        const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
        directionalLight.position.set(80, 250, -50);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        directionalLight.shadow.camera.left = -300;
        directionalLight.shadow.camera.right = 600;
        directionalLight.shadow.camera.top = 400;
        directionalLight.shadow.camera.bottom = -400;
        directionalLight.shadow.camera.near = 10.5;
        directionalLight.shadow.camera.far = 1500;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.bias = -0.001;
    }
    addLight(scene);
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const glbfilename = (window.location.hash.length>1) ? window.location.hash.slice(1) : "snowdon-arch.glb";
    const sponza = (await loader.loadAsync(`glbs/${glbfilename}`)).scene;
    sponza.traverse(object => {
        object.castShadow = true;
        object.receiveShadow = true;

        if (object.material) {
            object.material.envMap = environment;
            if (object.material.map) {
                //object.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
            }
        }
    })
    sponza.scale.set(10, 10, 10)
    scene.add(sponza);
    const effectController = {
        aoSamples: 10.0,
        denoiseSamples: 1.0,
        denoiseRadius: 0.0,
        aoRadius: 64.0,
        distanceFalloff: 1.0,
        screenSpaceRadius: true,
        halfRes: false,
        depthAwareUpsampling: false,
        transparencyAware: false,
        intensity: 2.0,
        renderMode: "Combined",
        color: [0, 0, 0],
        colorMultiply: true,
        accumulate: true
    };
    const gui = new GUI();
    gui.add(effectController, "aoSamples", 1.0, 64.0, 1.0);
    gui.add(effectController, "denoiseSamples", 1.0, 64.0, 1.0);
    gui.add(effectController, "denoiseRadius", 0.0, 24.0, 0.01);
    const aor = gui.add(effectController, "aoRadius", 1.0, 10.0, 0.01);
    const df = gui.add(effectController, "distanceFalloff", 0.0, 10.0, 0.01);
    gui.add(effectController, "screenSpaceRadius").onChange((value) => {
        if (value) {
            effectController.aoRadius = 48.0;
            effectController.distanceFalloff = 0.2;
            aor._min = 0;
            aor._max = 64;
            df._min = 0;
            df._max = 1;
        } else {
            effectController.aoRadius = 5.0;
            effectController.distanceFalloff = 1.0;
            aor._min = 1;
            aor._max = 10;
            df._min = 0;
            df._max = 10;
        }
        aor.updateDisplay();
        df.updateDisplay();
    });
    gui.add(effectController, "halfRes");
    gui.add(effectController, "depthAwareUpsampling");
    gui.add(effectController, "transparencyAware");
    gui.add(effectController, "intensity", 0.0, 10.0, 0.01);
    gui.addColor(effectController, "color");
    gui.add(effectController, "colorMultiply");
    gui.add(effectController, "accumulate");
    gui.add(effectController, "renderMode", ["Combined", "AO", "No AO", "Split", "Split AO"]);
    // Post Effects
    //  const composer = new EffectComposer(renderer);
    /* const n8aopass = new N8AOPass(
         scene,
         camera,
         clientWidth,
         clientHeight
     );
     const smaaPass = new SMAAPass(clientWidth, clientHeight);
     composer.addPass(n8aopass);
     composer.addPass(smaaPass);*/
    const composer = new EffectComposer(renderer, {
        stencilBuffer: true,
        depthBuffer: true,
        frameBufferType: THREE.HalfFloatType
    });
    const renderPass = new RenderPass(scene, camera);
    renderPass.clearPass.setClearFlags(true, true, true);
    composer.addPass(renderPass);
    const n8aopass = new N8AOPostPass(
        scene,
        camera,
        clientWidth,
        clientHeight
    );
    composer.addPass(n8aopass);
    composer.addPass(new EffectPass(camera, new SMAAEffect({
        preset: SMAAPreset.ULTRA
    })));

    window.addEventListener("resize", () => {
        clientWidth = window.innerWidth;
        clientHeight = window.innerHeight;
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(clientWidth, clientHeight);
        composer.setSize(clientWidth, clientHeight);
    });
    const timerDOM = document.getElementById("aoTime");
    const aoMeta = document.getElementById("aoMetadata");
    n8aopass.enableDebugMode();
    const clock = new THREE.Clock();

    function animate() {
        aoMeta.innerHTML = `${clientWidth}x${clientHeight}`
        const spin = 2 * clock.getDelta();

        n8aopass.configuration.aoRadius = effectController.aoRadius;
        n8aopass.configuration.distanceFalloff = effectController.distanceFalloff;
        n8aopass.configuration.intensity = effectController.intensity;
        n8aopass.configuration.aoSamples = effectController.aoSamples;
        n8aopass.configuration.denoiseRadius = effectController.denoiseRadius;
        n8aopass.configuration.denoiseSamples = effectController.denoiseSamples;
        n8aopass.configuration.renderMode = ["Combined", "AO", "No AO", "Split", "Split AO"].indexOf(effectController.renderMode);
        n8aopass.configuration.color = new THREE.Color(effectController.color[0], effectController.color[1], effectController.color[2]);
        n8aopass.configuration.screenSpaceRadius = effectController.screenSpaceRadius;
        n8aopass.configuration.halfRes = effectController.halfRes;
        n8aopass.configuration.depthAwareUpsampling = effectController.depthAwareUpsampling;
        n8aopass.configuration.colorMultiply = effectController.colorMultiply;
        n8aopass.configuration.accumulate = effectController.accumulate;
        composer.render();
        timerDOM.innerHTML = n8aopass.lastTime.toFixed(2);
        controls.update();
        stats.update();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}
main();