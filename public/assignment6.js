let gl              // reference to canva's WebGL context, main API
let attributeCoords // maps to vertex shader a_coords
let uniformMatrix   // uniform matrix location
let uniformColor    // maps to fragment shader u_color
let bufferCoords    // sends geometry to GPU

// Init runs only once and sets up everything
const init = () => {
  // get a reference to the canvas and WebGL context
  const canvas = document.querySelector("#canvas");

  canvas.addEventListener(
    "mousedown",
    doMouseDown,
    false);
  
  gl = canvas.getContext("webgl");

  // create and use a GLSL program
  const program = webglUtils.createProgramFromScripts(gl,
    "#vertex-shader-3d", "#fragment-shader-3d");
  gl.useProgram(program);

  // get reference to GLSL attributes and uniforms
  attributeCoords = gl.getAttribLocation(program, "a_coords");
  uniformMatrix = gl.getUniformLocation(program, "u_matrix");
  const uniformResolution = gl.getUniformLocation(program, "u_resolution"); // Only needed once, so declared in init
  uniformColor = gl.getUniformLocation(program, "u_color");

  // get input field references and configure event handler
  document.getElementById("tx").onchange = event => updateTranslation(event, "x")
  document.getElementById("ty").onchange = event => updateTranslation(event, "y")
  document.getElementById("tz").onchange = event => updateTranslation(event, "z")

  document.getElementById("sx").onchange = event => updateScale(event, "x")
  document.getElementById("sy").onchange = event => updateScale(event, "y")
  document.getElementById("sz").onchange = event => updateScale(event, "z")

  document.getElementById("rx").onchange = event => updateRotation(event, "x")
  document.getElementById("ry").onchange = event => updateRotation(event, "y")
  document.getElementById("rz").onchange = event => updateRotation(event, "z")

  document.getElementById("fv").onchange = event => updateFieldOfView(event)

  document.getElementById("color").onchange = event => updateColor(event)

  document.getElementById("lookAt").onchange = event => webglUtils.toggleLookAt(event)
  document.getElementById("ctx").onchange = event => webglUtils.updateCameraTranslation(event, "x")
  document.getElementById("cty").onchange = event => webglUtils.updateCameraTranslation(event, "y")
  document.getElementById("ctz").onchange = event => webglUtils.updateCameraTranslation(event, "z")

  document.getElementById("crx").onchange = event => webglUtils.updateCameraRotation(event, "x")
  document.getElementById("cry").onchange = event => webglUtils.updateCameraRotation(event, "y")
  document.getElementById("crz").onchange = event => webglUtils.updateCameraRotation(event, "z")

  document.getElementById("ltx").onchange = event => webglUtils.updateLookAtTranslation(event, 0)
  document.getElementById("lty").onchange = event => webglUtils.updateLookAtTranslation(event, 1)
  document.getElementById("ltz").onchange = event => webglUtils.updateLookAtTranslation(event, 2)

  document.getElementById("lookAt").checked = lookAt
  document.getElementById("ctx").value = camera.translation.x
  document.getElementById("cty").value = camera.translation.y
  document.getElementById("ctz").value = camera.translation.z

  document.getElementById("crx").value = camera.rotation.x
  document.getElementById("cry").value = camera.rotation.y
  document.getElementById("crz").value = camera.rotation.z

  // Set up first person camera
  document.getElementById("fpll").onclick = function () { webglUtils.firstPersonCameraRotation(5, "y") };
  document.getElementById("fpu").onclick = function () { webglUtils.firstPersonCameraTranslation(-5, "z") };
  document.getElementById("fprr").onclick = function () { webglUtils.firstPersonCameraRotation(-5, "y") };
  document.getElementById("fpl").onclick = function () { webglUtils.firstPersonCameraTranslation(-5, "x") };
  document.getElementById("fpd").onclick = function () { webglUtils.firstPersonCameraTranslation(5, "z") };
  document.getElementById("fpr").onclick = function () { webglUtils.firstPersonCameraTranslation(5, "x") };

  // Bind first person keyboard shortcuts
  document.onkeypress = function(event) {
    if (event.key=="w") {
      webglUtils.firstPersonCameraTranslation(-5, "z");
    } else if (event.key=="a") {
      webglUtils.firstPersonCameraTranslation(-5, "x");
    } else if (event.key=="s") {
      webglUtils.firstPersonCameraTranslation(5, "z");
    } else if (event.key=="d") {
      webglUtils.firstPersonCameraTranslation(5, "x");
    }
  };

  // initialize coordinate attribute to send each vertex to GLSL program
  gl.enableVertexAttribArray(attributeCoords);

  // initialize coordinate buffer to send array of vertices to GPU
  // Populate then empty for every shape
  bufferCoords = gl.createBuffer();

  // configure canvas resolution and clear the canvas
  gl.uniform2f(uniformResolution, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // TODO select a shape by default
  selectShape(0)
}

const updateFieldOfView = (event) => {
  fieldOfViewRadians = m4.degToRad(event.target.value);
  render();
 } 

 // lookAt declarations
const up = [0, 1, 0]
let target = [0, 0, 0]
let lookAt = true

// Render the  screen
const render = () => {
  // Sets up buffer to accept inputs
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferCoords);
  gl.vertexAttribPointer(
    attributeCoords,
    3,
    gl.FLOAT,
    false,
    0,

    0);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferCoords);

  // Build camera matrix with lookAt or free look
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 1;
  const zFar = 2000;
  let cameraMatrix = m4.identity()
  if(lookAt) {
    cameraMatrix = m4.translate(
        cameraMatrix,
        camera.translation.x,
        camera.translation.y,
        camera.translation.z)
    const cameraPosition = [
        cameraMatrix[12],
        cameraMatrix[13],
        cameraMatrix[14]]
    cameraMatrix = m4.lookAt(
        cameraPosition,
        target,
        up)
  } else {
    cameraMatrix = m4.zRotate(
        cameraMatrix,
        m4.degToRad(camera.rotation.z));
    cameraMatrix = m4.xRotate(
        cameraMatrix,
        m4.degToRad(camera.rotation.x));
    cameraMatrix = m4.yRotate(
        cameraMatrix,
        m4.degToRad(camera.rotation.y));
    cameraMatrix = m4.translate(
        cameraMatrix,
        camera.translation.x,
        camera.translation.y,
        camera.translation.z);
  }

  // Build projection matrix from camera
  cameraMatrix = m4.inverse(cameraMatrix)
  const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar)
  const viewProjectionMatrix = m4.multiply(projectionMatrix, cameraMatrix)

  // For each shape in shapes, inject color from u_color and render it
  shapes.forEach(shape => {
    gl.uniform4f(uniformColor,
      shape.color.red,
      shape.color.green,
      shape.color.blue, 1);

    // apply transformation matrix
    let M = computeModelViewMatrix(shape, viewProjectionMatrix)
    gl.uniformMatrix4fv(uniformMatrix, false, M);

    // pass shapes to appropriate render function
    if (shape.type === RECTANGLE) {
      renderRectangle(shape)
    } else if(shape.type === TRIANGLE) {
      renderTriangle(shape)
    } else if(shape.type === STAR) {
      renderStar(shape, 6) // Triangle count of 6 is hard coded (for this assignment)
    } else if(shape.type === CIRCLE) {
      renderCircle(shape, 20) // Triangle count of 20 is hard coded (for this assignment)
    } else if (shape.type === CUBE) {
      renderCube(shape)
    }
  })

  // Render the list of shapes
  const $shapeList = $("#object-list")
  $shapeList.empty()
  shapes.forEach((shape, index) => {
    const $li = $(`
      <li>
        <button onclick="deleteShape(${index})">
          Delete
        </button>

        <label>
          <input
          type="radio"
          id="${shape.type}-${index}"
          name="shape-index"
          ${index === selectedShapeIndex ? "checked": ""}
          onclick="selectShape(${index})"
          value="${index}"/>

          ${shape.type};
          X: ${shape.translation.x};
          Y: ${shape.translation.y}
        </label>
      </li>
    `)

    $shapeList.append($li)
  })
}

let fieldOfViewRadians = m4.degToRad(60)
const computeModelViewMatrix = (shape, viewProjectionMatrix) => {
  M = m4.translate(viewProjectionMatrix, shape.translation.x, shape.translation.y, shape.translation.z)
  M = m4.xRotate(M, m4.degToRad(shape.rotation.x))
  M = m4.yRotate(M, m4.degToRad(shape.rotation.y))
  M = m4.zRotate(M, m4.degToRad(shape.rotation.z))
  M = m4.scale(M, shape.scale.x, shape.scale.y, shape.scale.z)
  return M
}


// Render a rectangle
const renderRectangle = (rectangle) => {
  // Calculate rectangle corner coordinates (position = center)
  const x1 = rectangle.position.x - rectangle.dimensions.width / 2;
  const y1 = rectangle.position.y - rectangle.dimensions.height / 2;
  const x2 = rectangle.position.x + rectangle.dimensions.width / 2;
  const y2 = rectangle.position.y + rectangle.dimensions.height / 2;

  // 2-triangle triangulation of the rectangle
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    x1, y1, 0, x2, y1, 0, x1, y2, 0,
    x1, y2, 0, x2, y1, 0, x2, y2, 0
  ]), gl.STATIC_DRAW);

  // draw the triangles
  // 6 because there are 2 triangles of 3 points each
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// Render a triangle
const renderTriangle = (triangle) => {
  const x1 = triangle.position.x - triangle.dimensions.width / 2
  const y1 = triangle.position.y + triangle.dimensions.height / 2
  const x2 = triangle.position.x + triangle.dimensions.width / 2
  const y2 = triangle.position.y + triangle.dimensions.height / 2
  const x3 = triangle.position.x
  const y3 = triangle.position.y - triangle.dimensions.height / 2
 
  const float32Array = new Float32Array([
    x1, y1, 0, x3, y3, 0, x2, y2, 0
  ])
 
  gl.bufferData(gl.ARRAY_BUFFER, float32Array, gl.STATIC_DRAW);
 
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// Render a star
const renderStar = (star, triangleCount) => {
  // Get center
  const xCenter = star.position.x;
  const yCenter = star.position.y;

  // Inner points are the central shape (to be used with gl.TRIANGLE_FAN)
  // Outer points are the triangles making up the star (to be used with gl.TRIANGLES)
  const innerPoints = [xCenter, yCenter, 0]
  const outerPoints = []

  // Get outer triangules of the star based on a bounding ellipse
  // The edges of the triangles will be 4/5 of the radius
  const offset = Math.PI / triangleCount
  for (ii = 0; ii < triangleCount; ++ii) {
    const theta = (ii / triangleCount) * 2 * Math.PI
    const x1 = xCenter + Math.cos(theta - offset) * star.dimensions.width / 10
    const y1 = yCenter + Math.sin(theta - offset) * star.dimensions.height / 10
    const x2 = xCenter + Math.cos(theta) * star.dimensions.width / 2
    const y2 = yCenter + Math.sin(theta) * star.dimensions.height / 2
    const x3 = xCenter + Math.cos(theta + offset) * star.dimensions.width / 10
    const y3 = yCenter + Math.sin(theta + offset) * star.dimensions.height / 10
    
    innerPoints.push(x3, y3, 0)
    outerPoints.push(x1, y1, 0, x2, y2, 0, x3, y3, 0)
  }

  // Add last point to complete innerPoints loop
  const x3 = xCenter + Math.cos(offset) * star.dimensions.width / 10
  const y3 = yCenter + Math.sin(offset) * star.dimensions.height / 10
  innerPoints.push(x3, y3, 0)

  // buffer and draw the points
  const float32ArrayInner = new Float32Array(innerPoints);
  gl.bufferData(gl.ARRAY_BUFFER, float32ArrayInner, gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, innerPoints.length / 3);

  const float32ArrayOuter = new Float32Array(outerPoints);
  gl.bufferData(gl.ARRAY_BUFFER, float32ArrayOuter, gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, outerPoints.length / 3);
}

// Render a circle using the given number of triangles
const renderCircle = (circle, triangleCount) => {
  // Insert center of circle
  const xCenter = circle.position.x;
  const yCenter = circle.position.y;
  const points = [xCenter, yCenter, 0]

  // Insert outer points of triangles
  for (ii = 0; ii < (triangleCount + 1); ++ii) {
    const theta = (ii / triangleCount) * 2 * Math.PI 
    const xPos = xCenter + Math.cos(theta) * circle.dimensions.width / 2
    const yPos = yCenter + Math.sin(theta) * circle.dimensions.height / 2
    points.push(xPos, yPos, 0)
  }

  // buffer and draw the points using a triangle fan
  const float32Array = new Float32Array(points);
  gl.bufferData(gl.ARRAY_BUFFER, float32Array, gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, points.length / 3);
}

const renderCube = (cube) => {
  const geometry = [
     0,  0,  0,    0, 30,  0,   30,  0,  0,
     0, 30,  0,   30, 30,  0,   30,  0,  0,
     0,  0, 30,   30,  0, 30,    0, 30, 30,
     0, 30, 30,   30,  0, 30,   30, 30, 30,
     0, 30,  0,    0, 30, 30,   30, 30, 30,
     0, 30,  0,   30, 30, 30,   30, 30,  0,
     0,  0,  0,   30,  0,  0,   30,  0, 30,
     0,  0,  0,   30,  0, 30,    0,  0, 30,
     0,  0,  0,    0,  0, 30,    0, 30, 30,
     0,  0,  0,    0, 30, 30,    0, 30,  0,
    30,  0, 30,   30,  0,  0,   30, 30, 30,
    30, 30, 30,   30,  0,  0,   30, 30,  0
  ]
  const float32Array = new Float32Array(geometry)
  gl.bufferData(gl.ARRAY_BUFFER, float32Array, gl.STATIC_DRAW)
  var primitiveType = gl.TRIANGLES;
  gl.drawArrays(gl.TRIANGLES, 0, 6 * 6);
}

const doMouseDown = (event) => {
  const boundingRectangle = canvas.getBoundingClientRect();
  const x = Math.round(event.clientX - boundingRectangle.left - boundingRectangle.width / 2);
  const y = -Math.round(event.clientY - boundingRectangle.top - boundingRectangle.height / 2);
  const translation = {x, y, z: -150}
  const rotation = {x: 0, y: 0, z: 180}
  const shapeType = document.querySelector("input[name='shape']:checked").value
  const shape = {
    translation, rotation, type: shapeType
  }

  addShape(shape, shapeType)
}

const addShape = (newShape, type) => {
  const colorHex = document.getElementById("color").value
  const colorRgb = webglUtils.hexToRgb(colorHex)
  let tx = 0
  let ty = 0
  let tz = 0

  let shape = {
    type: type,
    position: origin,
    dimensions: sizeOne,
    color: colorRgb,
    translation: {x: tx, y: ty, z: tz},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 20, y: 20, z: 20}
  }

  if (newShape) {
    Object.assign(shape, newShape)
  } 

  shapes.push(shape)
  render()
}

const deleteShape = (shapeIndex) => {
  shapes.splice(shapeIndex, 1)
  render()
} 

let selectedShapeIndex = 0
const selectShape = (selectedIndex) => {
  selectedShapeIndex = selectedIndex
  document.getElementById("tx").value = shapes[selectedIndex].translation.x
  document.getElementById("ty").value = shapes[selectedIndex].translation.y
  document.getElementById("tz").value = shapes[selectedIndex].translation.z

  document.getElementById("sx").value = shapes[selectedIndex].scale.x
  document.getElementById("sy").value = shapes[selectedIndex].scale.y
  document.getElementById("sz").value = shapes[selectedIndex].scale.z

  document.getElementById("rx").value = shapes[selectedIndex].rotation.x
  document.getElementById("ry").value = shapes[selectedIndex].rotation.y
  document.getElementById("rz").value = shapes[selectedIndex].rotation.z

  document.getElementById("fv").value = m4.radToDeg(fieldOfViewRadians)

  const hexColor = webglUtils.rgbToHex(shapes[selectedIndex].color)
  document.getElementById("color").value = hexColor
}

// update a shape that was translated
const updateTranslation = (event, axis) => {
  const value = event.target.value
  shapes[selectedShapeIndex].translation[axis] = value
  render()
}

// update a shape that was scaled
const updateScale = (event, axis) => {
  const value = event.target.value
  shapes[selectedShapeIndex].scale[axis] = value
  render()
}

// update a shape that was rotated
const updateRotation = (event, axis) => {
  shapes[selectedShapeIndex].rotation[axis] = event.target.value
  render();
}

// update a shape that changed color
const updateColor = (event) => {
  const value = event.target.value
  const rgb = webglUtils.hexToRgb(value)
  shapes[selectedShapeIndex].color = rgb
  render();
}