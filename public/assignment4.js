const RED_HEX = "#FF0000"
const RED_RGB = webglUtils.hexToRgb(RED_HEX)
const BLUE_HEX = "#0000FF"
const BLUE_RGB = webglUtils.hexToRgb(BLUE_HEX)

const RECTANGLE = "RECTANGLE"
const TRIANGLE = "TRIANGLE"
const STAR = "STAR"
const CIRCLE = "CIRCLE"

const origin = {x: 0, y: 0}
const sizeOne = {width: 1, height: 1}
let shapes = [
  {
    type: RECTANGLE,
    position: origin,
    dimensions: sizeOne,
    color: BLUE_RGB,
    translation: {x: 200, y: 100},
    rotation: {z: 0},
    scale: {x: 50, y: 50}
  },
  {
    type: TRIANGLE,
    position: origin,
    dimensions: sizeOne,
    color: RED_RGB,
    translation: {x: 300, y: 100},
    rotation: {z: 0},
    scale: {x: 50, y: 50}
  },
  {
  type: STAR,
    position: origin,
    dimensions: sizeOne,
    color: BLUE_RGB,
    translation: {x: 200, y: 250},
    rotation: {z: 0},
    scale: {x: 50, y: 50}
  },
  {
    type: CIRCLE,
    position: origin,
    dimensions: sizeOne,
    color: RED_RGB,
    translation: {x: 100, y: 100},
    rotation: {z: 0},
    scale: {x: 50, y: 50}
  }
]

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
    "#vertex-shader-2d", "#fragment-shader-2d");
  gl.useProgram(program);

  // get reference to GLSL attributes and uniforms
  attributeCoords = gl.getAttribLocation(program, "a_coords");
  uniformMatrix = gl.getUniformLocation(program, "u_matrix");
  const uniformResolution = gl.getUniformLocation(program, "u_resolution"); // Only needed once, so declared in init
  uniformColor = gl.getUniformLocation(program, "u_color");

  // get input field references and configure event handler
  document.getElementById("tx").onchange = event => updateTranslation(event, "x")
  document.getElementById("ty").onchange = event => updateTranslation(event, "y")
  document.getElementById("sx").onchange = event => updateScale(event, "x")
  document.getElementById("sy").onchange = event => updateScale(event, "y")
  document.getElementById("rz").onchange = event => updateRotation(event, "z")
  document.getElementById("color").onchange = event => updateColor(event)

  // initialize coordinate attribute to send each vertex to GLSL program
  gl.enableVertexAttribArray(attributeCoords);

  // initialize coordinate buffer to send array of vertices to GPU
  // Populate then empty for every shape
  bufferCoords = gl.createBuffer();

  // configure canvas resolution and clear the canvas
  gl.uniform2f(uniformResolution, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // TODO select a shape by default
  selectShape(0)
}

// Render the  screen
const render = () => {
  // Sets up buffer to accept inputs
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferCoords);
  gl.vertexAttribPointer(
    attributeCoords,
    2,
    gl.FLOAT,
    false,
    0,

    0);
  
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

  // For each shape in shapes, inject color from u_color and render it
  shapes.forEach(shape => {
    gl.uniform4f(uniformColor,
      shape.color.red,
      shape.color.green,
      shape.color.blue, 1);

    // compute transformation matrix
    let matrix = m3.projection(gl.canvas.clientWidth, gl.canvas.clientHeight);
    matrix = m3.translate(matrix, shape.translation.x, shape.translation.y);
    matrix = m3.rotate(matrix, shape.rotation.z);
    matrix = m3.scale(matrix, shape.scale.x, shape.scale.y);

    // apply transformation matrix
    gl.uniformMatrix3fv(uniformMatrix, false, matrix);

    // pass shapes to appropriate render function
    if (shape.type === RECTANGLE) {
      renderRectangle(shape)
    } else if(shape.type === TRIANGLE) {
      renderTriangle(shape)
    } else if(shape.type === STAR) {
      renderStar(shape, 6) // Triangle count of 6 is hard coded (for this assignment)
    } else if(shape.type === CIRCLE) {
      renderCircle(shape, 20) // Triangle count of 20 is hard coded (for this assignment)
    }
  })
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
    x1, y1, x2, y1, x1, y2,
    x1, y2, x2, y1, x2, y2,
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
    x1, y1, x2, y2, x3, y3
  ])
 
  gl.bufferData(gl.ARRAY_BUFFER,
           float32Array, gl.STATIC_DRAW);
 
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// Render a star
const renderStar = (star, triangleCount) => {
  // Get center
  const xCenter = star.position.x;
  const yCenter = star.position.y;

  // Inner points are the central shape (to be used with gl.TRIANGLE_FAN)
  // Outer points are the triangles making up the star (to be used with gl.TRIANGLES)
  const innerPoints = [xCenter, yCenter]
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
    
    innerPoints.push(x3, y3)
    outerPoints.push(x1, y1, x2, y2, x3, y3)
  }

  // Add last point to complete innerPoints loop
  const x3 = xCenter + Math.cos(offset) * star.dimensions.width / 10
  const y3 = yCenter + Math.sin(offset) * star.dimensions.height / 10
  innerPoints.push(x3, y3)

  // buffer and draw the points
  const float32ArrayInner = new Float32Array(innerPoints);
  gl.bufferData(gl.ARRAY_BUFFER, float32ArrayInner, gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, innerPoints.length / 2);

  const float32ArrayOuter = new Float32Array(outerPoints);
  gl.bufferData(gl.ARRAY_BUFFER, float32ArrayOuter, gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, outerPoints.length / 2);
}

// Render a circle using the given number of triangles
const renderCircle = (circle, triangleCount) => {
  // Insert center of circle
  const xCenter = circle.position.x;
  const yCenter = circle.position.y;
  const points = [xCenter, yCenter]

  // Insert outer points of triangles
  for (ii = 0; ii < (triangleCount + 1); ++ii) {
    const theta = (ii / triangleCount) * 2 * Math.PI 
    const xPos = xCenter + Math.cos(theta) * circle.dimensions.width / 2
    const yPos = yCenter + Math.sin(theta) * circle.dimensions.height / 2
    points.push(xPos)
    points.push(yPos)
  }

  // buffer and draw the points using a triangle fan
  const float32Array = new Float32Array(points);
  gl.bufferData(gl.ARRAY_BUFFER, float32Array, gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, points.length / 2);
}

const doMouseDown = (event) => {
  const boundingRectangle = canvas.getBoundingClientRect();
  const x = event.clientX - boundingRectangle.left;
  const y = event.clientY - boundingRectangle.top;
  const translation = {x, y}
  const shape = document.querySelector("input[name='shape']:checked").value
 
  addShape(translation, shape)
}

const addShape = (translation, type) => {
  const colorHex = document.getElementById("color").value
  const colorRgb = webglUtils.hexToRgb(colorHex)
  let tx = 0
  let ty = 0
  if (translation) {
    tx = translation.x
    ty = translation.y
  }

  const shape = {
    type: type,
    position: origin,
    dimensions: sizeOne,
    color: colorRgb,
    translation: {x: tx, y: ty, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 20, y: 20, z: 20}
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
  document.getElementById("sx").value = shapes[selectedIndex].scale.x
  document.getElementById("sy").value = shapes[selectedIndex].scale.y
  document.getElementById("rz").value = shapes[selectedIndex].rotation.z
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
  const value = event.target.value
  const angleInDegrees = (360 - value) * Math.PI / 180;
  shapes[selectedShapeIndex].rotation[axis] = angleInDegrees
  render();
}

// update a shape that changed color
const updateColor = (event) => {
  const value = event.target.value
  const rgb = webglUtils.hexToRgb(value)
  shapes[selectedShapeIndex].color = rgb
  render();
}
