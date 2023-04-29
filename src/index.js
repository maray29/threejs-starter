import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  PointLight,
  Clock,
  Vector2,
  PlaneGeometry,
  MeshBasicMaterial,
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  Color,
  Fog,
  HemisphereLightHelper,
  DirectionalLightHelper,
} from "three";

import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { SampleShaderMaterial } from "./materials/SampleShaderMaterial";
import { SkyMat } from "./materials/SkyMat";
import { LineMat } from "./materials/LineMat";
import { gltfLoader } from "./loaders";

import { Rhino3dmLoader } from "three/addons/loaders/3DMLoader.js";

class App {
  #resizeCallback = () => this.#onResize();

  constructor(container, opts = { physics: false, debug: true }) {
    this.container = document.querySelector(container);
    this.screen = new Vector2(
      this.container.clientWidth,
      this.container.clientHeight
    );

    this.hasPhysics = opts.physics;
    this.hasDebug = opts.debug;
  }

  async init() {
    this.#createScene();
    this.#createCamera();
    this.#createRenderer();

    if (this.hasPhysics) {
      const { Simulation } = await import("./physics/Simulation");
      this.simulation = new Simulation(this);

      const { PhysicsBox } = await import("./physics/Box");
      const { PhysicsFloor } = await import("./physics/Floor");

      Object.assign(this, { PhysicsBox, PhysicsFloor });
    }

    this.#createBox();
    this.#createShadedBox();
    this.#createLight();
    // this.#createFloor();
    this.#createClock();
    this.#addListeners();
    this.#createControls();
    this.#createGround();
    this.#createSkyDome();

    await this.#loadModel();

    if (this.hasDebug) {
      const { Debug } = await import("./Debug.js");
      new Debug(this);

      const { default: Stats } = await import("stats.js");
      this.stats = new Stats();
      document.body.appendChild(this.stats.dom);
    }

    this.renderer.setAnimationLoop(() => {
      this.stats?.begin();

      this.#update();
      this.#render();

      this.stats?.end();
    });

    console.log(this);
  }

  destroy() {
    this.renderer.dispose();
    this.#removeListeners();
  }

  #update() {
    const elapsed = this.clock.getElapsedTime();

    this.shadedBox.rotation.y = elapsed;
    this.shadedBox.rotation.z = elapsed * 0.6;

    const delta = this.clock.getDelta();
    if (this.pointsToAnimate) {
      // console.log("Points:", this.pointsToAnimate);
      this.pointsToAnimate.forEach(({ mesh, curve }) => {
        const t = (mesh.userData.initialT + elapsed * 0.02) % 1;

        // mesh.userData.t = t >= 1 ? 0 : t;
        mesh.userData.t = t % 1; // Wrap t back to 0 when it reaches 1 using modulo operator
        const position = curve.getPointAt(t);
        mesh.position.copy(position);
      });
    }
    this.simulation?.update();
  }

  #render() {
    this.renderer.render(this.scene, this.camera);
  }

  #createScene() {
    this.scene = new Scene();
    this.scene.background = new Color().setHSL(0, 0, 0);
    this.scene.fog = new Fog(this.scene.background, 1, 5000);
  }

  #createCamera() {
    this.camera = new PerspectiveCamera(
      75,
      this.screen.x / this.screen.y,
      0.1,
      100
    );
    this.camera.position.set(0, 15, 0);
  }

  #createRenderer() {
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: window.devicePixelRatio === 1,
    });

    this.container.appendChild(this.renderer.domElement);

    this.renderer.setSize(this.screen.x, this.screen.y);
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    // this.renderer.setClearColor(0x121212);
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  #createLight() {
    // this.pointLight = new PointLight(0xffffff, 500, 100, 2);
    // this.pointLight.position.set(0, 10, 13);
    // this.scene.add(this.pointLight);

    this.directionalLight = new DirectionalLight(0xffffff, 1);
    this.directionalLight.color.setHSL(0.1, 1, 0.95);
    this.directionalLight.position.set(-1, 1.75, 1);
    this.directionalLight.position.multiplyScalar(30);
    console.log("Directional Light:", this.directionalLight);
    this.scene.add(this.directionalLight);

    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;

    const d = 50;

    this.directionalLight.shadow.camera.left = -d;
    this.directionalLight.shadow.camera.right = d;
    this.directionalLight.shadow.camera.top = d;
    this.directionalLight.shadow.camera.bottom = -d;

    this.directionalLight.shadow.camera.far = 1000;
    this.directionalLight.shadow.bias = -0.0001;

    const dirLightHelper = new DirectionalLightHelper(
      this.directionalLight,
      10
    );
    // this.scene.add(dirLightHelper);

    // this.ambientLight = new AmbientLight("white", 2);
    this.ambientLight = new HemisphereLight(0xffffff, 0xffffff, 1);
    this.ambientLight.color.setHSL(0.6, 1, 0.6);
    this.ambientLight.groundColor.setHSL(0.095, 1, 0.75);
    this.ambientLight.position.set(0, 50, 0);
    this.scene.add(this.ambientLight);

    const hemisphereLightHelper = new HemisphereLightHelper(
      this.ambientLight,
      10
    );
    this.scene.add(hemisphereLightHelper);
  }

  #createGround() {
    const groundGeo = new THREE.PlaneGeometry(10000, 10000);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // groundMat.color.setHSL(0.095, 1, 0.75);
    groundMat.color.setHSL(0.0, 0.0, 1.0);

    const ground = new THREE.Mesh(groundGeo, groundMat);
    // ground.position.y = -33;
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.castShadow = true;
    // this.scene.add(ground);
  }

  #createSkyDome() {
    const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
    const skyMat = SkyMat;
    const sky = new THREE.Mesh(skyGeo, skyMat);
    // this.scene.add(sky);
  }

  /**
   * Create a box with a PBR material
   */
  #createBox() {
    const geometry = new BoxGeometry(1, 1, 1, 1, 1, 1);

    const material = new MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.7,
      roughness: 0.35,
    });

    this.box = new Mesh(geometry, material);
    this.box.position.x = -1.5;
    this.box.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    this.box.castShadow = true;

    // this.scene.add(this.box);

    if (!this.hasPhysics) return;

    const body = new this.PhysicsBox(this.box, this.scene);
    this.simulation.addItem(body);
  }

  /**
   * Create a box with a custom ShaderMaterial
   */
  #createShadedBox() {
    const geometry = new BoxGeometry(1, 1, 1, 1, 1, 1);

    this.shadedBox = new Mesh(geometry, SampleShaderMaterial);
    this.shadedBox.position.x = 1.5;
    this.shadedBox.castShadow = true;
    this.shadedBox.receiveShadow = true;

    // this.scene.add(this.shadedBox);
  }

  #createFloor() {
    if (!this.hasPhysics) return;

    const geometry = new PlaneGeometry(20, 20, 1, 1);
    const material = new MeshBasicMaterial({ color: 0x424242 });

    this.floor = new Mesh(geometry, material);
    this.floor.rotateX(-Math.PI * 0.5);
    this.floor.position.set(0, -10, 0);
    this.floor.castShadow = true;
    this.floor.receiveShadow = true;

    this.scene.add(this.floor);

    const body = new this.PhysicsFloor(this.floor, this.scene);
    this.simulation.addItem(body);
  }

  /**
   * Load a 3D model and append it to the scene
   */
  async #loadModel() {
    const gltf = await gltfLoader.load("/suzanne.glb");

    const mesh = gltf.scene.children[0];
    mesh.position.y = 0.5;
    mesh.position.z = 1.5;
    mesh.castShadow = true;

    mesh.material = SampleShaderMaterial.clone();
    // mesh.material.wireframe = true;

    // this.scene.add(mesh);

    const loader = new Rhino3dmLoader();
    loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@7.15.0/");

    loader.load(
      "./test-scene.3dm",
      (object) => {
        object.rotation.x = -Math.PI / 2;
        // console.log(object.children);
        object.children[3].castShadow = true;
        object.children[3].intensity = 1000;
        // console.log(object.children[3]);
        // this.scene.add(object);

        object.traverse((child) => {
          if (child.isMesh) {
            const material = new MeshStandardMaterial({ color: 0xffffff });
            child.material = material;
            // child.mesh.castShadow = true;
            // child.mesh.receiveShadow = true;
          }
        });
      },
      function (xhr) {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      // called when loading has errors
      function (error) {
        console.log("An error happened");
        console.log(error);
      }
    );

    // loader.load(
    //   "./test-curves-02.3dm",
    //   (object) => {
    //     object.rotation.x = -Math.PI / 2;
    //     object.updateMatrixWorld();
    //     // this.scene.add(object);

    //     // this.camera.lookAt(object.position);
    //     console.log("curves:", object);
    //     // const curves = extractCurvesFromObject(object);

    //     const lines = [];

    //     object.traverse((child) => {
    //       if (child instanceof THREE.Line) lines.push(child);
    //     });

    //     const curves = lines.map((line) => {
    //       const pointsArray = line.geometry.getAttribute("position").array;
    //       const points = [];

    //       for (let i = 0; i < pointsArray.length; i += 3) {
    //         const point = new THREE.Vector3(
    //           pointsArray[i],
    //           pointsArray[i + 1],
    //           pointsArray[i + 2]
    //         );
    //         point.applyMatrix4(object.matrixWorld);
    //         points.push(point);
    //       }
    //       const curve = new THREE.CatmullRomCurve3(
    //         points,
    //         false,
    //         "centripetal"
    //       );
    //       const curveGeometry = new THREE.BufferGeometry().setFromPoints(
    //         curve.getPoints(300)
    //       );

    //       // curve.points
    //       // curve.getPoints(curve.getLength() / 100)
    //       const curveMaterial = new THREE.LineBasicMaterial({
    //         color: 0x1e1e1e,
    //       });
    //       const curveLine = new THREE.Line(curveGeometry, curveMaterial);
    //       this.scene.add(curveLine);
    //       return curve;
    //     });

    //     this.pointsToAnimate = [];

    //     curves.forEach((curve) => {
    //       console.log(curve);
    //       const number = curve.getLength() * 0.5;
    //       const pointsOnCurve = curve.getSpacedPoints(number);

    //       pointsOnCurve.forEach((point, index) => {
    //         const geometry = new THREE.SphereGeometry(0.05);
    //         const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    //         const mesh = new THREE.Mesh(geometry, material);
    //         mesh.position.copy(point);

    //         const initialT = index / pointsOnCurve.length;
    //         mesh.userData.initialT = initialT;
    //         mesh.userData.curve = curve;

    //         this.pointsToAnimate.push({ mesh, curve });
    //         this.scene.add(mesh);
    //       });
    //     });
    //   },
    //   function (error) {
    //     console.log("An error happened!");
    //     console.log("Error:", error);
    //   }
    // );

    loader.load(
      "./test-curves-02.3dm",
      (object) => {
        this.processObject.call(this, object);
      },
      (progress) => {
        console.log(
          "Loading progress:",
          (progress.loaded / progress.total) * 100,
          "%"
        );
      },
      function (error) {
        console.log("An error happened!");
        console.log("Error:", error);
      }
    );
  }

  processObject(object) {
    object.rotation.x = -Math.PI / 2;
    object.updateMatrixWorld();

    const lines = object.children.filter(
      (child) => child instanceof THREE.Line
    );

    const curves = lines.map((line) =>
      this.extractCurve(line, object.matrixWorld)
    );

    let minZ = Infinity;
    let maxZ = -Infinity;

    curves.forEach((curve) => {
      const pointOnCurve = curve.getPoints()[0];
      minZ = Math.min(minZ, pointOnCurve.z);
      maxZ = Math.max(maxZ, pointOnCurve.z);
    });

    console.log("minZ:", minZ);
    console.log("maxZ", maxZ);

    curves.forEach((curve) => {
      const pointOnCurve = curve.getPoints()[0];
      const t = (pointOnCurve.z - minZ) / (maxZ - minZ); // Calculate t based on pointOnCurve.z

      console.log("t:", t);
      const bottomColor = new THREE.Color(0xdd25e1);
      const topColor = new THREE.Color(0x0e41f5);
      const curveColor = bottomColor.lerp(topColor, t);

      const curvePoints = curve.getPoints(300);
      const curveGeometry = new THREE.BufferGeometry().setFromPoints(
        curvePoints
      );
      const curveMaterial = new THREE.LineBasicMaterial({ color: curveColor });

      const heights = new Float32Array(curvePoints.length);
      for (let i = 0; i < curvePoints.length; i++) {
        heights[i] = curvePoints[i].y * 2.5;
      }
      console.log(heights);
      curveGeometry.setAttribute(
        "vertexHeight",
        new THREE.BufferAttribute(heights, 1)
      );

      const lineMat = LineMat(minZ, maxZ);
      const curveLine = new THREE.Line(curveGeometry, lineMat);
      this.scene.add(curveLine);
    });

    this.pointsToAnimate = this.createAndAddPointsToScene(curves, minZ, maxZ);
  }

  extractCurve(line, matrixWorld) {
    const pointsArray = line.geometry.getAttribute("position").array;
    const points = [];

    for (let i = 0; i < pointsArray.length; i += 3) {
      const point = new THREE.Vector3(
        pointsArray[i],
        pointsArray[i + 1],
        pointsArray[i + 2]
      );
      point.applyMatrix4(matrixWorld);
      points.push(point);
    }

    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");

    return curve;
  }

  createAndAddPointsToScene(curves, minZ, maxZ) {
    const pointsToAnimate = [];

    curves.forEach((curve) => {
      const number = curve.getLength() * 0.5;
      const pointsOnCurve = curve.getSpacedPoints(number);
      // const pointsOnCurve = curve.getPoints(90);

      pointsOnCurve.forEach((point, index) => {
        const geometry = new THREE.SphereGeometry(0.05);
        const sphereColor = this.getColorFromHeight(point.y * 2.5, minZ, maxZ);
        const material = new THREE.MeshBasicMaterial({ color: sphereColor });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(point);

        const initialT = index / pointsOnCurve.length;
        mesh.userData.initialT = initialT;
        mesh.userData.curve = curve;

        pointsToAnimate.push({ mesh, curve });
        this.scene.add(mesh);
      });
    });

    return pointsToAnimate;
  }

  getColorFromHeight(height, minZ, maxZ) {
    const t = (height - minZ) / (maxZ - minZ);
    const bottomColor = new THREE.Color(0xea18ce);
    const topColor = new THREE.Color(0x0000ff);
    return bottomColor.lerp(topColor, t);
  }

  #createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  }

  #createClock() {
    this.clock = new Clock();
  }

  #addListeners() {
    window.addEventListener("resize", this.#resizeCallback, { passive: true });
  }

  #removeListeners() {
    window.removeEventListener("resize", this.#resizeCallback, {
      passive: true,
    });
  }

  #onResize() {
    this.screen.set(this.container.clientWidth, this.container.clientHeight);

    this.camera.aspect = this.screen.x / this.screen.y;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.screen.x, this.screen.y);
  }
}

window._APP_ = new App("#app", {
  physics: window.location.hash.includes("physics"),
  debug: window.location.hash.includes("debug"),
});

window._APP_.init();
