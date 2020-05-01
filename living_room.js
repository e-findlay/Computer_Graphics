let VSHADER_SOURCE = [
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'attribute vec4 a_Normal;\n' +
	'attribute vec2 a_TexCoords;\n' +
	'uniform vec3 u_CameraPosition;\n' +
    'uniform mat4 u_ProjMatrix;\n' +
    'uniform mat4 u_ViewMatrix;\n' +
    'uniform mat4 u_ModelMatrix;\n' +
    'uniform mat4 u_NormalMatrix;\n' +
    'varying vec4 v_Color;\n' +
    'varying vec3 v_Normal;\n' +
    'varying vec2 v_TexCoords;\n' +
	'varying vec3 v_Position;\n' +
	'varying vec3 v_CameraDirection;\n' +
    'void main() {\n' +
	'  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
    '  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
    '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    '  v_Color = a_Color;\n' +
	'  v_TexCoords = a_TexCoords;\n' +
	'  v_CameraDirection = u_CameraPosition - v_Position;\n' +
    '}'];

let FSHADER_SOURCE = [
    'precision mediump float;\n' +
	'uniform bool u_UseTextures;\n' +
	'uniform bool u_isLighting;\n' +
	'uniform sampler2D u_Sampler;\n' +
    'uniform vec3 u_LightPosition[1];\n' +
    'uniform vec3 u_LightColor;\n' +
    'uniform vec3 u_AmbientLight;\n' +
    'varying vec3 v_Normal;\n' +
    'varying vec3 v_Position;\n' +
	'varying vec4 v_Color;\n' +
	'varying vec3 v_CameraDirection;\n' +
    'varying vec2 v_TexCoords;\n' +
    'void main() {\n' +
    '  vec4 texture = u_UseTextures ? texture2D(u_Sampler, v_TexCoords) : v_Color;\n' +
    '  vec3 normal = normalize(v_Normal);\n' +
    '  vec3 ambient = u_AmbientLight * texture.rgb;\n' +
	'  vec3 diffuse;\n' +
	'  vec4 specular;\n' +
	'  vec3 cameraDirection = normalize(v_CameraDirection);\n' +
	'  for(int i=0; i<3; i++){\n' +
	'       vec3 lightDirection = normalize(u_LightPosition[i] - v_Position);\n' +
	'       float lightDistance = length(u_LightPosition[i] - v_Position);\n' +
	'		float inverse_square = 1.0 / (1.0 + 0.1 * pow(lightDistance, 2.0));\n' +
    '       float nDotL = max(dot(lightDirection, normal), 0.0);\n' +
    '       diffuse = u_LightColor * texture.rgb * nDotL;\n' +
	'    	vec3 reflectDirection = reflect(-lightDirection, normal);\n' +
	'		float Is = pow(max(dot(reflectDirection, cameraDirection), 0.0), 550.0);\n' +
	'		vec4 Ia = vec4(ambient, 1.0);\n' +
	'		vec4 Id = vec4(diffuse * inverse_square, 1.0);\n' +
	'		specular = Ia + Id + Is * 0.5;\n' +
	'	gl_FragColor = specular;\n' +
	'   gl_FragColor.rgb *= gl_FragColor.a;\n' +
	'}\n' +
    '}'];

let modelMatrix = new Matrix4(); // The model matrix
let viewMatrix = new Matrix4();  // The view matrix
let projMatrix = new Matrix4();  // The projection matrix
let g_normalMatrix = new Matrix4();  // Coordinate transformation matrix for normals

var ANGLE_STEP = 3.0;  // The increments of rotation angle (degrees)
var g_xAngle = 0.0;    // The rotation x angle (degrees)
var g_yAngle = 0.0;    // The rotation y angle (degrees)
let keys = [0,0,0,0,0];// The displacement of piano key options
let xcoord = 0;
let zcoord = 10;
let change = 1;
let u_LightColor;
let u_LightPosition;
let u_CameraPosition;
let u_Sampler;
let u_UseTextures;
let textures = false;	// flag for textures
let stool_distance = 0; // distance of stool from original position
let stool_back = false; // direction of stool
let move_stool = false; // flag for stool
let piano = false;		// flag for piano
let draw1_angle = 0;
let draw2_angle = 0;
let cabinet = false;
let open_draw1 = true;  // flag to indicate direction of first cabinet door opening
let draw_1_opening = true;// flag to indicate whether cabinet door 1 or 2 is being opened
let open_draw2 = false;	// flag to indicate direction of second cabinet door opening
let swinging = false;	// flag for swinging ceiling lamp
let light_angle = 0;	// angle of rotation for ceiling lamp
let swing_forwards = true;// direction of swing for ceiling lamp
let living_area = false;// flag for moving furniture in living area
let move_living_area_initial = true;// flag to indicate which direction to move cabinet and sofa
let sofa_displacement = 0; // displacement of sofa from initial position
let cabinet_displacement = 0;// displacement of cabinet from initial position
let armchair_angle = 0;	// angle of rotation for armchairs
let light_points = new Float32Array([11, 3, -9, 7, 3, -9, 0, 5.6, 11]);// Coordinates for light points
//let light_points = new Float32Array([0,5.6, 11]);
const celiing_light_point = [0, 5.6, 11];
let chair_angle = 0;
let push_chair = false;
let pushed = true;
let table_displacent = 0;
let table_displaced = false;

function main() {
	// Retrieve <canvas> element
	var canvas = document.getElementById('webgl');

	// Get the rendering context for WebGL
	var gl = getWebGLContext(canvas);  // Ask for non-premultiplied alpha);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// Initialize shaders
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('Failed to intialize shaders.');
		return;
	}

	// Set clear color and enable hidden surface removal
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.BLEND);


	// Clear color and depth buffer
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Get the storage locations of uniform attributes
	let u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    let u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    let u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    let u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
	u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
	u_CameraPosition = gl.getUniformLocation(gl.program, 'u_CameraPosition');
    let u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
    u_UseTextures = gl.getUniformLocation(gl.program, "u_UseTextures");

	if (!u_ModelMatrix || !u_ViewMatrix || !u_NormalMatrix ||
		!u_ProjMatrix || !u_LightColor || !u_LightPosition ||
	 	!u_AmbientLight) { 
		console.log('Failed to Get the storage locations of u_ModelMatrix, u_ViewMatrix, and/or u_ProjMatrix');
		return;
	}

	// set u_Use_Textures initially to 0
	gl.uniform1i(u_UseTextures, 0);

	// load texture for table and chair legs
	let table_Texture = gl.createTexture();
    table_Texture.image = new Image();
    table_Texture.image.crossOrigin = "anonymous";
    table_Texture.image.src = './textures/table.jpg';
    table_Texture.image.onload = function () {
        loadTexture(gl, table_Texture, gl.TEXTURE1);
	};
	
		
	// load texture for chair seat and back
	let chair_Texture = gl.createTexture();
    chair_Texture.image = new Image();
    chair_Texture.image.crossOrigin = "anonymous";
    chair_Texture.image.src = './textures/chair.jpg';
    chair_Texture.image.onload = function () {
        loadTexture(gl, chair_Texture, gl.TEXTURE2);
	};
	

	// load texture for carpet
	let carpet_Texture = gl.createTexture();
    carpet_Texture.image = new Image();
    carpet_Texture.image.crossOrigin = "anonymous";
    carpet_Texture.image.src = './textures/carpet.jpg';
    carpet_Texture.image.onload = function () {
        loadTexture(gl, carpet_Texture, gl.TEXTURE3);
	};
	

	// load texture for piano
	let piano_Texture = gl.createTexture();
    piano_Texture.image = new Image();
    piano_Texture.image.crossOrigin = "anonymous";
    piano_Texture.image.src = './textures/piano.jpg';
    piano_Texture.image.onload = function () {
        loadTexture(gl, piano_Texture, gl.TEXTURE4);
	};
	

	// load texture for sofa and armchairs
	let sofa_Texture = gl.createTexture();
    sofa_Texture.image = new Image();
    sofa_Texture.image.crossOrigin = "anonymous";
    sofa_Texture.image.src = './textures/sofa.jpg';
    sofa_Texture.image.onload = function () {
        loadTexture(gl, sofa_Texture, gl.TEXTURE5);
    };


	// load texture for lampshades
	let lampshade_Texture = gl.createTexture();
    lampshade_Texture.image = new Image();
    lampshade_Texture.image.crossOrigin = "anonymous";
    lampshade_Texture.image.src = './textures/lampshade.jpg';
    lampshade_Texture.image.onload = function () {
        loadTexture(gl, lampshade_Texture, gl.TEXTURE6);
	};
	
	// load texture for tv screen
	let tv_Texture = gl.createTexture();
	tv_Texture.image = new Image();
	tv_Texture.image.crossOrigin = "anonymous";
	tv_Texture.image.src = './textures/tv_screen.jpg';
	tv_Texture.image.onload = function () {
		loadTexture(gl, tv_Texture, gl.TEXTURE7);
	};

	// load texture for stool
	let stool_Texture = gl.createTexture();
	stool_Texture.image = new Image();
	stool_Texture.image.crossOrigin = "anonymous";
	stool_Texture.image.src = './textures/stool.jpg';
	stool_Texture.image.onload = function () {
		loadTexture(gl, stool_Texture, gl.TEXTURE8);
	};

	// load texture for bookcase
	let bookcase_Texture = gl.createTexture();
	bookcase_Texture.image = new Image();
	bookcase_Texture.image.crossOrigin = "anonymous";
	bookcase_Texture.image.src = './textures/bookcase.jpg';
	bookcase_Texture.image.onload = function () {
		loadTexture(gl, bookcase_Texture, gl.TEXTURE9);
	};
	
	// Set the light color (white)
	gl.uniform3f(u_AmbientLight, 0.3, 0.3, 0.3);


	// Calculate the view matrix and the projection matrix
	viewMatrix.setLookAt(xcoord, 2, zcoord, 0, 0, -100, 0, 1, 0);
	projMatrix.setPerspective(30, canvas.width/canvas.height, 2, 100);
	// Pass the model, view, and projection matrix to the uniform variable respectively
	gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
	gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
	gl.uniform3f(u_CameraPosition, xcoord, 2, zcoord);
	let then = 0;
	let render = (now) => {
		now *= 0.001;
		const deltaTime = now - then;
		then = now;
		document.onkeydown = function(ev){
			keydown(ev, gl, u_ModelMatrix, u_NormalMatrix, u_ViewMatrix, u_UseTextures, deltaTime);
		};
		if (move_stool){
			moveStool();
		}
		if (piano){
			playPiano();
		}
		if (cabinet){
			openCabinet();
		}
		if (swinging){
			swingLight();
		}
		if(living_area){
			moveLivingArea();
		}
		if (push_chair){
			pushChair();
		}

		draw(gl, u_ModelMatrix, u_NormalMatrix, u_UseTextures, deltaTime);
		requestAnimationFrame(render);
	}
	render();
  
}

function keydown(ev, gl, u_ModelMatrix, u_NormalMatrix, u_ViewMatrix, u_UseTextures, deltaTime) {

	switch (ev.keyCode) {
		case 40: // Up arrow key -> the positive rotation around the y-axis
		if (g_xAngle < 45) g_xAngle = (g_xAngle + ANGLE_STEP) % 360;
		break;
		case 38: // Down arrow key -> the negative rotation around the y-axis
		if (g_xAngle > -45) g_xAngle = (g_xAngle - ANGLE_STEP) % 360;
		break;
		case 39: // Right arrow key -> the positive rotation around the y-axis
		g_yAngle = (g_yAngle + ANGLE_STEP) % 360;
		break;
		case 37: // Left arrow key -> the negative rotation around the y-axis
		g_yAngle = (g_yAngle - ANGLE_STEP) % 360;
		break;
		case 65: //Press A to decrease the xcoord
		xcoord -= change;
		viewMatrix.setLookAt(xcoord, 2, zcoord, 0, 0, -100, 0, 1, 0);
		gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
		break;
		case 87: // Press W to increase the zcoord
		zcoord -= change;
		viewMatrix.setLookAt(xcoord, 2, zcoord, 0, 0, -100, 0, 1, 0);
		gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
		break;
		case 68: // Press D to increase the xcoord
		xcoord += change;
		viewMatrix.setLookAt(xcoord, 2, zcoord, 0, 0, -100, 0, 1, 0);
		gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
		break;
		case 83: // Press S to decrease the zcoord
		zcoord += change;
		viewMatrix.setLookAt(xcoord, 2, zcoord, 0, 0, -100, 0, 1, 0);
		gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
		break;
		case 80:
		// start/stop playing the piano when P is pressed
		piano = !piano;
		break;
		case 84:
		// show/hide textures when T is pressed
		textures = !textures;
		break;
		case 88:
		// move/stop moving stool when S is pressed
		move_stool = !move_stool;
		break;
		case 67:
		// open cabinet doors when C is pressed
		cabinet = !cabinet;
		break;
		case 76:
		// swing celining light when L is pressed
		swinging = !swinging;
		break;
		case 77:
		// rearrange armchairs, sofa and tv cabinet when M is pressed
		living_area = !living_area;
		break;
		case 75:
		// Press K to push chair into table
		push_chair = !push_chair;
		break;
		default: return; // Skip drawing at no effective action
	}

	// Draw the scene
	draw(gl, u_ModelMatrix, u_NormalMatrix, u_UseTextures, deltaTime);
}

function playPiano(){
	// if key is raised then lower
	// raising key lowers next set of keys in sequence
	if (keys[0] == 0){
		keys[0] = -0.25;
		return;
	}else{
		keys[0] = 0;
	}

	if (keys[1] == 0){
		keys[1] = -0.25;
		return;
	}else{
		keys[1] = 0;
	}

	if (keys[2] == 0){
		keys[2] = -0.25;
		return;
	}else{
		keys[2] = 0;
	}

	if (keys[3] == 0){
		keys[3] = -0.25;
		return;
	}else{
		keys[3] = 0;
	}

	if (keys[4] == 0){
		keys[4] = -0.25;
		return;
	}else{
		keys[4] = 0;
	}
	
}

function moveStool(){
	if(!stool_back){
		if (stool_distance < 2){
			stool_distance += 0.5;
		}else{
			stool_back = true;
		}
	}else{
		if (stool_distance > 0){
			stool_distance -= 0.5;
		}else{
			stool_back = false;
		}

	}
}

function openCabinet(deltaTime){
	if (open_draw1){
		if (draw_1_opening){
			draw1_angle += 5;
			if (draw1_angle > 50){
				draw_1_opening = false;
			}
		}else{
			draw1_angle -= 5;
			if (draw1_angle <= 0){
				open_draw1 = false;
				draw_2_opening = true;
			}
		}
	}else{
		if (draw_2_opening){
			draw2_angle += 5;
			if (draw2_angle > 50){
				draw_2_opening = false;
			}
		}else{
			draw2_angle -= 5;
			if (draw2_angle <= 0){
				open_draw1 = true;
				draw_1_opening = true;
			}
		}
	}
}

function swingLight(){
	if (swing_forwards){
		light_angle += 5;
		light_points[6] = celiing_light_point[0] + Math.sin(light_angle * Math.PI/180) * 2.4;
		light_points[7] = celiing_light_point[1] + Math.cos(light_angle * Math.PI/180) * 2.4;

		if (light_angle >= 50){
			swing_forwards = false;
		}

	}else{
		light_angle -= 5
		light_points[6] = celiing_light_point[0] + Math.sin(light_angle * Math.PI/180) * 2.4;
		light_points[7] = celiing_light_point[1] + Math.cos(light_angle * Math.PI/180) * 2.4;

		if (light_angle <= -50){
			swing_forwards = true;
		}
	}
}

function moveLivingArea(){
	armchair_angle = armchair_angle + 10 % 360;
	if (move_living_area_initial){
		sofa_displacement += 1;
		cabinet_displacement -= 1;
		if(sofa_displacement > 3){
			move_living_area_initial = false;
		}

	}else{
		sofa_displacement -= 1;
		cabinet_displacement += 1;
		if (sofa_displacement < -5){
			move_living_area_initial = true;
		}

	}
}

function pushChair(){
	if (pushed){
		chair_angle += 12.5;
		if (chair_angle == 25){
			pushed = false;
		}
	}
	if (chair_angle == 25 && !table_displaced){
		table_displacent -= 2;
		// move light point x positions to match points of table lamps
		light_points[2] -= 2;
		light_points[4] -= 2;
		table_displaced = true;
		push_chair = false;
		return;
	}
	if (!pushed){
		if (table_displaced){
			table_displacent += 2;
			table_displaced = false;
			// move light point x positions to match points of table lamps
			light_points[2] += 2;
			light_points[4] += 2;
		}
		chair_angle -= 12.5;
		if (chair_angle == 0){
			push_chair = false;
			pushed = true;
		}
	}
}

// Function adapted from Practical 3
function initVertexBuffers(gl, r, g, b, a=1.0) {
	// Create a cube
	//    v6----- v5
	//   /|      /|
	//  v1------v0|
	//  | |     | |
	//  | |v7---|-|v4
	//  |/      |/
	//  v2------v3

	let vertices = new Float32Array([   // Coordinates
		0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5, // v0-v1-v2-v3 front
		0.5, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5,-0.5, // v0-v3-v4-v5 right
		0.5, 0.5, 0.5,   0.5, 0.5,-0.5,  -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5, // v0-v5-v6-v1 up
		-0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5, // v1-v6-v7-v2 left
		-0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5, // v7-v4-v3-v2 down
		0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5  // v4-v7-v6-v5 back
	]);


	let colors = new Float32Array([    // Colors
		r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a,     // v0-v1-v2-v3 front
		r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a,     // v0-v3-v4-v5 right
		r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a,     // v0-v5-v6-v1 up
		r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a,     // v1-v6-v7-v2 left
		r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a,     // v7-v4-v3-v2 down
		r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a,　    // v4-v7-v6-v5 back
	]);


	let normals = new Float32Array([    // Normal
		0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
		1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
		0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
	   	-1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
		0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
		0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
	]);

	let texCoords = new Float32Array([
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,  // v0-v1-v2-v3 front
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,  // v0-v3-v4-v5 right
        1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,  // v0-v5-v6-v1 up
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,  // v1-v6-v7-v2 left
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,  // v7-v4-v3-v2 down
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0   // v4-v7-v6-v5 back
    ]);

	// Indices of the vertices
	let indices = new Uint8Array([
		0, 1, 2,   0, 2, 3,    // front
		4, 5, 6,   4, 6, 7,    // right
		8, 9,10,   8,10,11,    // up
		12,13,14,  12,14,15,    // left
		16,17,18,  16,18,19,    // down
		20,21,22,  20,22,23     // back
	]);


	// Write the vertex property to buffers (coordinates, colors and normals)
	if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
	if (!initArrayBuffer(gl, 'a_Color', colors, 4, gl.FLOAT)) return -1;
	if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;
	if (!initArrayBuffer(gl, 'a_TexCoords', texCoords, 2, gl.FLOAT)) return -1;

	// Write the indices to the buffer object
	let indexBuffer = gl.createBuffer();
	if (!indexBuffer) {
		console.log('Failed to create the buffer object');
		return false;
	}

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

	return indices.length;
}


// Function adapted from Practical 3
function initArrayBuffer (gl, attribute, data, num, type) {
	// Create a buffer object
	let buffer = gl.createBuffer();
	if (!buffer) {
		console.log('Failed to create the buffer object');
		return false;
	}
	// Write date into the buffer object
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
	// Assign the buffer object to the attribute variable
	let a_attribute = gl.getAttribLocation(gl.program, attribute);
	if (a_attribute < 0) {
		console.log('Failed to get the storage location of ' + attribute);
		return false;
	}
	gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
	// Enable the assignment of the buffer object to the attribute variable
	gl.enableVertexAttribArray(a_attribute);

	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return true;
}

function initAxesVertexBuffers(gl) {

	let verticesColors = new Float32Array([
		// Vertex coordinates and color (for axes)
		-20.0,  0.0,   0.0,  1.0,  1.0,  1.0,  // (x,y,z), (r,g,b) 
		20.0,  0.0,   0.0,  1.0,  1.0,  1.0,
		0.0,  20.0,   0.0,  1.0,  1.0,  1.0, 
		0.0, -20.0,   0.0,  1.0,  1.0,  1.0,
		0.0,   0.0, -20.0,  1.0,  1.0,  1.0, 
		0.0,   0.0,  20.0,  1.0,  1.0,  1.0 
	]);
	var n = 6;

	// Create a buffer object
	var vertexColorBuffer = gl.createBuffer();  
	if (!vertexColorBuffer) {
		console.log('Failed to create the buffer object');
		return false;
	}

	// Bind the buffer object to target
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

	var FSIZE = verticesColors.BYTES_PER_ELEMENT;
	//Get the storage location of a_Position, assign and enable buffer
	var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('Failed to get the storage location of a_Position');
		return -1;
	}
	gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
	gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

	// Get the storage location of a_Position, assign buffer and enable
	var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
	if(a_Color < 0) {
		console.log('Failed to get the storage location of a_Color');
		return -1;
	}
	gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
	gl.enableVertexAttribArray(a_Color);  // Enable the assignment of the buffer object

	// Unbind the buffer object
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return n;
}

let g_matrixStack = []; // Array for storing a matrix

function pushMatrix(m) { // Store the specified matrix to the array
	let m2 = new Matrix4(m);
	g_matrixStack.push(m2);
}

function popMatrix() { // Retrieve the matrix from the array
	return g_matrixStack.pop();
	}

function draw(gl, u_ModelMatrix, u_NormalMatrix, u_UseTextures) {
	gl.uniform1i(u_UseTextures, 0);
	// Clear color and depth buffer
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.colorMask(true, true, true, true);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Set the light direction (in the world coordinate)
	let lightDirection = new Vector3([11.0, 3.0, -9.0]);
	lightDirection.normalize();     // Normalize
	gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
	gl.uniform3fv(u_LightPosition, light_points);
	u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');

	// Set the vertex coordinates and color (for the x, y axes)

	var n = initAxesVertexBuffers(gl);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}

	// Calculate the view matrix and the projection matrix
	modelMatrix.setTranslate(0, 0, 0);  // No Translation
	// Pass the model matrix to the uniform variable
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);



	// Set the vertex coordinates and color (for the cube)
	n = initVertexBuffers(gl, 225/255, 228/255, 196/255);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}

	// Rotate, and then translate
	modelMatrix.setTranslate(0, 0, 0);  // Translation (No translation is supported here)
	modelMatrix.rotate(g_yAngle, 0, 1, 0); // Rotate along y axis
	modelMatrix.rotate(g_xAngle, 1, 0, 0); // Rotate along x axis


	drawRoom(gl, u_ModelMatrix, u_NormalMatrix, n, textures);
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 8, 11);

	// set colour for celiing light
	n = initVertexBuffers(gl, 225/255, 228/255, 196/255);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}
	drawCeilingLamp(gl, u_ModelMatrix, u_NormalMatrix, n, textures);
	modelMatrix.translate(cabinet_displacement, -8.6, 2);
	modelMatrix.scale(1.5,1.5,1.5);
	modelMatrix.rotate(180, 0, 1, 0);
	drawCabinet(gl, u_ModelMatrix, u_NormalMatrix, n, textures);
	modelMatrix.scale(0.66, 0.66, 0.66);
	modelMatrix.translate(0, 3.0, 0);
	n= initVertexBuffers(gl, 15/255, 18/255, 16/255);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}
	drawTV(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	n = initVertexBuffers(gl, 15/255, 18/255, 96/255);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}
	pushMatrix(modelMatrix);
	modelMatrix.translate(sofa_displacement, -0.25, 5);
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE5);
	gl.uniform1i(u_Sampler, 5);
	drawSofa(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(-5, -0.25, 10);
	modelMatrix.rotate(90, 0, 1, 0);
	modelMatrix.rotate(armchair_angle, 0, 1, 0);
	drawArmChair(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(5, -0.25, 10);
	modelMatrix.rotate(270, 0, 1, 0);
	modelMatrix.rotate(-1 * armchair_angle, 0, 1, 0);
	drawArmChair(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	gl.uniform1i(u_UseTextures, 0);
	let n_piano = initVertexBuffers(gl, 96/255, 75/255, 0/255);
	if (n_piano < 0) {
		console.log('Failed to set the vertex information');
		return;
	}
	pushMatrix(modelMatrix);
	modelMatrix.translate(-11, 0.5, -9);
	modelMatrix.rotate(90, 0, 1, 0);
	drawPiano(gl, u_ModelMatrix, u_NormalMatrix, n_piano, textures);
	pushMatrix(modelMatrix);
	modelMatrix.translate(0,0.5,0 + stool_distance);
	drawStool(gl, u_ModelMatrix, u_NormalMatrix, n_piano);
	modelMatrix = popMatrix();
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	let n_table = initVertexBuffers(gl, 222/255, 184/255, 135/255);
	if (n_table < 0) {
	  console.log('Failed to set the vertex information');
	  return;
	}
	modelMatrix.translate(9, 1, -9);
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE1);
	gl.uniform1i(u_Sampler, 1);
	modelMatrix.translate(0, 0, table_displacent);
	drawTable(gl, u_ModelMatrix, u_NormalMatrix, n_table);
	gl.uniform1i(u_UseTextures, 0);
	pushMatrix(modelMatrix);
	modelMatrix.translate(-2,1.25,0);
	n = initVertexBuffers(gl, 20/255, 32/255, 19/255);
	if (n < 0) {
	  console.log('Failed to set the vertex information');
	  return;
	}
	drawLamp(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix.translate(4,0,0);
	n = initVertexBuffers(gl, 20/255, 32/255, 19/255);
	if (n < 0) {
	  console.log('Failed to set the vertex information');
	  return;
	}
	drawLamp(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	
	modelMatrix.translate(-2, 0, -2);
	drawChair(gl, u_ModelMatrix, u_NormalMatrix, textures);
	modelMatrix.translate(4,0,0);
	drawChair(gl, u_ModelMatrix, u_NormalMatrix, textures);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(-2,0,2);
	modelMatrix.rotate(180, 0, 1, 0);
	modelMatrix.rotate(chair_angle, 1,0,0);
  	drawChair(gl, u_ModelMatrix, u_NormalMatrix, textures);
	modelMatrix = popMatrix();
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(11, 1, -7);
	modelMatrix.rotate(180, 0, 1, 0);
	drawChair(gl, u_ModelMatrix, u_NormalMatrix, textures);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(11, -0.75, 5);
	modelMatrix.rotate(270, 0, 1, 0);
	n = initVertexBuffers(gl, 51/255, 26/255, 0/255);
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE9);
	gl.uniform1i(u_Sampler, 9);
	drawBookcase(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	gl.uniform1i(u_UseTextures, 0);


  

}

// Function from Practical 3
function drawbox(gl, u_ModelMatrix, u_NormalMatrix, n) {
	pushMatrix(modelMatrix);

		// Pass the model matrix to the uniform variable
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

		// Calculate the normal transformation matrix and pass it to u_NormalMatrix
		g_normalMatrix.setInverseOf(modelMatrix);
		g_normalMatrix.transpose();
		gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);

		// Draw the cube
		gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

	modelMatrix = popMatrix();
}

function drawPiano(gl, u_ModelMatrix, u_NormalMatrix, n, textures){

	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE4);
	gl.uniform1i(u_Sampler, 4);

	// Model the piano front
	pushMatrix(modelMatrix);
	modelMatrix.scale(5.0, 0.5, 2.1); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 0, -1.4);
	modelMatrix.scale(5.0, 0.5, 0.9); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	pushMatrix(modelMatrix);
	modelMatrix.translate(0, -1.0, -1.4);
	modelMatrix.scale(5.0, 2.0, 0.9); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model piano slope
	pushMatrix(modelMatrix);
	modelMatrix.rotate(-20, 1, 0, 0);
	modelMatrix.translate(0, 1.25, -0.75);  // Translation
	modelMatrix.scale(5.0, 2.0, 0.25); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model the piano back
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 0.9, -1.75);  // Translation
	modelMatrix.scale(5.0, 2.0, 0.25); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, -1.0, -1.75);  // Translation
	modelMatrix.scale(5.0, 2.0, 0.25); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 0.8, -1.4);  // Translation
	modelMatrix.scale(5.0, 0.6, 0.6); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 1.3, -1.5);  // Translation
	modelMatrix.scale(5.0, 0.4, 0.35); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model the piano top
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 1.7, -1.625);  // Translation
	modelMatrix.scale(5.0, 0.5, 0.5); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	gl.uniform1i(u_UseTextures, 0);

	// set colour to white
	let n_keys1 = initVertexBuffers(gl, 255/255, 255/255, 255/255);
	if (n_keys1 < 0) {
	console.log('Failed to set the vertex information');
	return;
	}

	// Model the white piano keys
	pushMatrix(modelMatrix);
	modelMatrix.translate(-2.2, 0.25, 0);
	modelMatrix.scale(0.3, 0.25, 2.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, 0, 0);
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, keys[0], 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix = popMatrix();
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, 0, 0);
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, keys[3], 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix = popMatrix();
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, keys[4], 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys1);
	modelMatrix = popMatrix();

	// set colour to black
	let n_keys2 = initVertexBuffers(gl, 0/255, 0/255, 0/255);
	if (n_keys2 < 0) {
	console.log('Failed to set the vertex information');
	return;
	}

	// Model the black piano keys 8ve 1
	pushMatrix(modelMatrix);
	modelMatrix.translate(-2.2, 0.25, 0);
	modelMatrix.scale(0.15, 0.5, 1.0); // Scale
	modelMatrix.translate(1.125, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys2);
	modelMatrix.translate(2.3, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys2);
	modelMatrix.translate(4.6, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys2);
	modelMatrix.translate(2.3, 0, 0);
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, keys[1], 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys2);
	modelMatrix = popMatrix();
	modelMatrix.translate(2.3, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys2);
	modelMatrix = popMatrix();

	// Model black piano keys 8ve 2
	pushMatrix(modelMatrix);
	modelMatrix.translate(0.35, 0.25, 0);
	modelMatrix.scale(0.15, 0.5, 1.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys2);
	modelMatrix.translate(2.25, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys2);
	modelMatrix.translate(4.5, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys2);
	modelMatrix.translate(2.25, 0, 0);
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, keys[2], 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys2);
	modelMatrix = popMatrix();
	modelMatrix.translate(2.25, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n_keys2);
	modelMatrix = popMatrix();

	n = initVertexBuffers(gl, 96/255, 75/255, 0/255);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE4);
	gl.uniform1i(u_Sampler, 4);

	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 0.25, -1.1);
	modelMatrix.scale(5.0, 0.6, 1.2);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();



	// Model piano legs
	pushMatrix(modelMatrix);
	modelMatrix.translate(-2.375, -1.0, 0.75);
	modelMatrix.scale(0.25, 2.0, 0.25);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(2.375, -1.0, 0.75);
	modelMatrix.scale(0.25, 2.0, 0.25);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model piano pedals
	pushMatrix(modelMatrix);
		modelMatrix.translate(0, -1.75, -1.0);
		modelMatrix.scale(0.125, 0.125, 1.0);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
		modelMatrix.translate(2.0, 0, 0);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
		pushMatrix(modelMatrix)
		modelMatrix.translate(-4.0, 0, 0);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
		modelMatrix = popMatrix();
	modelMatrix = popMatrix();
	gl.uniform1i(u_UseTextures, 0);


}

function drawStool(gl, u_ModelMatrix, u_NormalMatrix, n){

	// Model piano stool board
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, -1.0, 1.0);
	modelMatrix.scale(2.0, 0.125, 2.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	var n = initVertexBuffers(gl, 0/255, 153/255, 51/255);
	if (n < 0) {
	console.log('Failed to set the vertex information');
	return;
	}
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE8);
	gl.uniform1i(u_Sampler, 8);
	//Model stool cushion
	modelMatrix.translate(0, 0.5, 0);
	modelMatrix.scale(0.95, 2.5, 0.95);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	gl.uniform1i(u_UseTextures, 0);

	n = initVertexBuffers(gl, 102/255, 85/255, 0/255);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}
	// Model stool legs
	pushMatrix(modelMatrix);
	modelMatrix.translate(0.875, -1.5, 1.875);
	modelMatrix.scale(0.25, 1.0, 0.25); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(-0.875, -1.5, 1.875);
	modelMatrix.scale(0.25, 1.0, 0.25); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(0.875, -1.5, 0.125);
	modelMatrix.scale(0.25, 1.0, 0.25); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(-0.875, -1.5, 0.125);
	modelMatrix.scale(0.25, 1.0, 0.25); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
}

function drawSofa(gl, u_ModelMatrix, u_NormalMatrix, n){
	// Model sofa
	pushMatrix(modelMatrix);
	modelMatrix.scale(5.0, 0.5, 2.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.rotate(-20, 1, 0, 0);
	modelMatrix.translate(0, 1.25, -0.75);  // Translation
	modelMatrix.scale(5.0, 2.0, 0.25); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// Model arms
	pushMatrix(modelMatrix);
	modelMatrix.rotate(-10, 0, 0, 1);
	modelMatrix.translate(2.4, 0.7, 0.0);  // Translation
	modelMatrix.scale(0.25, 1.0, 2.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.rotate(10, 0, 0, 1);
	modelMatrix.translate(-2.4, 0.7, 0.0);  // Translation
	modelMatrix.scale(0.25, 1.0, 2.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// Model cushions
	pushMatrix(modelMatrix);
	modelMatrix.translate(1.2, 0.5, 0);
	modelMatrix.scale(2.2, 0.5, 1.8);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(-1.2, 0.5, 0);
	modelMatrix.scale(2.2, 0.5, 1.8);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// Model base
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, -0.5, 0);
	modelMatrix.scale(5.0, 0.5, 2.0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
}

function drawArmChair(gl, u_ModelMatrix, u_NormalMatrix, n){
	// Model sofa
	pushMatrix(modelMatrix);
	modelMatrix.scale(2.0, 0.5, 2.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.rotate(-20, 1, 0, 0);
	modelMatrix.translate(0, 1.25, -0.75);  // Translation
	modelMatrix.scale(2.0, 2.0, 0.25); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model arms
	pushMatrix(modelMatrix);
	modelMatrix.rotate(-10, 0, 0, 1);
	modelMatrix.translate(0.9, 0.7, 0.0);  // Translation
	modelMatrix.scale(0.25, 1.0, 2.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.rotate(10, 0, 0, 1);
	modelMatrix.translate(-0.9, 0.7, 0.0);  // Translation
	modelMatrix.scale(0.25, 1.0, 2.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// Model cushions
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 0.5, 0);
	modelMatrix.scale(1.6, 0.5, 1.8);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// Model base
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, -0.5, 0);
	modelMatrix.scale(2.0, 0.5, 2.0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
}

function drawRoom(gl, u_ModelMatrix, u_NormalMatrix, n, textures){
	// draw floor
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE3);
	gl.uniform1i(u_Sampler, 3);
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, -1, 0);
	modelMatrix.scale(30, 0.125, 30);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	gl.uniform1i(u_UseTextures, 0);
	// draw wall 1
	pushMatrix(modelMatrix);
	modelMatrix.translate(0,4,-15);
	modelMatrix.scale(30, 10, 0.125);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// draw wall 2
	pushMatrix(modelMatrix);
	modelMatrix.translate(0,4,15);
	modelMatrix.scale(30, 10, 0.125);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// draw wall 3
	pushMatrix(modelMatrix);
	modelMatrix.translate(15,4,0);
	modelMatrix.scale(0.125, 10, 30);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// draw wall 4
	pushMatrix(modelMatrix);
	modelMatrix.translate(-15,4,-8.5);
	modelMatrix.scale(0.125, 10, 13);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(-15,4, 8.5);
	modelMatrix.scale(0.125, 10, 13);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(-15,7, 0);
	modelMatrix.scale(0.125, 4, 4);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// draw door
	let n1 = initVertexBuffers(gl, 20/255, 20/255, 30/255);
	if (n1 < 0) {
	console.log('Failed to set the vertex information');
	return;
	}
	pushMatrix(modelMatrix);
	modelMatrix.translate(-15,2, 0);
	modelMatrix.scale(0.125, 6, 4);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n1);
	modelMatrix = popMatrix();
	// draw ceiling
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 8, 0);
	modelMatrix.scale(40, 0.25, 40);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
}

function drawTV(gl, u_ModelMatrix, u_NormalMatrix, n){
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE7);
	gl.uniform1i(u_Sampler, 7);
	// Model TV screen
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 1.5, -0.5);  // Translation
	modelMatrix.scale(5.3, 3.0, 0.125); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	gl.uniform1i(u_UseTextures, 0);

	// Model TV back
	pushMatrix(modelMatrix);
		modelMatrix.translate(0, 1.5, -0.5625);  // Translation
		modelMatrix.scale(3.5, 2.0, 0.25); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	var n = initVertexBuffers(gl, 182/255, 172/255, 202/255);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}

	// Model TV Frame Topbar
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 2.875, -0.4375);  // Translation
	modelMatrix.scale(5.3, 0.25, 0.125); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model TV Frame Bottom bar
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 0.125, -0.4375);  // Translation
	modelMatrix.scale(5.3, 0.25, 0.125); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model TV Frame Right bar
	pushMatrix(modelMatrix);
	modelMatrix.translate(2.525, 1.5, -0.4375);  // Translation
	modelMatrix.scale(0.25, 3.0, 0.125); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model TV Frame Left bar
	pushMatrix(modelMatrix);
	modelMatrix.translate(-2.525, 1.5, -0.4375);  // Translation
	modelMatrix.scale(0.25, 3.0, 0.125); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	var n = initVertexBuffers(gl, 0/255, 0/255, 0/255);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}

	// Model TV stand
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 0, -0.5625);  // Translation
	modelMatrix.scale(1.0, 3.0, 0.25); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// Model Base
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, -1.375, -0.5625);  // Translation
	modelMatrix.scale(1.5, 0.25, 1.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
  
  }

function drawTable(gl, u_ModelMatrix, u_NormalMatrix, n){

	// Model the table top
	pushMatrix(modelMatrix);
		modelMatrix.translate(0, 1.0, 0);
		modelMatrix.scale(10.0, 0.4, 4.0); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model the table leg
	pushMatrix(modelMatrix);
		modelMatrix.translate(4.75, -0.5, 1.75);  // Translation
		modelMatrix.scale(0.5, 3.0, 0.5); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	//Model table leg
	pushMatrix(modelMatrix);
		modelMatrix.translate(-4.75, -0.5, 1.75);  // Translation
		modelMatrix.scale(0.5, 3.0, 0.5); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	//Model table leg
	pushMatrix(modelMatrix);
		modelMatrix.translate(-4.75, -0.5, -1.75);  // Translation
		modelMatrix.scale(0.5, 3.0, 0.5); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	//Model table leg
	pushMatrix(modelMatrix);
		modelMatrix.translate(4.75, -0.5, -1.75);  // Translation
		modelMatrix.scale(0.5, 3.0, 0.5); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
  
  }

function drawChair(gl, u_ModelMatrix, u_NormalMatrix, n, textures){
	var n = initVertexBuffers(gl, 20/255, 32/255, 19/255);
	if (n < 0) {
	  console.log('Failed to set the vertex information');
	  return;
	}
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE2);
	gl.uniform1i(u_Sampler, 2);
	// Model the chair seat
	pushMatrix(modelMatrix);
		modelMatrix.scale(2.0, 0.5, 2.0); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model the chair back
	pushMatrix(modelMatrix);
		modelMatrix.translate(0, 1.25, -0.75);  // Translation
		modelMatrix.scale(2.0, 2.0, 0.5); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	n = initVertexBuffers(gl, 153/255, 77/255, 0/255);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}
	gl.activeTexture(gl.TEXTURE1);
	gl.uniform1i(u_Sampler, 1);
	// Model chair leg
	pushMatrix(modelMatrix);
	modelMatrix.translate(-0.75, -1.0, 0.75);
	modelMatrix.scale(0.5, 2.0, 0.5);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model chair leg
	pushMatrix(modelMatrix);
	modelMatrix.translate(0.75, -1.0, 0.75);
	modelMatrix.scale(0.5, 2.0, 0.5);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model chair leg
	pushMatrix(modelMatrix);
	modelMatrix.translate(-0.75, -1.0, -0.75);
	modelMatrix.scale(0.5, 2.0, 0.5);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model chair leg
	pushMatrix(modelMatrix);
	modelMatrix.translate(0.75, -1.0, -0.75);
	modelMatrix.scale(0.5, 2.0, 0.5);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	gl.uniform1i(u_UseTextures, 0);
}

function drawTable(gl, u_ModelMatrix, u_NormalMatrix, n){

	// Model the table top
	pushMatrix(modelMatrix);
		modelMatrix.translate(0, 1.0, 0);
		modelMatrix.scale(10.0, 0.4, 4.0); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model the table leg
	pushMatrix(modelMatrix);
		modelMatrix.translate(4.75, -0.5, 1.75);  // Translation
		modelMatrix.scale(0.5, 3.0, 0.5); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	//Model table leg
	pushMatrix(modelMatrix);
		modelMatrix.translate(-4.75, -0.5, 1.75);  // Translation
		modelMatrix.scale(0.5, 3.0, 0.5); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	//Model table leg
	pushMatrix(modelMatrix);
		modelMatrix.translate(-4.75, -0.5, -1.75);  // Translation
		modelMatrix.scale(0.5, 3.0, 0.5); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	//Model table leg
	pushMatrix(modelMatrix);
		modelMatrix.translate(4.75, -0.5, -1.75);  // Translation
		modelMatrix.scale(0.5, 3.0, 0.5); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

}

function drawBookcase(gl, u_ModelMatrix, u_NormalMatrix, n){

    // Model the bookcase base and shelves
	pushMatrix(modelMatrix);
    	modelMatrix.scale(6.0, 0.25, 2.0); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
		modelMatrix.translate(0, 6, 0);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
		modelMatrix.translate(0, 6, 0);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
		modelMatrix.translate(0, 6, 0);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  	modelMatrix = popMatrix();

	// Model the bookcase back
  	pushMatrix(modelMatrix);
    	modelMatrix.translate(0, 0.75, -0.875);  // Translation
    	modelMatrix.scale(6.0, 1.5, 0.25); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
		modelMatrix.translate(0, 1, 0);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
		modelMatrix.translate(0, 1, 0);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  	modelMatrix = popMatrix();

  	// Model bookcase side
 	 pushMatrix(modelMatrix);
		modelMatrix.translate(-2.875, 0.75, 0.0);  // Translation
		modelMatrix.scale(0.25, 1.5, 2.0); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
		modelMatrix.translate(23, 0, 0);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

  	modelMatrix = popMatrix();

  	// Model bookcase side
  	pushMatrix(modelMatrix);
		modelMatrix.translate(-2.875, 2.25, 0.0);  // Translation
		modelMatrix.scale(0.25, 1.5, 2.0); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
		modelMatrix.translate(23, 0, 0);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  	modelMatrix = popMatrix();


  	// Model bookcase side
  	pushMatrix(modelMatrix);
		modelMatrix.translate(-2.875, 3.75, 0.0);  // Translation
		modelMatrix.scale(0.25, 1.5, 2.0); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
		modelMatrix.translate(23, 0.0, 0.0);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  	modelMatrix = popMatrix();
}

function drawLamp(gl, u_ModelMatrix, u_NormalMatrix, n){
	// Model the Lamp rod
	pushMatrix(modelMatrix);
		modelMatrix.translate(0, 1, 0);  // Translation
		modelMatrix.scale(0.125, 2.0, 0.125); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
  
	// Model the Lamp base
	pushMatrix(modelMatrix);
		modelMatrix.translate(0, 0, 0);  // Translation
		modelMatrix.scale(1.0, 0.125, 1.0); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	var n = initVertexBuffers(gl, 255/255, 255/255, 255/255, 0);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}
	// Model the Lamp bulb
	pushMatrix(modelMatrix);
		modelMatrix.translate(0, 2, 0);  // Translation
		modelMatrix.scale(0.25, 0.25, 0.25); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	var n = initVertexBuffers(gl, 235/255, 253/255, 208/255, 0.7);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE6);
	gl.uniform1i(u_Sampler, 6);
	// Model the Lamp top
	pushMatrix(modelMatrix);
		modelMatrix.translate(0, 2.4, 0);  // Translation
		modelMatrix.scale(0.6, 0.125, 0.6); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  
	// Model the Lampshade top
		modelMatrix.scale(5/6, 1, 1); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
  
	// Model the Lampshade side
	pushMatrix(modelMatrix);
		modelMatrix.translate(0.3, 2.1, 0);  // Translation
		modelMatrix.scale(0.125, 0.71, 0.6625); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
  
	// Model the Lampshade side
	pushMatrix(modelMatrix);
		modelMatrix.translate(0, 2.1, 0.3);  // Translation
		modelMatrix.scale(0.6625, 0.71, 0.125); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
  
	// Model the Lampshade side
	pushMatrix(modelMatrix);
		modelMatrix.translate(-0.3, 2.1, 0);  // Translation
		modelMatrix.scale(0.125, 0.71, 0.6625); // Scale
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
  
	// Model the Lampshade side
	pushMatrix(modelMatrix);
	  	modelMatrix.translate(0, 2.1, -0.3);  // Translation
	 	modelMatrix.scale(0.6625, 0.71, 0.125); // Scale
	  	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	gl.uniform1i(u_UseTextures, 0);

}

function loadTexture(gl, texture, textureIndex) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(textureIndex);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture.image);
}

function drawCeilingLamp(gl, u_ModelMatrix, u_NormalMatrix, n, textures){
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE6);
	gl.uniform1i(u_Sampler, 6);
	pushMatrix(modelMatrix);
	modelMatrix.rotate(light_angle, 0, 0, 1);
	modelMatrix.translate(0, -1.2, 0);

	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 0.0625, 0);
	modelMatrix.scale(0.25, 0.0625, 0.25);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	n = initVertexBuffers(gl, 225/255, 228/255, 196/255, 0.7);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}
	// Model lightshade
	pushMatrix(modelMatrix);
	modelMatrix.scale(0.0625, 0.0625, 0.25);
	modelMatrix.translate(2, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	for (let i=0; i<20; i++){
		modelMatrix.translate(0.5, -1, 0);
		modelMatrix.scale(1, 1, 1.1);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	}
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.scale(0.0625, 0.0625, 0.25);
	modelMatrix.translate(-2, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	for (let i=0; i<20; i++){
		modelMatrix.translate(-0.5, -1, 0);
		modelMatrix.scale(1, 1, 1.1);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	}
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.scale(0.25, 0.0625, 0.0625);
	modelMatrix.translate(0, 0, -2);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	for (let i=0; i<20; i++){
		modelMatrix.translate(0, -1, -0.5);
		modelMatrix.scale(1.1, 1, 1);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	}
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.scale(0.25, 0.0625, 0.0625);
	modelMatrix.translate(0, 0, 2);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	for (let i=0; i<20; i++){
		modelMatrix.translate(0, -1, 0.5);
		modelMatrix.scale(1.1, 1, 1);
		drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	}
	modelMatrix = popMatrix();
	gl.uniform1i(u_UseTextures, 0);
	// Model rod
	n = initVertexBuffers(gl, 96/255, 75/255, 0/255);
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 1.0625, 0);
	modelMatrix.scale(0.125, 2.0, 0.125);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	modelMatrix = popMatrix();


}

function drawCabinet(gl, u_ModelMatrix, u_NormalMatrix, n, textures){
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE4);
	gl.uniform1i(u_Sampler, 4);

	n = initVertexBuffers(gl, 96/255, 75/255, 0/255);
	pushMatrix(modelMatrix);
	// Model base
	pushMatrix(modelMatrix);
	modelMatrix.scale(3.0, 0.125, 1.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	// Model top
	modelMatrix.translate(0, 8, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model back
	pushMatrix(modelMatrix);
	modelMatrix.scale(3.0, 1.0, 0.125); // Scale
	modelMatrix.translate(0, 0.5, -3.5);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	//Model side 1
	pushMatrix(modelMatrix);
	modelMatrix.translate(-1.4375, 0.5, 0);
	modelMatrix.scale(0.125, 1.0, 1.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model side 2
	pushMatrix(modelMatrix);
	modelMatrix.translate(1.4375, 0.5, 0);
	modelMatrix.scale(0.125, 1.0, 1.0); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Model drawers
	// Model drawer 1
	pushMatrix(modelMatrix);
	//modelMatrix.translate(0,0,Math.cos(draw_angle));
	modelMatrix.rotate(draw1_angle, 0, 1, 0);
	pushMatrix(modelMatrix);
	modelMatrix.translate(-0.7, 0.375 + 0.125/2, 0.5-0.125/2);
	modelMatrix.scale(1.4, 1.0, 0.125);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	n = initVertexBuffers(gl, 77/255, 51/255, 0/255);
	gl.uniform1i(u_UseTextures, 0);
	modelMatrix.translate(-1.2,0.5,0.625);
	modelMatrix.scale(0.125, 0.25, 0.125);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(-1.2,0.5625, 0.5625);
	modelMatrix.scale(0.0625, 0.0625, 0.125);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(-1.2,0.4375, 0.5625);
	modelMatrix.scale(0.0625, 0.0625, 0.125);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	modelMatrix = popMatrix();
	n = initVertexBuffers(gl, 96/255, 75/255, 0/255);
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE4);
	gl.uniform1i(u_Sampler, 4);
	// Model drawer 2
	pushMatrix(modelMatrix);
	modelMatrix.rotate(-1 * draw2_angle, 0, 1, 0);
	pushMatrix(modelMatrix);
	modelMatrix.translate(0.7, 0.375 + 0.125/2, 0.5-0.125/2);
	modelMatrix.scale(1.4, 1.0, 0.125);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	n = initVertexBuffers(gl, 77/255, 51/255, 0/255);
	gl.uniform1i(u_UseTextures, 0);
	modelMatrix.translate(1.2,0.5,0.625);
	modelMatrix.scale(0.125, 0.25, 0.125);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(1.2,0.5625, 0.5625);
	modelMatrix.scale(0.0625, 0.0625, 0.125);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(1.2, 0.4375, 0.5625);
	modelMatrix.scale(0.0625, 0.0625, 0.125);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	modelMatrix = popMatrix();
	n = initVertexBuffers(gl, 96/255, 75/255, 0/255);
	if (textures){
		gl.uniform1i(u_UseTextures, 1);
	}
	gl.activeTexture(gl.TEXTURE4);
	gl.uniform1i(u_Sampler, 4);
	// Model legs
	pushMatrix(modelMatrix);
	modelMatrix.scale(0.125, 0.3, 0.125);
	modelMatrix.translate(11, -0.5 - 0.0625, 3);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix.translate(-22, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix.translate(0, 0, -6);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix.translate(22, 0, 0);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	modelMatrix = popMatrix();
	gl.uniform1i(u_UseTextures, 0);
}
