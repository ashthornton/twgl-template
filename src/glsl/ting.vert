attribute vec2 position;
attribute vec2 texcoord;

uniform mat3 u_matrix;

varying vec2 v_texcoord;
varying vec2 v_pos;

void main() {
gl_Position = vec4(u_matrix * vec3(position, 1), 1);
v_pos = position;
v_texcoord = texcoord;
}