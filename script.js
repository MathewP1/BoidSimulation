"use strict";

import {createShader, createProgram, resizeCanvasToDisplaySize} from "./modules/utility.js";

let vec2, mat3;

const settings = {
    cohesionFactor: 0.00001,
    cohesion: true,
    separation: true,
    separationFactor: 0.00001,
    separationRange: 0.01,
    alignment: true,
    alignmentFactor: 0.0001,
    visualRange: 0.1,
};

document.addEventListener("DOMContentLoaded", function() {
    console.log("Adding ui elements");
    const uiInfos = [
        {
            key: "cohesion",
            type: "checkbox",
            name: "Cohesion",
        },
        {
            key: "cohesionFactor",
            type: "slider",
            min: 0,
            max: 0.0001,
            step: 0.000001,
            name: "Cohesion Factor",
            uiPrecision: 6,
        },
        {
          key: "separation",
          type: "checkbox",
          name: "Separation",
        },
        {
            key: "separationFactor",
            type: "slider",
            min: 0,
            max: 0.1,
            step: 0.000001,
            name: "Separation Factor",
            uiPrecision: 6,
        },
        {
            key: "separationRange",
            type: "slider",
            min: 0.001,
            max: 0.1,
            step: 0.0001,
            name: "Separation Range",
            uiPrecision: 4,
        },
        {
            key: "alignment",
            type: "checkbox",
            name: "Alignment",
        },
        {
            key: "alignmentFactor",
            type: "slider",
            min: 0,
            max: 0.1,
            step: 0.00001,
            name: "Alignment Factor",
            uiPrecision: 6,
        },
        {
            key: "visualRange",
            type: "slider",
            min: 0.01,
            max: 1,
            step: 0.001,
            name: "Visual Range",
            uiPrecision: 3
        }
    ];

    const parent = document.getElementById("slidersContainer");
    const widgets = webglLessonsUI.setupUI(parent, settings, uiInfos);

});


function randomFloatInRange(min, max) {
    return Math.random() * (max - min) + min;
}


function main() {
    const canvas = document.querySelector("#c");

    const gl = canvas.getContext("webgl2");
    if (!gl) {
        console.log("No web gl 2!");
    }

    console.log("WebGL context successfully initialized!")

    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const size = 0.02;
    const glPrepareBoids = (gl, boids, size) => {
        const vertexShaderSource = `#version 300 es

in vec2 a_position;
in mat3 a_matrix;

void main() {

    gl_Position = vec4((a_matrix * vec3(a_position, 1)).xy, 0, 1);
}
`;
        const fragmentShaderSource = `#version 300 es
precision highp float;

out vec4 outColor;
uniform vec4 u_color;
void main() {
  outColor = u_color;
}
`;
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        const program = createProgram(gl, vertexShader, fragmentShader);

        const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
        const matrixAttributeLocation = gl.getAttribLocation(program, "a_matrix");
        const colorUniformLocation = gl.getUniformLocation(program, "u_color");

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const x = 0; const y = 0; //bird origin
        const r = size;
        const birdDist = r / Math.SQRT2;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x, y,
            x - birdDist, y - birdDist,
            x + r, y,
            x + r, y,
            x - birdDist, y + birdDist,
            x, y
        ]), gl.STATIC_DRAW);

        const count = boids.length;
        const matrixSize = 9;
        const matrices = new Float32Array(count * matrixSize);
        const matrixI = m3.identity();
        for (let i = 0; i < count; i++) {
            const boid = boids[i];
            const translatedMatrix = m3.translate(matrixI, boid.position.x, boid.position.y);
            const rotatedMatrix = m3.rotate(translatedMatrix, boid.rotation);
            matrices.set(rotatedMatrix, i * matrixSize);
        }

        const matrixBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, matrixBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, matrices, gl.STATIC_DRAW);

        // setup vertex attribute for position
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, matrixBuffer);
        gl.enableVertexAttribArray(matrixAttributeLocation);
        const matrixByteSize = 9 * 4; // 9 elements, 4 bytes each
        // matrix attributes are unsupported, I have to treat each column manually

        // first column
        gl.vertexAttribPointer(matrixAttributeLocation, 3, gl.FLOAT, false, matrixByteSize, 0 * 4);
        gl.vertexAttribDivisor(matrixAttributeLocation, 1);
        // second column
        gl.enableVertexAttribArray(matrixAttributeLocation + 1);
        gl.vertexAttribPointer(matrixAttributeLocation + 1, 3, gl.FLOAT, false, matrixByteSize, 3 * 4);
        gl.vertexAttribDivisor(matrixAttributeLocation + 1, 1);
        // third column
        gl.enableVertexAttribArray(matrixAttributeLocation + 2);
        gl.vertexAttribPointer(matrixAttributeLocation + 2, 3, gl.FLOAT, false, matrixByteSize, 6 * 4);
        gl.vertexAttribDivisor(matrixAttributeLocation + 2, 1);

        return {
            matrices: matrices,
            vao: vao,
            program: program,
            matrixBuffer: matrixBuffer,
            colorUniformLocation: colorUniformLocation
        }
    }


    const createBoid = (position, rotation, velocity) => {
        const direction = vec2.fromValues(Math.cos(rotation), Math.sin(rotation));
        const velocityVec = vec2.create();
        vec2.scale(velocityVec, direction, velocity);
        return {
            position: position,
            velocity: velocityVec,
        }
    };
    const updateBoid = (boid, deltaTime, velChange) => {
        const maxVelocity = 0.001;
        const delta = vec2.create();

        vec2.add(boid.velocity, boid.velocity, velChange);

        if (vec2.length(boid.velocity) > maxVelocity) {
            console.log("max");
            vec2.normalize(boid.velocity, boid.velocity);
            vec2.scale(boid.velocity, boid.velocity, maxVelocity);
        }

        vec2.scale(delta, boid.velocity, deltaTime);

        vec2.add(boid.position, boid.position, delta);

        // avoid walls
        const margin = 0.1;
        const turnFactor = 0.0005;
        if (boid.position[0] < -1.0 + margin + size) {
            boid.velocity[0] += turnFactor;
        }
        if (boid.position[0] > 1.0 - size - margin) {
            boid.velocity[0] -= turnFactor;
        }
        if (boid.position[1] < -1.0 + margin + size) {
            boid.velocity[1] += turnFactor;
        }
        if (boid.position[1] > 1.0 - size - margin) {
            boid.velocity[1] -= turnFactor;
        }
    }

    const cohesion = (index, boids) => {
        const factor = settings.cohesionFactor;
        const center = vec2.fromValues(0, 0);
        let neighboursCount = 0;

        for (let i = 0; i < boids.length; i++) {
            if (i === index) continue;
            const neighbour = vec2.create();
            vec2.sub(neighbour, boids[i].position, boids[length].position);
            if (vec2.length(neighbour) < settings.visualRange) {
                vec2.add(center, center, boids[i].position);
                neighboursCount++;
            }
        }

        if (neighboursCount > 0) {
            vec2.scale(center, center, 1.0/neighboursCount);
            vec2.sub(center, center, boids[index].position);
            vec2.scale(center, center, factor);

        }
        return center;

    }

    const separation = (index, boids) => {
        const minDistance = settings.separationRange;
        const avoidFactor = settings.separationFactor;
        const avoid = vec2.fromValues(0, 0);
        const move = vec2.create(0, 0);

        for (let i = 0; i < boids.length; i++) {
            if (i === index) continue;
            const neighbour = vec2.create();
            vec2.sub(neighbour, boids[i].position, boids[index].position);
            if (vec2.length(neighbour) < minDistance) {
                vec2.sub(move, boids[index].position, boids[i].position);
                vec2.add(avoid, avoid, move);
            }
        }
        vec2.scale(avoid, avoid, avoidFactor);
        return avoid;
    }

    const alignment = (index, boids) => {
        const averageVelocity = vec2.fromValues(0, 0);
        let count = 0;
        for (let i = 0; i < boids.length; i++) {
            if (i === index) continue;
            const neighbour = vec2.create();
            vec2.sub(neighbour, boids[i].position, boids[index].position);
            if (vec2.length(neighbour) < settings.visualRange) {
                vec2.add(averageVelocity, averageVelocity, boids[i].velocity);
                count++;
            }
        }

        if (count > 0) {
            vec2.scale(averageVelocity, averageVelocity, 1.0/count);
            vec2.scale(averageVelocity, averageVelocity, settings.alignmentFactor);
        }
        return averageVelocity;
    }



    const recalculateMatrices = (boids, deltaTime) => {
        const matrixI = m3.identity();
        const matrixSize = 9;
        const matrices = new Float32Array(boids.length * matrixSize);

        for (let i = 0; i < boids.length; i++) {
            const vel = vec2.fromValues(0, 0);
            if (settings.cohesion === true) {
                vec2.add(vel, vel, cohesion(i, boids));
            }
            if (settings.separation === true) {
                vec2.add(vel, vel, separation(i, boids));

            }
            if (settings.alignment === true) {
                vec2.add(vel, vel, alignment(i, boids));
            }


            updateBoid(boids[i], deltaTime, vel);
            const translatedMatrix = m3.translate(matrixI, boids[i].position[0], boids[i].position[1]);
            const rotation = -Math.atan2(boids[i].velocity[1], boids[i].velocity[0]);
            const rotatedMatrix = m3.rotate(translatedMatrix, rotation);
            matrices.set(rotatedMatrix, i * matrixSize);
        }
        return matrices
    }

    // TODO: optimizations:
    // 1. Pass only translation and rotation to gpu, construct matrices there
    // 2. Make a gpu pre-pass: boids will hold indices, one vector od positions and velocity exists and is updated on gpu side
    //


    const boidCount = 200;
    const boids = [];
    for (let i = 0; i < boidCount; i++) {
        const b = createBoid(vec2.fromValues(randomFloatInRange(-1, 1), randomFloatInRange(-1, 1)), randomFloatInRange(0, 2*Math.PI), 0.0005);
        boids.push(b);
    }

    const state = glPrepareBoids(gl, boids, size);


    gl.useProgram(state.program);
    gl.bindVertexArray(state.vao);
    gl.uniform4f(state.colorUniformLocation, 1, 0, 0, 1);

    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error("WebGL error:", error);
    }

    let lastTimestamp = 0;
    let frameCount = 0;
    let acc = 0;
    let fps = document.getElementById('fps');
    fps.textContent = `FPS: 60`;
    const renderLoop = (timestamp) => {
        const delta = timestamp - lastTimestamp;
        lastTimestamp = timestamp;

        acc += delta;
        frameCount++;
        if (acc >= 1000) {
            fps.textContent = `FPS: ${frameCount}`;
            frameCount = 0;
            acc = 0;
        }

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const matrices = recalculateMatrices(boids, delta);
        gl.bindBuffer(gl.ARRAY_BUFFER, state.matrixBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, matrices, gl.STATIC_DRAW);

        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, boids.length);
        requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);


}

import('https://cdn.skypack.dev/gl-matrix').then(module => {
    vec2 = module.vec2;
    mat3 = module.mat3;

    // Initialize or start your main application code
    main();
}).catch(error => {
    console.error("Failed to load glMatrix:", error);
});
