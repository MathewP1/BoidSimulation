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
in vec3 a_transform;

out vec2 v_texcoord;

uniform vec2 screenSize;

void main() {
    mat3 rotationMatrix = mat3(
    cos(a_transform.z), -sin(a_transform.z), 0.0,
    sin(a_transform.z), cos(a_transform.z), 0.0,
    0.0, 0.0, 1.0);
    
    vec3 rotatedPos = rotationMatrix * vec3(a_position, 1);
    gl_Position = vec4(rotatedPos.xy + a_transform.xy, 0, 1);
    v_texcoord = ((rotatedPos.xy + a_transform.xy) + vec2(1.0)) * -0.5;
}
`;
        const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_texcoord;
uniform sampler2D u_texture;

out vec4 outColor;
uniform vec4 u_color;
void main() {
  outColor = texture(u_texture, v_texcoord);
}
`;
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        const program = createProgram(gl, vertexShader, fragmentShader);
        gl.useProgram(program);
        const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
        const transformAttributeLocation = gl.getAttribLocation(program, "a_transform");
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
        const instanceSize = 3;
        const data = new Float32Array(count * instanceSize);
        for (let i = 0; i < count; i++) {
            data[i * instanceSize] = boids[i].position[0];
            data[i * instanceSize + 1] = boids[i].position[1];
            data[i * instanceSize + 2] = -Math.atan2(boids[i].velocity[1], boids[i].velocity[0]);
        }

        console.log(data);


        const transformBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, transformBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

        // setup vertex attribute for position
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, transformBuffer);
        gl.enableVertexAttribArray(transformAttributeLocation);
        gl.vertexAttribPointer(transformAttributeLocation, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(transformAttributeLocation, 1);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

        const image = new Image();
        image.src = "resources/gradient.png";
        image.addEventListener('load', () => {
           gl.bindTexture(gl.TEXTURE_2D, texture);
           gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
           gl.generateMipmap(gl.TEXTURE_2D);
        });



        return {
            vao: vao,
            program: program,
            transformBuffer: transformBuffer,
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

    const recalculateTranslateAndRotation = (boids, deltaTime) => {
        const result = new Float32Array(boids.length * 3); // translate.x, translate.y, rotation
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

            result[3*i] = boids[i].position[0];
            result[3*i + 1] = boids[i].position[1];
            result[3*i + 2] = -Math.atan2(boids[i].velocity[1], boids[i].velocity[0]);
        }
        return result;
    }

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
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const translationAndRotation = recalculateTranslateAndRotation(boids, delta);
        gl.bindBuffer(gl.ARRAY_BUFFER, state.transformBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, translationAndRotation, gl.DYNAMIC_DRAW);

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
