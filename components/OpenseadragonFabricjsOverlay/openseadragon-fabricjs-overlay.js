// OpenSeadragon canvas Overlay plugin 0.0.1 based on svg overlay plugin

(function() {
  if (!window.OpenSeadragon) {
    console.error("[openseadragon-canvas-overlay] requires OpenSeadragon");
    return;
  }

  /**
   * @param {Object} options
   *      Allows configurable properties to be entirely specified by passing
   *      an options object to the constructor.
   * @param {Number} options.scale
   *      Fabric 'virtual' canvas size, for creating objects
   **/
  OpenSeadragon.Viewer.prototype.fabricjsOverlay = function(options) {
    this._fabricjsOverlayInfo = new Overlay(this);
    this._fabricjsOverlayInfo._scale = options.scale || 1000;
    this._fabricjsOverlayInfo._annotator = options.annotator;
    return this._fabricjsOverlayInfo;
  };

  // ----------
  const Overlay = function(viewer) {
    this.fillMode = false
    this._viewer = viewer;

    this._containerWidth = 0;
    this._containerHeight = 0;

    this._canvasdiv = document.createElement("div");
    this._canvasdiv.style.position = "absolute";
    this._canvasdiv.style.left = 0;
    this._canvasdiv.style.top = 0;
    this._canvasdiv.style.width = "100%";
    this._canvasdiv.style.height = "100%";
    this._viewer.canvas.appendChild(this._canvasdiv);

    this._canvas = document.createElement("canvas");
  
    this._id = "fabric";
    this._canvas.setAttribute("id", this._id);
    this._canvasdiv.appendChild(this._canvas);
    this._fabricCanvas = new fabric.Canvas(this._canvas);

    // disable fabric selection because default click is tracked by OSD
    this._fabricCanvas.selection = false;

    this.activeLine = null;
    this.activeShape = null;
    this.pointArray = [];
    this.lineArray = [];

    this._viewer.addHandler("update-viewport", function() {
      this.resize();
      this.resizecanvas();
    }.bind(this));

    this._viewer.addHandler("open", function() {
      this.resize();
      this.resizecanvas();
    }.bind(this));

    this._fabricCanvas.on('mouse:down', this._mouseDown.bind(this))
    this._fabricCanvas.on('mouse:up', this._mouseUp.bind(this))
    this._fabricCanvas.on('object:selected', this._notifyShapeSelected.bind(this))
    // this will be dynamically registered
    this._boundMouseMoveListener = this._mouseMove.bind(this)
  };

  // ----------
  Overlay.prototype = {
    // modes: ['rectangle', 'circle', 'polygon', 'remove', 'select'],
    unassignedColor: 'grey',
    defaultStyle: {
      strokeWidth: 2,
      opacity: 0.4,
      hasBorders: true,
      hasControls: false,
      lockScalingX: true,
      lockScalingY: true,
      lockUniScaling: true,
      lockSkewingX: true,
      lockSkewingY: true,
      lockRotation: true
    },
    pointStyle: {
      radius: 5,
      fill: '#ffffff',
      stroke: '#333333',
      strokeWidth: 0.5,
      selectable: false,
      hasBorders: false,
      hasControls: false,
      originX: 'center',
      originY: 'center',
      objectCaching: false
    },
    lineStyle: {
      strokeWidth: 1,
      fill: '#449',
      stroke: '#449',
      class:'line',
      originX:'center',
      originY:'center',
      selectable: false,
      hasBorders: false,
      hasControls: false,
      evented: false,
      objectCaching:false
    },
    polyPointStyle: {
      stroke:'#336',
      strokeWidth: 2,
      fill: '#aaf',
      opacity: 0.3,
      selectable: false,
      hasBorders: false,
      hasControls: false,
      evented: false,
      objectCaching: false
    },
    // ----------
    canvas: function() {
      return this._canvas;
    },
    fabricCanvas: function() {
      return this._fabricCanvas;
    },
    // ----------
    clear: function() {
      this._fabricCanvas.clear();
    },
    // ----------
    resize: function() {
      if (this._containerWidth !== this._viewer.container.clientWidth) {
        this._containerWidth = this._viewer.container.clientWidth;
      }

      if (this._containerHeight !== this._viewer.container.clientHeight) {
        this._containerHeight = this._viewer.container.clientHeight;
        this._canvasdiv.setAttribute("height", this._containerHeight);
        this._canvas.setAttribute("height", this._containerHeight);
      }
    },

    getZoom: function () {
      const viewportZoom = this._viewer.viewport.getZoom(true);
      return (this._viewer.viewport._containerInnerSize.x * viewportZoom) / this._scale;
    },

    resizecanvas: function() {
      const origin = new OpenSeadragon.Point(0, 0);
      this._fabricCanvas.setWidth(this._containerWidth);
      this._fabricCanvas.setHeight(this._containerHeight);
      const viewportZoom = this._viewer.viewport.getZoom(true);
      const zoom =
        (this._viewer.viewport._containerInnerSize.x * viewportZoom) /
        this._scale;
      this._fabricCanvas.setZoom(zoom);
      const viewportWindowPoint = this._viewer.viewport.viewportToWindowCoordinates(origin);
      const x = Math.round(viewportWindowPoint.x);
      const y = Math.round(viewportWindowPoint.y);
      const canvasOffset = this._canvasdiv.getBoundingClientRect();

      const pageScroll = OpenSeadragon.getPageScroll();

      this._fabricCanvas.absolutePan(
        new fabric.Point(
          canvasOffset.left - x + pageScroll.x,
          canvasOffset.top - y + pageScroll.y
        )
      );
    },

    highlight: function (idOrElement) {
      let object = (typeof idOrElement === 'string') ? this.getObjectById(idOrElement) : idOrElement
      if (!object) {
        return console.error('nothing found to highlight')
      }
      this._highlight(object)
    },

    _highlight: function (object) {
        if (object === this.activeShape) {
            return console.log('same same but different');
        }
        this.deselect();
        console.log('highlight', object);
        this.activeShape = object;
        object.borderColor = 'red';
        object.borderScaleFactor = 3;

        this._fabricCanvas.setActiveObject(object);
        this._fabricCanvas.renderAll();
    },

    markPoints: function (object) {
      this._fabricCanvas.calcOffset()
      if (object.type !== 'polygon') { return }

      const offset = object.pathOffset
      const center = object.getCenterPoint();
      const offsetCenter = { x: center.x - offset.x, y: center.y - offset.y }
      const ps = object.get('points')

      this.pointArray = ps
        .map(point => ({ x: offsetCenter.x + point.x, y: offsetCenter.y + point.y }))
        .map((point,index) => {
          return this._addPoint(point, {
            selectable: true,
            data: { type: 'pointHandle', index: index }
          })
        });

      this.pointArray.forEach(pointHandle => {
        this._fabricCanvas.add(pointHandle)
        pointHandle.bringToFront()
        pointHandle.on('mousedown', options => this._setState(options))
        pointHandle.on('moving', options => this._objectMove(options))
        pointHandle.on('mouseup', options => this._nextState(options))
      })

      this._fabricCanvas.renderAll()
    },

    deselect: function () {
      console.log('DESELECT activeShape?', this.activeShape)
      if (this.activeShape) {
        this.activeShape.set({
          selectable: true,
          hasBorders: true,
          objectCaching: true,
          evented: true,
          lockMovementX: false,
          lockMovementY: false
        })
      }
      this._notifyShapeSelected()
      this.reset()
    },

    getObjectById: function (id) {
      const result = this._fabricCanvas.getObjects().filter(function (o) {
        return o.id && o.id === id
      })
      return result[0];
    },

    reset: function () {
      console.log('RESET')
      this.activeShape = null;
      this.activeLine = null;
      this.pointArray.forEach(point => this._fabricCanvas.remove(point))
      this.pointArray = [];
      this.lineArray.forEach(line => this._fabricCanvas.remove(line));
      this.lineArray = [];
      this._fabricCanvas.discardActiveObject();
      this._fabricCanvas.renderAll();
    },

    remove: function () {
      const ao = this._fabricCanvas.getActiveObject();
      if(!ao) return;

      this._fabricCanvas.remove(ao);
      this._fabricCanvas.renderAll();
      this._canvas.dispatchEvent(new CustomEvent('shape-deleted', {
        composed: true, bubbles: true,
        detail: this.serializeObject(ao)}));
    },

    serializeObject: function (object) {
      if (!object) { return; }
      return {
        shape: {
          id: object.id,
          svg: object.toSVG(d => d)
        }
      }
    },

    importSVG: function (svg, attributes) {
      fabric.loadSVGFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
        objects => {
          objects.map(object => {
            const props = Object.assign({}, this.defaultStyle, attributes, this.getFillAndStroke(attributes))
            object.set(props)
            this._fabricCanvas.add(object)
          })
        }
      )
    },

    switchFillMode: function() {
      this.fillMode = !this.fillMode
      console.log('switchFillMode to', this.fillMode)
      this._fabricCanvas.forEachObject(object => {
        if (this._isPointHandle(object)) { return }
        console.log('fill and stroke', this.getFillAndStroke(object))
        object.set(this.getFillAndStroke(object))
      });
      this._fabricCanvas.renderAll()
    },

    editActiveShape: function () {
      if (!this.activeShape) { return console.warn('Switch to edit mode without active object') }
      // extra caution not to have a mixup with canvas.activeObject
      this._fabricCanvas.discardActiveObject()
      this.markPoints(this.activeShape)
      this._putObjectInEditMode(this.activeShape)
    },

    _putObjectInEditMode(object) {
      object.sendBackwards()
      object.set({
        lockMovementX: true,
        lockMovementY: true,
        objectCaching: false,
        selectable: false,
        hasBorders: false,
        hasControls: false,
        evented: false
      })
    },

    reimport: function (object) {
      let newObject
      fabric.loadSVGFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${object.toSVG(d => d)}</svg>`,
        objects => {
          newObject = objects[0]
          const props = Object.assign({}, this.defaultStyle, 
            { data: Object.assign({}, object.data) },
            this.getFillAndStroke(object)
          )
          newObject.set(props)
        }
      )
      return newObject
    },

    getFillAndStroke: function(object) {
      const color = object.data && object.data.label ? object.data.label.color : this.unassignedColor
      if (this.fillMode) {
        return {
          stroke: 'transparent',
          fill: color
        }  
      }
      return {
        stroke: color,
        fill: 'transparent'
      }
    },

    changeSelectedShapes: function (newData) {
      const object = this._fabricCanvas.getActiveObject()
      const currentData = object.data
      console.log('currentData', currentData)
      const mergedData = Object.assign({}, currentData, newData)
      console.log('mergedData', mergedData)
      object.set(mergedData)
      object.set(this.getFillAndStroke(object))
      this._fabricCanvas.renderAll()
    },

    _setState(options) {
      console.log('_setState', options.pointer)
      const pointer = this._fabricCanvas.getPointer(options.originalEvent);
      this._clickOrigin = pointer
      this._state = this.activeShape.get('points')
      console.log('_state', this._state)
    },

    _objectMove: function(options) {
      if (!this._isPointHandle(options.target)) { return }
      const pointer = this._fabricCanvas.getPointer(options.originalEvent);

      const dx = pointer.x - this._clickOrigin.x
      const dy = pointer.y - this._clickOrigin.y
      const i = options.target.data.index
      const points = this._state.concat([])
      const point = points[i]
      const newPoint = {
        x: point.x + dx,
        y: point.y + dy
      }
      points.splice(i, 1, newPoint)
      this.activeShape.set({ points: points });
      this.activeShape.setCoords();
      this._fabricCanvas.renderAll()
    },

    _nextState: function (options) {
      const clone = this.reimport(this.activeShape)
      this._fabricCanvas.remove(this.activeShape)
      this.activeShape = clone
      this._fabricCanvas.add(clone)
      this._notifyShapeChanged(this.activeShape)
      this._putObjectInEditMode(this.activeShape)
      this._fabricCanvas.renderAll()
    },

    _mouseDown: function(options) {
      const mode = this._annotator.mode
      const pointer = this._fabricCanvas.getPointer(options.originalEvent);

      switch (mode) {
        case this._annotator.modes.EDIT:
          // pointhandle selection
          if (this._isPointHandle(options.target)) {
            console.log('point', options.target)
            this.currentPointHandle = options.target
            this.pointArray.forEach(point => point.set({ fill: 'white' }))
            options.target.set({ fill: 'tomato' })
            this._fabricCanvas.renderAll()
            break
          }
          // clicking anywhere but on a point handle will end the edit mode
          this._annotator.mode = this._annotator.modes.SELECT
          break
        case this._annotator.modes.SELECT:
          if (options.target) {
            this._highlight(options.target); break
          }
          this.deselect()
          break
        case this._annotator.modes.RECTANGLE:
          this._fabricCanvas.on('mouse:move', this._boundMouseMoveListener)
          const rect = new fabric.Rect(Object.assign({}, this.defaultStyle, {
            left: pointer.x,
            top: pointer.y
          }));
          rect.set(this.getFillAndStroke(rect))
          this._fabricCanvas.add(rect);
          this.activeShape = rect;
          this._fabricCanvas.setActiveObject(rect);
          this._fabricCanvas.renderAll();
          break
        case this._annotator.modes.CIRCLE:
          this._fabricCanvas.on('mouse:move', this._boundMouseMoveListener)
          // TODO improve circle painting
          const circle = new fabric.Circle(Object.assign({}, this.defaultStyle, {
            left: pointer.x,
            top: pointer.y,
            selectionBackgroundColor: "transparent"
          }));
          circle.set(this.getFillAndStroke(circle))

          this._fabricCanvas.add(circle);
          this.activeShape = circle;
          this._fabricCanvas.setActiveObject(circle);
          this._fabricCanvas.renderAll();
          break
        case this._annotator.modes.POLYGON:
          if (
            !options.target || 
            this.pointArray.length === 0 ||
            options.target.id !== this.pointArray[0].id
          ) {
            // register event listener
            this._fabricCanvas.on('mouse:move', this._boundMouseMoveListener)
            this.addPointFromEvent(options);
            break;
          }

          // if the target id is the same as the first one created
          const polygon = this._generatePolygon();
          polygon.set(this.getFillAndStroke(polygon))
          this._fabricCanvas.add(polygon);
          this._highlight(polygon);
          this._notifyShapeCreated(polygon)
          // this._annotator.mode = this._annotator.modes.SELECT
          break;
      }
      return options
    },

    _mouseMove: function(options) {
      const mode = this._annotator.mode

      if (!(this.activeShape || this.activeLine)) { return }

      const pointer = this._fabricCanvas.getPointer(options.originalEvent);
      switch (mode) {
        case this._annotator.modes.RECTANGLE:
          this.activeShape.set("width", pointer.x - this.activeShape.get("left"));
          this.activeShape.set("height", pointer.y - this.activeShape.get("top"));
          this.activeShape.setCoords()
          this._fabricCanvas.renderAll();
          break
        case this._annotator.modes.CIRCLE:
          this.activeShape.set("radius", Math.abs(pointer.x - this.activeShape.get("left")));
          this._fabricCanvas.renderAll();
          break
        case this._annotator.modes.POLYGON:
          if (!this.activeLine || this.activeLine.class != "line") { break }

          this.activeLine.set({ x2: pointer.x, y2: pointer.y });
          let points = this.activeShape.get("points");
          // add current position to polygon points
          points[this.pointArray.length] = { x: pointer.x, y: pointer.y };
          this.activeShape.set({ points: points });
          this.activeShape.setCoords()
          this._fabricCanvas.renderAll();
          break
      }
    },

    _mouseUp: function(options) {
      const mode = this._annotator.mode;

      switch(mode) {
        case this._annotator.modes.EDIT: /* all handled in _nextstate */ break
        case this._annotator.modes.SELECT:
          this._notifyShapeChanged(this.activeShape)
          break
        case this._annotator.modes.RECTANGLE:
          this._fabricCanvas.off('mouse:move', this._boundMouseMoveListener)
          const rect = this.activeShape
          const points = [
            { x: rect.left, y: rect.top },
            { x: rect.left + rect.width, y: rect.top },
            { x: rect.left + rect.width, y: rect.top + rect.height },
            { x: rect.left, y: rect.top + rect.height }
          ]

          this._fabricCanvas.discardActiveObject()
          this._fabricCanvas.remove(this.activeShape)
          this._fabricCanvas.renderAll()

          const poly = new fabric.Polygon(points, Object.assign({}, this.defaultStyle))
          const reimport = this.reimport(poly)
          reimport.id = this._getShapeId()
          this._fabricCanvas.add(reimport)
          this._highlight(reimport)
          this.activeShape.set(this.getFillAndStroke(this.activeShape))
          this._notifyShapeCreated(reimport)
          // this._annotator.mode = this._annotator.modes.SELECT
          break
        case this._annotator.modes.CIRCLE:
          this._fabricCanvas.off('mouse:move', this._boundMouseMoveListener)
          // circle is special
          this.activeShape.set("hasBorders", true);
          // this.activeShape.set("hasControls", false);
          this.activeShape.setCoords();
          this.activeShape.id = this._getShapeId()
          this._highlight(this.activeShape)
          this.activeShape.set(this.getFillAndStroke(this.activeShape))
          this._notifyShapeCreated(this.activeShape)
          // this._annotator.mode = this._annotator.modes.SELECT
          break;
        case this._annotator.modes.POLYGON:
          this._fabricCanvas.off('mouse:move', this._boundMouseMoveListener)
          break
      }
      if (!this.activeShape) { return }
    },

    addPointFromEvent: function (options) {
      const pointer = this._fabricCanvas.getPointer(options.originalEvent);
      // first point marker is special
      const attributes = this.pointArray.length === 0 ? { fill: 'tomato' } : null
      const circle = this._addPoint(pointer, attributes)
      this.pointArray.push(circle);

      // start a new line with length zero
      const newLinePoints = [
        pointer.x, pointer.y,
        pointer.x, pointer.y,
      ];
      this.line = new fabric.Line(newLinePoints, this.lineStyle);
      this.lineArray.push(this.line);

      // draw new intermediate polygon
      const activeShape = this.activeShape
      const polyPoints = activeShape ? activeShape.get('points') : []

      polyPoints.push({ x: pointer.x, y: pointer.y })
      const polygon = new fabric.Polygon(polyPoints, this.polyPointStyle);

      // render changes to fabric canvas
      if (activeShape) {
        this._fabricCanvas.discardActiveObject()
        this._fabricCanvas.remove(activeShape);
      }
      this._fabricCanvas.renderAll()

      this._fabricCanvas.add(polygon);
      polygon.setCoords()
      this._fabricCanvas.add(this.line);
      this._fabricCanvas.add(circle);
      this._fabricCanvas.setActiveObject(polygon);

      // set inner overlay state
      this.activeShape = polygon;
      this.activeLine = this.line;
    },

    _addPoint: function (pointer, attributes) {
      // new point marker
      return new fabric.Circle(Object.assign({}, this.pointStyle, {
          left: pointer.x,
          top: pointer.y,
          id: 'p-' + Date.now() + Math.floor(Math.random() * 11)
      }, attributes));
    },

    _isPointHandle (object) {
      return (object && object.data && object.data.type === 'pointHandle')
    },

    _generatePolygon: function () {
      const points = this.activeShape.get('points')
      // the last point that was needs to be removed
      const pointsMinusLast = points.slice(0, points.length-1)

      //cleanup
      this._fabricCanvas.remove(this.activeShape).remove(this.activeLine);
      this._fabricCanvas.renderAll()

      // reset
      this.pointArray.forEach(point => this._fabricCanvas.remove(point));
      this.pointArray = [];
      this.lineArray.forEach(line => this._fabricCanvas.remove(line));
      this.lineArray = [];
      this.line = null;
      this.activeLine = null;

      console.log('numer of points', pointsMinusLast.length)
      const polygon = new fabric.Polygon(pointsMinusLast, this.defaultStyle);
      polygon.id = this._getShapeId()
      return this.reimport(polygon)
    },

    _notifyShapeCreated: function (object) {
      const detail = this.serializeObject(object)
      const event = new CustomEvent('shape-created', {composed:true, bubbles: true, detail: detail})
      this._canvas.dispatchEvent(event);
    },

    _notifyShapeChanged: function (object) {
      if (!object) { return }
      const detail = this.serializeObject(object)
      const event = new CustomEvent('shape-changed', {composed: true, bubbles: true, detail: detail})
      this._canvas.dispatchEvent(event);
    },

    _notifyShapeSelected: function (options) {
      if (!options) { return this._notifyEmptySelection(); }
      const detail = this.serializeObject(options.target);
      const event = new CustomEvent('shape-selected', {composed: true, bubbles: true, detail: detail})
      this._canvas.dispatchEvent(event);
    },

    _notifyEmptySelection: function (options) {
      this._canvas.dispatchEvent(new CustomEvent('shape-selected', {composed: true, bubbles: true, detail: {shape: null}}));
    },

    _getShapeId: function () {
      return 's-' + Date.now() + Math.floor(Math.random() * 11)
    }
  };
})();
