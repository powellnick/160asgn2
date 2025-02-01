// Nicholas Powell
// nipowell@ucsc.edu

// Notes to grader:
// Poke animation with shift click shows animal sticking out tongue

// Nicholas Powell
// nipowell@ucsc.edu

// WebGL 3D Animated Animal Project

// Vertex Shader
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_GlobalRotation;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotation * u_ModelMatrix * a_Position;
  }`;

// Fragment Shader
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;

// Global Variables
let canvas, gl;
let a_Position, u_FragColor;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let g_MouseLastX = 0; // Last X position of the mouse
let g_MouseLastY = 0; // Last Y position of the mouse
let g_MouseDragging = false; // Whether the mouse is dragging
let g_XRotation = 0; // Rotation around X-axis
let g_YRotation = 0; // Rotation around Y-axis
let g_lastFrameTime = performance.now(); // Time of the last frame
let g_fps = 0; // Frames per second


// Transformation Matrices
let projectionMatrix = mat4.create();
let viewMatrix = mat4.create();
let modelMatrix = mat4.create();

// Scene Variables
let gAnimalGlobalRotation = 0;
let u_GlobalRotation;
let gThighAngle = 0; // Controls the thigh rotation
let gCalfAngle = 0;  // Controls the calf rotation
let g_time = 0;
let g_animationEnabled = false;
let gTailAngle = 0; // Angle for tail animation
let gBodyVerticalOffset = 0; // Offset for body bobbing
let g_pokeAnimationEnabled = false; // Whether the poke animation is active
let g_pokeAnimationStartTime = 0;   // Start time of the poke animation
let g_pokeDuration = 2000; 
let g_mouthOpenAngle = 0; // Controls how wide the mouth opens
let g_tongueLength = 0;   // Controls how far the tongue sticks out
let g_tongueCurveAngle = 0; // Controls the curve of the tongue
let gTailRotation = 0; // Controls the tail rotation



// Initialize WebGL
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.error('WebGL not supported');
    return;
  }
  console.log('WebGL initialized successfully.');

  // Enable depth testing for 3D rendering
  gl.enable(gl.DEPTH_TEST);

  // Clear WebGL state
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

// Link Variables to GLSL 
function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error('Failed to initialize shaders.');
    return;
  }
  console.log('Shaders initialized successfully.');

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');

  if (a_Position < 0) console.error('Failed to get storage location of a_Position');
  if (!u_FragColor) console.error('Failed to get storage location of u_FragColor');
  if (!u_ModelMatrix) console.error('Failed to get storage location of u_ModelMatrix');
  if (!u_ViewMatrix) console.error('Failed to get storage location of u_ViewMatrix');
  if (!u_ProjectionMatrix) console.error('Failed to get storage location of u_ProjectionMatrix');
  if (!u_GlobalRotation) console.error('Failed to get storage location of u_GlobalRotation');
}

function updatePokeAnimationAngles() {
  const currentTime = performance.now();
  const elapsedTime = currentTime - g_pokeAnimationStartTime;

  if (elapsedTime > g_pokeDuration) {
    g_pokeAnimationEnabled = false; // Stop the poke animation
    g_mouthOpenAngle = 0; // Close the mouth
    g_tongueLength = 0; // Reset tongue length
    g_tongueCurveAngle = 0; // Reset curve
    return;
  }

  // Increase tongue length significantly
  g_tongueLength = Math.min(5.0, elapsedTime / 500); // Extends up to 5 units
  g_tongueCurveAngle = Math.min(120, elapsedTime / 10); // Curves more downward

  renderScene(); // Update the scene
}

function startPokeAnimation() {
  g_pokeAnimationEnabled = true; // Enable the poke animation
  g_pokeAnimationStartTime = performance.now(); // Record the start time

  // Temporarily disable normal animation
  g_animationEnabled = false;

  // Start the poke animation loop
  const pokeAnimationLoop = () => {
    if (g_pokeAnimationEnabled) {
      updatePokeAnimationAngles();
      requestAnimationFrame(pokeAnimationLoop); // Continue the animation
    } else {
      g_animationEnabled = true; // Restore normal animation when the poke animation ends
    }
  };
  pokeAnimationLoop();
}

function updateRotation() {
  gAnimalGlobalRotation = parseFloat(document.getElementById("jointRotation").value);
  document.getElementById("jointValue").innerText = gAnimalGlobalRotation;

  // Ensure the scene updates with the new rotation
  renderScene();
}

function updateJointAngles() {
  gThighAngle = parseFloat(document.getElementById("thighRotation").value);
  document.getElementById("thighValue").innerText = gThighAngle;

  gCalfAngle = parseFloat(document.getElementById("calfRotation").value);
  document.getElementById("calfValue").innerText = gCalfAngle;

  renderScene(); // Update scene to reflect changes
}

function updateAnimationAngles() {
  if (!g_animationEnabled) return; // Stop updating if animation is off

  let time = performance.now() / 1000; // Time in seconds

  // Animate Thighs
  gThighAngle = 30 * Math.sin(time); // Oscillate between -30 and 30 degrees

  // Animate Calves
  gCalfAngle = 15 * Math.sin(time + Math.PI / 4); // Slightly offset calf motion for realism

  // Global Rotation (for 360° rotation during animation)
  gAnimalGlobalRotation += 30 * (1 / 60); // Increment rotation by 30° per second
  gAnimalGlobalRotation %= 360; // Ensure rotation wraps around at 360°

  // Tail Wiggle
  gTailAngle = 20 * Math.sin(time * 2); // Wiggles side to side

  // Body Bobbing
  gBodyVerticalOffset = 0.1 * Math.sin(time); // Body moves up and down slightly

  renderScene(); // Update the scene to reflect changes
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set up projection and view matrices
  mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);
  mat4.lookAt(viewMatrix, [0, 0, 5], [0, 0, 0], [0, 1, 0]);

  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix);

  // Apply global rotation (mouse + animation rotation)
  let globalRotationMatrix = mat4.create();
  mat4.rotateX(globalRotationMatrix, globalRotationMatrix, glMatrix.toRadian(g_XRotation)); // Apply X-axis rotation
  mat4.rotateY(globalRotationMatrix, globalRotationMatrix, glMatrix.toRadian(g_YRotation + gAnimalGlobalRotation)); // Apply Y-axis rotation
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotationMatrix);

  // Create identity matrix for object transformations
  let baseMatrix = mat4.create();

  // Draw the animated animal
  drawAnimal(baseMatrix);
}

function onMouseDown(event) {
  g_MouseLastX = event.clientX;
  g_MouseLastY = event.clientY;

  if (event.shiftKey) {
    startPokeAnimation(); // Trigger the poke animation
  } else {
    g_MouseDragging = true; // Start dragging for rotation
  }
}

function updateTailAngle() {
  gTailRotation = parseFloat(document.getElementById("tailRotation").value);
  document.getElementById("tailValue").innerText = gTailRotation;

  renderScene(); // Update the scene with new tail rotation
}

function onMouseMove(event) {
  if (!g_MouseDragging) return; // Only process when dragging

  // Calculate the difference in mouse movement
  let deltaX = event.clientX - g_MouseLastX;
  let deltaY = event.clientY - g_MouseLastY;

  // Update the rotation angles (scale by a small factor for smooth control)
  g_XRotation += deltaY * 0.5; // Vertical movement controls X rotation
  g_YRotation += deltaX * 0.5; // Horizontal movement controls Y rotation

  // Save the current mouse position
  g_MouseLastX = event.clientX;
  g_MouseLastY = event.clientY;

  renderScene(); // Update the scene
}

function onMouseUp(event) {
  g_MouseDragging = false; // Stop dragging
}

function drawAnimal(baseMatrix) {
  if (!baseMatrix) {
    console.error("Error: baseMatrix is undefined. Initializing as identity matrix.");
    baseMatrix = mat4.create();
  }

  let M = mat4.create();

  // Body (with bobbing)
  mat4.copy(M, baseMatrix);
  mat4.translate(M, M, [0, gBodyVerticalOffset, 0]); // Apply vertical bobbing
  mat4.scale(M, M, [2, 1, 1]);
  drawCube(M, [1.0, 0.5, 0.0, 1.0]); // Orange body

  // Head
  mat4.copy(M, baseMatrix);
  mat4.translate(M, M, [1.2, 0.5 + gBodyVerticalOffset, 0]); // Apply bobbing

  // Limit the head rotation to -45° to 45° only when animation is enabled
  let headAngle = 0; // Default to no rotation
  if (g_animationEnabled) {
    headAngle = 62.5 * Math.sin(performance.now() / 1000); // Oscillate between -45° and 45° during animation
  }
  
  mat4.rotateY(M, M, glMatrix.toRadian(headAngle)); // Apply rotation only if animation is enabled


  mat4.scale(M, M, [0.6, 0.6, 0.6]); // Scale the head
  drawCube(M, [1.0, 0.8, 0.6, 1.0]); // Light orange head

  // Mouth
  let mouthMatrix = mat4.create();
  mat4.copy(mouthMatrix, M); // Attach to head
  mat4.translate(mouthMatrix, mouthMatrix, [0.0, -0.2, 0.6]); // Position at the bottom of the head (front face)
  mat4.rotateX(mouthMatrix, mouthMatrix, glMatrix.toRadian(-g_mouthOpenAngle)); // Rotate the mouth down when opening
  mat4.scale(mouthMatrix, mouthMatrix, [0.6, 0.1, 0.1]); // Scale to a thin rectangle
  drawCube(mouthMatrix, [0.8, 0.0, 0.0, 1.0]); // Red mouth

 // Tongue
let tongueBase = mat4.create();
mat4.copy(tongueBase, M); // Attach to head
mat4.translate(tongueBase, tongueBase, [0.0, -0.3, 0.65]); // Position below the mouth
mat4.rotateX(tongueBase, tongueBase, glMatrix.toRadian(-g_mouthOpenAngle)); // Move with the mouth
mat4.scale(tongueBase, tongueBase, [0.2, 0.1, 0.2]); // Adjust base size
drawCube(tongueBase, [1.0, 0.2, 0.2, 1.0]); // Pink tongue base

//
let tongueSegment = mat4.create();
mat4.copy(tongueSegment, tongueBase);

for (let i = 0; i < Math.ceil(g_tongueLength * 4); i++) { // More segments as tongue grows
    mat4.translate(tongueSegment, tongueSegment, [0.0, -0.1, g_tongueLength / 4]); // Extend outward more
    mat4.rotateX(tongueSegment, tongueSegment, glMatrix.toRadian(-g_tongueCurveAngle / (i + 1))); // Apply downward curve
    mat4.scale(tongueSegment, tongueSegment, [0.8, 0.8, 0.8]); // Ensure consistent scaling
    drawCube(tongueSegment, [1.0, 0.2, 0.2, 1.0]); // Pink tongue
}

  // Eyes
  let leftEye = mat4.create();
  mat4.copy(leftEye, M); // Attach to head
  mat4.translate(leftEye, leftEye, [-0.2, 0.2, 0.35]); // Position on the left side of the face
  mat4.scale(leftEye, leftEye, [1.2, 1.2, 1.2]); // Scale to eye size
  drawSphere(leftEye, [1.0, 1.0, 1.0, 1.0]); // White eye

  let leftPupil = mat4.create();
  mat4.copy(leftPupil, leftEye); // Attach to the left eye
  mat4.translate(leftPupil, leftPupil, [0.0, 0.0, 0.1]); // Move forward for the pupil
  mat4.scale(leftPupil, leftPupil, [0.72, 0.72, 0.5]); // Scale down for the pupil
  drawSphere(leftPupil, [0.0, 0.0, 0.0, 1.0]); // Black pupil

  let rightEye = mat4.create();
  mat4.copy(rightEye, M); // Attach to head
  mat4.translate(rightEye, rightEye, [0.2, 0.2, 0.35]); // Position on the right side of the face
  mat4.scale(rightEye, rightEye, [1.2, 1.2, 1.2]); // Scale to eye size
  drawSphere(rightEye, [1.0, 1.0, 1.0, 1.0]); // White eye

  let rightPupil = mat4.create();
  mat4.copy(rightPupil, rightEye); // Attach to the right eye
  mat4.translate(rightPupil, rightPupil, [0.0, 0.0, 0.1]); // Move forward for the pupil
  mat4.scale(rightPupil, rightPupil, [0.72, 0.72, 0.5]); // Scale down for the pupil
  drawSphere(rightPupil, [0.0, 0.0, 0.0, 1.0]); // Black pupil

  // Ears
  let leftEar = mat4.create();
  mat4.copy(leftEar, M); // Attach to head
  mat4.translate(leftEar, leftEar, [-0.3, 0.5, 0.2]); // Position on top-left of head
  mat4.scale(leftEar, leftEar, [1.2,1.5, 1.2]); // Scale to ear size
  drawCone(leftEar, [1.0, 0.6, 0.4, 1.0]); // Cone-shaped ear
  
  let rightEar = mat4.create();
  mat4.copy(rightEar, M); // Attach to head
  mat4.translate(rightEar, rightEar, [0.3, 0.5, 0.2]); // Position on top-right of head
  mat4.scale(rightEar, rightEar, [1.2, 1.5, 1.2]); // Scale to ear size
  drawCone(rightEar, [1.0, 0.6, 0.4, 1.0]); // Cone-shaped ear

  // Tail (with wiggling and manual rotation)
  let tailMatrix = mat4.create();
  mat4.copy(tailMatrix, baseMatrix);
  mat4.translate(tailMatrix, tailMatrix, [-1.3, 0.2 + gBodyVerticalOffset, 0]);
  mat4.rotateZ(tailMatrix, tailMatrix, glMatrix.toRadian(gTailRotation));
  mat4.scale(tailMatrix, tailMatrix, [0.7, 0.3, 0.3]);
  drawCube(tailMatrix, [0.6, 0.3, 0.0, 1.0]); // Draw the main tail

  // Tail Segments
  mat4.translate(tailMatrix, tailMatrix, [-0.4, 0.0, 0.0]);
  mat4.scale(tailMatrix, tailMatrix, [0.7, 0.7, 0.7]);
  drawCube(tailMatrix, [0.6, 0.2, 0.0, 1.0]);

  mat4.translate(tailMatrix, tailMatrix, [-0.3, 0.0, 0.0]);
  mat4.scale(tailMatrix, tailMatrix, [0.5, 0.5, 0.5]);
  drawCube(tailMatrix, [0.7, 0.2, 0.0, 1.0]);

  // Legs with Third Joint (Foot)
  const legColorThigh = [0.5, 0.3, 0.0, 1.0];
  const legColorCalf = [0.4, 0.2, 0.0, 1.0];
  const footColor = [1.0, 0.0, 1.0, 1.0]; // Pink for feet

  function drawLeg(baseMatrix, xOffset, zOffset, thighAngle, calfAngle) {
    // Thigh
    let thigh = mat4.create();
    mat4.copy(thigh, baseMatrix);
    mat4.translate(thigh, thigh, [xOffset, -0.5 + gBodyVerticalOffset, zOffset]); // Position thigh
    mat4.rotateZ(thigh, thigh, glMatrix.toRadian(thighAngle)); // Rotate thigh
    mat4.scale(thigh, thigh, [0.3, 0.6, 0.3]); // Scale thigh
    drawCube(thigh, legColorThigh);

    // Calf
    let calf = mat4.create();
    mat4.copy(calf, thigh);
    mat4.translate(calf, calf, [0.0, -0.6, 0.0]); // Attach to thigh
    mat4.rotateZ(calf, calf, glMatrix.toRadian(calfAngle)); // Rotate calf
    mat4.scale(calf, calf, [1.0, 0.7, 1.0]); // Scale calf
    drawCube(calf, legColorCalf);

    // Foot (Cylinder)
    let foot = mat4.create();
    mat4.copy(foot, calf);
    mat4.translate(foot, foot, [0.0, -0.5, 0.0]); // Attach to calf
    mat4.rotateZ(foot, foot, glMatrix.toRadian(calfAngle / 2)); // Slightly dependent on calf angle
    mat4.scale(foot, foot, [1.6, 1.3, 1.6]); // Larger foot size
    drawCylinder(foot, footColor); // Cylinder foot
  }

  // Front Left Leg
  drawLeg(baseMatrix, -0.8, 0.5, gThighAngle, gCalfAngle);
  // Front Right Leg
  drawLeg(baseMatrix, 0.8, 0.5, -gThighAngle, -gCalfAngle);
  // Back Left Leg
  drawLeg(baseMatrix, -0.8, -0.5, -gThighAngle, -gCalfAngle);
  // Back Right Leg
  drawLeg(baseMatrix, 0.8, -0.5, gThighAngle, gCalfAngle);
}

function drawSphere(matrix, color) {
  const vertices = generateSphereVertices(0.2, 32, 32); // Radius: 0.2, 32 slices
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
}

function generateSphereVertices(radius, latBands, longBands) {
  const vertices = [];
  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= longBands; lon++) {
      const phi = (lon * 2 * Math.PI) / longBands;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;

      vertices.push(radius * x, radius * y, radius * z);
    }
  }

  const indices = [];
  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < longBands; lon++) {
      const first = lat * (longBands + 1) + lon;
      const second = first + longBands + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  const result = [];
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    result.push(vertices[idx * 3], vertices[idx * 3 + 1], vertices[idx * 3 + 2]);
  }

  return result;
}

function drawCylinder(matrix, color) {
  const vertices = generateCylinderVertices(0.2, 0.5, 32); // Generate vertices with radius, height, and segments
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
}

function generateCylinderVertices(radius, height, segments) {
  let vertices = [];
  const angleStep = (2 * Math.PI) / segments;

  for (let i = 0; i < segments; i++) {
    const theta = i * angleStep;
    const nextTheta = (i + 1) * angleStep;

    // Top circle
    vertices.push(0, height / 2, 0);
    vertices.push(radius * Math.cos(theta), height / 2, radius * Math.sin(theta));
    vertices.push(radius * Math.cos(nextTheta), height / 2, radius * Math.sin(nextTheta));

    // Bottom circle
    vertices.push(0, -height / 2, 0);
    vertices.push(radius * Math.cos(theta), -height / 2, radius * Math.sin(theta));
    vertices.push(radius * Math.cos(nextTheta), -height / 2, radius * Math.sin(nextTheta));

    // Side rectangles (two triangles)
    vertices.push(radius * Math.cos(theta), height / 2, radius * Math.sin(theta));
    vertices.push(radius * Math.cos(theta), -height / 2, radius * Math.sin(theta));
    vertices.push(radius * Math.cos(nextTheta), -height / 2, radius * Math.sin(nextTheta));

    vertices.push(radius * Math.cos(theta), height / 2, radius * Math.sin(theta));
    vertices.push(radius * Math.cos(nextTheta), -height / 2, radius * Math.sin(nextTheta));
    vertices.push(radius * Math.cos(nextTheta), height / 2, radius * Math.sin(nextTheta));
  }
  return vertices;
}

function drawCone(matrix, color) {
  const vertices = generateConeVertices(0.2, 0.5, 32); // Generate vertices with radius, height, and segments
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
}

function generateConeVertices(radius, height, segments) {
  let vertices = [];
  const angleStep = (2 * Math.PI) / segments;

  for (let i = 0; i < segments; i++) {
    const theta = i * angleStep;
    const nextTheta = (i + 1) * angleStep;

    // Base triangle
    vertices.push(0, 0, 0);
    vertices.push(radius * Math.cos(theta), 0, radius * Math.sin(theta));
    vertices.push(radius * Math.cos(nextTheta), 0, radius * Math.sin(nextTheta));

    // Side triangle
    vertices.push(0, height, 0);
    vertices.push(radius * Math.cos(theta), 0, radius * Math.sin(theta));
    vertices.push(radius * Math.cos(nextTheta), 0, radius * Math.sin(nextTheta));
  }
  return vertices;
}

function drawCube(matrix, color) {
  console.log("Drawing cube...");

  const halfSize = 0.5;
  const vertices = new Float32Array([
    // Front face
    -halfSize, -halfSize,  halfSize,  halfSize, -halfSize,  halfSize,  halfSize,  halfSize,  halfSize,
    -halfSize, -halfSize,  halfSize,  halfSize,  halfSize,  halfSize, -halfSize,  halfSize,  halfSize,

    // Back face
    -halfSize, -halfSize, -halfSize, -halfSize,  halfSize, -halfSize,  halfSize,  halfSize, -halfSize,
    -halfSize, -halfSize, -halfSize,  halfSize,  halfSize, -halfSize,  halfSize, -halfSize, -halfSize,

    // Left face
    -halfSize, -halfSize, -halfSize, -halfSize, -halfSize,  halfSize, -halfSize,  halfSize,  halfSize,
    -halfSize, -halfSize, -halfSize, -halfSize,  halfSize,  halfSize, -halfSize,  halfSize, -halfSize,

    // Right face
    halfSize, -halfSize, -halfSize, halfSize,  halfSize, -halfSize, halfSize,  halfSize,  halfSize,
    halfSize, -halfSize, -halfSize, halfSize,  halfSize,  halfSize, halfSize, -halfSize,  halfSize,

    // Top face
    -halfSize,  halfSize, -halfSize, -halfSize,  halfSize,  halfSize,  halfSize,  halfSize,  halfSize,
    -halfSize,  halfSize, -halfSize,  halfSize,  halfSize,  halfSize,  halfSize,  halfSize, -halfSize,

    // Bottom face
    -halfSize, -halfSize, -halfSize,  halfSize, -halfSize, -halfSize,  halfSize, -halfSize,  halfSize,
    -halfSize, -halfSize, -halfSize,  halfSize, -halfSize,  halfSize, -halfSize, -halfSize,  halfSize
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Ensure buffer is correctly bound
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Pass uniform variables
  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  // Check vertex count
  console.log("Vertex count:", vertices.length / 3);

  // Draw the cube (36 vertices)
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// Animation loop
function tick() {
  const now = performance.now();
  const deltaTime = now - g_lastFrameTime;
  g_lastFrameTime = now;

  // Calculate FPS
  g_fps = 1000 / deltaTime;
  document.getElementById('fpsIndicator').innerText = `FPS: ${g_fps.toFixed(1)}`;

  // Update animations
  if (g_pokeAnimationEnabled) {
    updatePokeAnimationAngles(); // Handle the poke animation
  } else if (g_animationEnabled) {
    updateAnimationAngles(); // Handle the normal animation
  }

  renderScene(); // Render the scene
  requestAnimationFrame(tick); // Request the next frame
}

function startAnimation() {
  g_animationEnabled = true; // Enable animation
}

function stopAnimation() {
  g_animationEnabled = false; // Disable animation
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Add mouse event listeners
  canvas.onmousedown = onMouseDown;
  canvas.onmousemove = onMouseMove;
  canvas.onmouseup = onMouseUp;

  tick(); // Start the animation loop
  renderScene(); // Render the initial scene
}