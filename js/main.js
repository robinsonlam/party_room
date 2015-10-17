var scene, camera, renderer;
var cubeGeometry, cube, material;
var sphereGeometry, sphere;

scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

camera.position.z = 5;
camera.position.x = 5;

var controls = new THREE.OrbitControls(camera, renderer.domElement);

var light = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( light );

var spotLight = new THREE.SpotLight( 0xffffff );
spotLight.position.set( 1, 20, 10 );
spotLight.castShadow = true;
spotLight.shadowCameraNear = 8;
spotLight.shadowCameraFar = 30;
spotLight.shadowMapWidth = 1024;
spotLight.shadowMapHeight = 1024;
spotLight.angle = 1;
spotLight.exponent = 5;
scene.add( spotLight );

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;

//OBJECTS
	//Materials
phongMaterial = new THREE.MeshPhongMaterial({ color: 0x156289, emissive: 0x072534 });
material = new THREE.MeshBasicMaterial( { name: 'green-wire', color: 0x00ff00, wireframe: true } );

var planeGeometry = new THREE.PlaneGeometry( 100, 100, 1 );
var planeMaterial = new THREE.MeshPhongMaterial( {color: 0xffffff, 
												emissive: 0x072534, 
												side: THREE.DoubleSide, 
												shading: THREE.FlatShading} );


var ground = new THREE.Mesh( planeGeometry, planeMaterial );
ground.rotation.x = 1.57;
ground.position.y = -2;
ground.scale.multiplyScalar( 3 );
ground.castShadow = false;
ground.receiveShadow = true;
scene.add( ground );


cubeGeometry = new THREE.BoxGeometry( 1, 1, 1 );
sphereGeometry = new THREE.SphereGeometry( 1, 5, 5 );



sphere = new THREE.Mesh( sphereGeometry, phongMaterial );
// scene.add( sphere );
//var cubeRotation = false;
var cubeHolder = []; 					//holds some cube info

var cubeCreate = function(cubeName) {
	this.cubeName = cubeName;
	this.cubeRotation = true;

	this.cube = new THREE.Mesh( cubeGeometry, phongMaterial );
	this.cube.castShadow = true;
	scene.add( this.cube );

	return this.cubeName;
}

var cubeRemove = function () {
	//removes all cubes
	scene.children = [];
	cubeHolder = [];
}

//RENDER & ANIMATE SCENE
var render = function () {
	requestAnimationFrame( render );

	for (var i = 0; i < scene.children.length; i++ ) {

		if (scene.children[i].type === "Mesh" && scene.children[i].geometry.type === 'BoxGeometry') {

			scene.children[i].rotation.x += Math.random() * .1;
			scene.children[i].rotation.y += 0.01;
			scene.children[i].position.x += 0.01;

		}
		
		
	}
	
	renderer.render(scene, camera);
};

$(document).ready( function() {

	render();

	$('#addBoxes').on('click', function () {

		var a = new cubeCreate(cubeHolder.length.toString());
		cubeHolder.push(a);
		console.log('CUBE HOLDER Length:', cubeHolder.length);

	});

	$('#removeBoxes').on('click', function () {

		cubeRemove();

	});

	setInterval(function() {
		var a = new cubeCreate(cubeHolder.length.toString());
		cubeHolder.push(a);
		// console.log('cube has been created');
		// console.log('CUBE HOLDER Length:', cubeHolder.length);

		if (cubeHolder.length === 8 ){

			// cubeHolder.shift();
			// scene.children.shift();
			// console.log('A CUBE HAS BEEN REMOVED');

			// cubeRemove();
		}
	}, 3000);

});

