import * as twgl from 'twgl.js'
import debounce from 'lodash.debounce'

import vert from '../glsl/ting.vert'
import frag from '../glsl/ting.frag'

export default class Ting {
  constructor () {

    this.canvas = document.querySelector('canvas')

    if (!this.canvas) return

    this.setup = this.setup.bind(this)
    this.render = this.render.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onResize = this.onResize.bind(this)

    this.observer = new IntersectionObserver(this.observerHandler.bind(this))

    this.setup().then(() => {
      // canvas is ready to render
      this.observer.observe(this.canvas)
      this.addEvents()
    })
  }

  addEvents () {
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('touchmove', this.onMouseMove)
    window.addEventListener('resize', debounce(this.onResize, 100))
  }

  setup () {

    this.mouseCanvas = { x: -500, y: -500, _x: -500, _y: -500 }

    return new Promise(resolve => {
      this.gl = this.canvas.getContext('webgl', { premultipliedAlpha: false }) // TODO: change to experimental-webgl if IE/Edge
      this.rect = this.canvas.getBoundingClientRect()

      // compile shaders, link program, lookup location
      this.programInfo = twgl.createProgramInfo(this.gl, [vert, frag])
      this.bufferInfo = twgl.primitives.createXYQuadBufferInfo(this.gl)

      this.texture = twgl.createTextures(
        this.gl,
        {
          darkTexture: {
            src: 'https://source.unsplash.com/512x512/?black'
          },
          lightTexture: {
            src: 'https://source.unsplash.com/512x512/?white'
          }
        },
        (err, textures, sources) => {
          // Textures Loaded

          if (err) {
            console.error(err)
          }

          this.imageSize = sources.darkTexture
          this.darkTexture = textures.darkTexture
          this.lightTexture = textures.lightTexture

          this.gl.clearColor(0, 0, 0, 0)
          this.gl.clear(this.gl.COLOR_BUFFER_BIT)

          this.gl.useProgram(this.programInfo.program)
          // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
          twgl.setBuffersAndAttributes(this.gl, this.programInfo, this.bufferInfo)

          twgl.setUniforms(this.programInfo, {
            u_darkImage: this.darkTexture,
            u_lightImage: this.lightTexture,
            u_maxRange: 125 * window.devicePixelRatio,
            u_minRange: 75 * window.devicePixelRatio,
            u_noiseZoom: 75 * window.devicePixelRatio
          })

          this.resizeCanvas()

          resolve()
        }
      )
    })
  }

  render (time) {
    // update mouse position for highlight hover and perspective
    this.mouseCanvas.x = this.lerp(this.mouseCanvas.x, this.mouseCanvas._x, 0.1)
    this.mouseCanvas.y = this.lerp(this.mouseCanvas.y, this.mouseCanvas._y, 0.1)

    // calls gl.activeTexture, gl.bindTexture, gl.uniformXXX
    twgl.setUniforms(this.programInfo, {
      u_mouse: [this.mouseCanvas.x, this.mouseCanvas.y],
      u_time: time * 0.001
    })

    // calls gl.drawArrays or gl.drawElements
    twgl.drawBufferInfo(this.gl, this.bufferInfo)

    this.rafId = requestAnimationFrame(this.render)
  }

  resizeCanvas () {
    const canvasAspect = (this.gl.canvas.clientWidth / this.gl.canvas.clientHeight)
    const imageAspect = this.imageSize.width / this.imageSize.height
    this.mat = this.scaling(imageAspect / canvasAspect, -1)

    twgl.resizeCanvasToDisplaySize(this.gl.canvas, window.devicePixelRatio)
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)

    twgl.setUniforms(this.programInfo, {
      u_matrix: this.mat
    })
  }

  observerHandler (els) {
    els.forEach(el => {
      if (el.isIntersecting && !this.rafId) {
        // canvas is visible
        this.render()
      } else {
        cancelAnimationFrame(this.rafId)
        this.rafId = false
      }
    })
  }

  onMouseMove (evt) {
    if (!this.rafId) return
    let x, y
    if (evt.type === 'touchmove') {
      x = evt.touches[0].pageX || evt.changedTouches[0].pageX
      y = evt.touches[0].pageY || evt.changedTouches[0].pageY
    } else {
      x = evt.pageX
      y = evt.pageY
    }
    this.mouseCanvas._x = ((x - this.rect.left) * this.canvas.width) / this.rect.width
    this.mouseCanvas._y = this.canvas.height - ((y - this.rect.top) * this.canvas.height) / this.rect.height
  }

  onResize () {
    this.resizeCanvas()
    this.rect = this.canvas.getBoundingClientRect()
  }

  scaling (sx, sy) {
    return [sx, 0, 0, 0, sy, 0, 0, 0, 1]
  }

  lerp (start, end, amt) {
    return (1 - amt) * start + amt * end
  }

  destroy () {
    // TODO: clean
    this.observer.disconnect()
  }
}
