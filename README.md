## Boid simulation

This is a boid (bird object) simulation written in js with rendering done in WebGl.

This is my first attempt at JS/WebGl so please don't judge the code ;)


## How it works

- Each boid has position and velocity vectors
- Each frame a set of rules is applied for every boid: move towards the center of flock, keep distance from closest
boids, align direction and speed with neighbours
- Boids also avoid walls and have velocity limit

As for drawing I've used instance rendering. I have a small buffer of 6 vertices which represents the arrow shape. I then have buffer
of translation and rotation values for each boid. I transform boid position in vertex shader.

The biggest bottleneck are rules that govern boid behaviour. At 300 boids fps falls below 60. That is because each boid needs to look at the surrounding,
but boids are held in big array, so applying rules is O(n^2). Some spatial subdivision could be used to improve performance (like quadtrees) or moving calculations to GPU side.