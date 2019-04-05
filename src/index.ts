const HEIGHTMAP = require('./hm.png')
import * as THREE from 'three'
import * as Chroma from 'chroma-js'
import { OrbitControls } from 'three-orbitcontrols-ts'

const root = document.getElementById('canvas') as HTMLCanvasElement

const SIZE = 512
const PLOT = SIZE / (64 * 4)
const HEIGHT = 100
const WATER = 0.05
const BORDER = 1

var renderer;
var scene;
var camera;
var control;
var scale = Chroma.scale(['green', 'white']).domain([0, HEIGHT]);
let box;
function init() {
    // create a scene, that will hold all our elements such as objects, cameras and lights.
    scene = new THREE.Scene();
    // create a camera, which defines where we're looking at.
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    // create a render, sets the background color and the size
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xFFFFFF, 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // add light
    var light = new THREE.DirectionalLight();
    light.position.set(SIZE / 2, 500, SIZE / 2);
    scene.add(light);
    // position and point the camera to the center of the scene
    camera.position.x = SIZE * 2;
    camera.position.y = SIZE;
    camera.position.z = SIZE / 2;
    camera.lookAt(new THREE.Vector3(SIZE / 2, 0, SIZE / 2));
    // add the output of the renderer to the html element
    document.body.appendChild(renderer.domElement);
    control = new OrbitControls(camera, renderer.domElement)
    control.enablePan = false
    control.autoRotate = false
    control.target = new THREE.Vector3(SIZE / 2, 0, SIZE / 2)

    var geometry = new THREE.BoxGeometry(PLOT, HEIGHT, PLOT);
    var material = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true });
    box = new THREE.Mesh(geometry, material);
    box.position.set(SIZE / 2, HEIGHT / 2, SIZE / 2)
    scene.add(box);

    createGeometryFromMap();
    // call the render function
    render();
    window.addEventListener('click', event => {
        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(
            new THREE.Vector2(
                (event.clientX / window.innerWidth) * 2 - 1,
                - (event.clientY / window.innerHeight) * 2 + 1
            ),
            camera
        );

        // calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(scene.children).filter(i => i.object.name === 'valley')
        console.log(intersects)
        const vector = intersects[0].point
        const x = Math.floor(vector.x / PLOT) * PLOT
        const z = Math.floor(vector.z / PLOT) * PLOT
        console.log(x, z)
        box.position.set(x + PLOT / 2, HEIGHT / 2, z + PLOT / 2)
        // control.target.copy(box.position)
    })
}
function createGeometryFromMap() {
    var depth = SIZE + BORDER * 2;
    var width = SIZE + BORDER * 2;
    var spacingX = 1;
    var spacingZ = 1;
    var heightOffset = 1;
    var canvas = document.createElement('canvas');
    canvas.width = depth;
    canvas.height = width;
    var ctx = canvas.getContext('2d');
    var img = new Image();
    img.src = HEIGHTMAP;
    img.onload = function () {
        // draw on canvas
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, BORDER, BORDER, SIZE, SIZE);
        var pixel = ctx.getImageData(0, 0, width, depth);
        var geom = new THREE.Geometry;
        const output: number[] = []
        let max = 0;
        let min = 1000000;
        for (let i = 0; i < pixel.data.length; i += 4) {
            const r = pixel.data[i]
            const g = pixel.data[i + 1]
            const b = pixel.data[i + 2]
            const avg = (r + g + b) / 3
            output.push(avg)
            if (avg > max)
                max = avg
            if (avg < min && avg !== 0)
                min = avg
        }
        let i = 0
        for (var x = 0; x < depth; x++) {
            for (var z = 0; z < width; z++) {
                // get pixel
                // since we're grayscale, we only need one element
                var yValue = Math.max(WATER, (output[i] - min) / (max - min))
                var vertex = new THREE.Vector3(x * spacingX, yValue * HEIGHT, z * spacingZ);
                geom.vertices.push(vertex);
                i++
            }
        }
        // we create a rectangle between four vertices, and we do
        // that as two triangles.
        for (var z = 0; z < depth - 1; z++) {
            for (var x = 0; x < width - 1; x++) {
                // we need to point to the position in the array
                // a - - b
                // |  x  |
                // c - - d
                var a = x + z * width;
                var b = (x + 1) + (z * width);
                var c = x + ((z + 1) * width);
                var d = (x + 1) + ((z + 1) * width);
                var face1 = new THREE.Face3(a, b, d);
                var face2 = new THREE.Face3(d, c, a);
                face1.color = new THREE.Color(color(geom, face1));
                face2.color = new THREE.Color(color(geom, face2));
                geom.faces.push(face1);
                geom.faces.push(face2);
            }
        }
        geom.computeVertexNormals(true);
        geom.computeFaceNormals();
        geom.computeBoundingBox();
        var zMax = geom.boundingBox.max.z;
        var xMax = geom.boundingBox.max.x;
        var mesh = new THREE.Mesh(geom, new THREE.MeshLambertMaterial({
            vertexColors: THREE.FaceColors,
            color: 0x666666,
            shading: THREE.SmoothShading
        }));
        mesh.material.side = THREE.DoubleSide;
        mesh.translateX(-BORDER);
        mesh.translateZ(-BORDER);
        scene.add(mesh);
        mesh.name = 'valley';
    };
}
function color(geometry, face) {
    var v1 = geometry.vertices[face.a].y;
    var v2 = geometry.vertices[face.b].y;
    var v3 = geometry.vertices[face.c].y;
    const result = Math.max(v1, v2, v3);
    if (result == HEIGHT * WATER) return 0x0023FF
    return scale(result).hex()
}
function render() {
    control.update()
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}
// calls the init function when the window is done loading.
window.onload = init;