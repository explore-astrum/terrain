const HEIGHTMAP = require('./heightmap.png')
import * as THREE from 'three'
import * as Chroma from 'chroma-js'
import { OrbitControls } from 'three-orbitcontrols-ts'

const root = document.getElementById('canvas') as HTMLCanvasElement

var renderer;
var scene;
var camera;
var control;
var scale = Chroma.scale(['blue', 'green', 'red']).domain([0, 50]);
function init() {
    // create a scene, that will hold all our elements such as objects, cameras and lights.
    scene = new THREE.Scene();
    // create a camera, which defines where we're looking at.
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    // create a render, sets the background color and the size
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0x000000, 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // add light
    var light = new THREE.DirectionalLight();
    light.position.set(1200, 1200, 1200);
    scene.add(light);
    // position and point the camera to the center of the scene
    camera.position.x = 1200;
    camera.position.y = 500;
    camera.position.z = 1200;
    camera.lookAt(scene.position);
    // add the output of the renderer to the html element
    document.body.appendChild(renderer.domElement);
    control = new OrbitControls(camera, renderer.domElement)
    createGeometryFromMap();
    // call the render function
    render();
}
function createGeometryFromMap() {
    var depth = 64;
    var width = 64;
    var spacingX = 1;
    var spacingZ = 1;
    var heightOffset = 1;
    var canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    var ctx = canvas.getContext('2d');
    var img = new Image();
    img.src = HEIGHTMAP;
    img.onload = function () {
        // draw on canvas
        ctx.drawImage(img, 0, 0);
        var pixel = ctx.getImageData(0, 0, width, depth);
        var geom = new THREE.Geometry;
        var output = [];
        for (var x = 0; x < depth; x++) {
            for (var z = 0; z < width; z++) {
                // get pixel
                // since we're grayscale, we only need one element
                var yValue = pixel.data[z * 4 + (depth * x * 4)] / heightOffset;
                var vertex = new THREE.Vector3(x * spacingX, yValue, z * spacingZ);
                geom.vertices.push(vertex);
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
                face1.color = new THREE.Color(scale(getHighPoint(geom, face1)).hex());
                face2.color = new THREE.Color(scale(getHighPoint(geom, face2)).hex())
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
            shading: THREE.NoShading
        }));
        mesh.translateX(-xMax / 2);
        mesh.translateZ(-zMax / 2);
        scene.add(mesh);
        mesh.name = 'valley';
    };
}
function getHighPoint(geometry, face) {
    var v1 = geometry.vertices[face.a].y;
    var v2 = geometry.vertices[face.b].y;
    var v3 = geometry.vertices[face.c].y;
    return Math.max(v1, v2, v3);
}
function render() {
    control.update()
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}
// calls the init function when the window is done loading.
window.onload = init;