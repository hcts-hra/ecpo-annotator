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

    // this._id='osd-overlaycanvas-'+counter();
    this._id = "fabric";
    this._canvas.setAttribute("id", this._id);
    this._canvasdiv.appendChild(this._canvas);
    this.resize();
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

    this._fabricCanvas.on('mouse:down', function (options) {
      // console.log('fabric', 'mouse:down', options)
      // console.log('fabric', 'mouse:down', options.e)
      
      if (this.captureEvent(options)) {
        options.e.preventDefaultAction = true;
        options.e.preventDefault();
        options.e.stopPropagation();
        return this._mouseDown(options)
      }
      // zoom per click
      console.log('fabric', 'default OSD action: zoomPerClick')
      this._viewer.viewport.zoomBy(this._viewer.zoomPerClick);
      this._viewer.viewport.applyConstraints();
    }.bind(this))

    this._fabricCanvas.on('mouse:up', this._mouseUp.bind(this))
    this._fabricCanvas.on('mouse:move', this._mouseMove.bind(this))

  };

  // ----------
  Overlay.prototype = {
    modes: ['rectangle', 'circle', 'polygon', 'remove', 'select'],
    defaultStyle: {
      stroke:'blue',
      strokeWidth: 2,
      fill: 'transparent',
      opacity: 0.5,
      hasBorders: true,
      hasControls: true
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
    resizecanvas: function() {
      const origin = new OpenSeadragon.Point(0, 0);
      const viewportZoom = this._viewer.viewport.getZoom(true);
      this._fabricCanvas.setWidth(this._containerWidth);
      this._fabricCanvas.setHeight(this._containerHeight);
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
    captureEvent: function (options) {
      return (options.target || this.modes.indexOf(this._annotator.mode) >= 0)
    },
    highlight: function (idOrElement) {
      let object = (typeof idOrElement === 'string') ? this.getObjectById(idOrElement) : idOrElement

      if (!object) {
        return console.error('nothing found to highlight')
      }
      this.deselect()
      object.set({stroke: 'tomato'})
      console.log('highlight', object)
      this.activeShape = object
      this._fabricCanvas.setActiveObject(object)
      this._fabricCanvas.renderAll()
    },
    deselect: function () {
      if (this.activeShape == null) { return }
      this.activeShape.set({stroke: 'blue'})
      this.activeShape = null;
      this._fabricCanvas.renderAll()
    },
    getObjectById: function (id) {
      const result = this._fabricCanvas.getObjects().filter(function (o) {
        return o.id && o.id === id
      })
      return result[0];
    },
    reset: function () {
      this.pointArray = [];
      this.lineArray = [];
      this.activeShape = null;
      this.activeLine = null;
      this._fabricCanvas.discardActiveObject();
      this._fabricCanvas.renderAll();
    },
    remove: function () {
      const ao = this._fabricCanvas.getActiveObject()
      const json = ao.toJSON(['id', 'data'])
      this._fabricCanvas.remove(ao);
      this._fabricCanvas.renderAll();
      this._canvas.dispatchEvent(new CustomEvent('shape-deleted', {composed: true, bubbles: true, detail: {shape: json}}));
    },
    serialize: function () {
      console.log('all objects ', this._fabricCanvas.getObjects());
      console.log('_logShapes canvas ', this._fabricCanvas.toJSON('data'));
      return this._fabricCanvas.toJSON(['id','data'])
    },
    load: function (json) {
      this._fabricCanvas.loadFromJSON(json)
    },

    _mouseDown: function(options) {
      const mode = this._annotator.mode
      const pointer = this._fabricCanvas.getPointer(options.originalEvent);

      // selection
      if (options.target && mode === 'osd') {
        // if (this._fabricCanvas.getActiveObject() === options.target) {
        //   return
        // }
        return this.highlight(options.target);
      }

      console.log("active object ", this._fabricCanvas.getActiveObject());
      // this._annotator.viewer.setMouseNavEnabled(this._fabricCanvas.getActiveObject())

      switch (mode) {
        case "rectangle":
          const rect = new fabric.Rect(Object.assign({}, this.defaultStyle, {
            left: pointer.x,
            top: pointer.y
          }));

          this._fabricCanvas.add(rect);
          this._fabricCanvas.setActiveObject(rect);
          this._fabricCanvas.renderAll();
          this.activeShape = rect;
          break
        case "circle":
          // TODO improve circle painting
          const circle = new fabric.Circle(Object.assign({}, this.defaultStyle, {
            left: pointer.x,
            top: pointer.y,
            selectionBackgroundColor: "transparent"
          }));

          this._fabricCanvas.add(circle);
          this._fabricCanvas.setActiveObject(circle);
          this._fabricCanvas.renderAll();
          this.activeShape = circle;
          break
        case "polygon":
          // if the target id is the same as the first one created
          if (options.target && this.pointArray.length && options.target.id === this.pointArray[0].id) {
            this._generatePolygon();
            this._fabricCanvas.selection = true;
            this._annotator.mode = 'osd'
            break;
          }
          this._fabricCanvas.selection = false;
          this._addPoint(options);
          break
        // default: 
        //   console.warn('_mouseUp called with unknown mode', options);
      }
      return options
    },

    _mouseMove: function(options) {
      const mode = this._annotator.mode

      if (!(this.activeShape || this.activeLine)) { return }

      const pointer = this._fabricCanvas.getPointer(options.originalEvent);
      switch (mode) {
        case "rectangle":
          this.activeShape.set("width", pointer.x - this.activeShape.get("left"));
          this.activeShape.set("height", pointer.y - this.activeShape.get("top"));
          break
        case "circle":
          this.activeShape.set("radius", Math.abs(pointer.x - this.activeShape.get("left")));
          break
        case "polygon":
          if (!this.activeLine || this.activeLine.class != "line") { break }

          this.activeLine.set({ x2: pointer.x, y2: pointer.y });
          let points = this.activeShape.get("points");
          // set last point of shape to current position
          points[this.pointArray.length] = { x: pointer.x, y: pointer.y };
          this.activeShape.set({ points: points });
          break
        // default: 
        //   console.warn('_mouseMove called with unknown mode', options);
      }
      this._fabricCanvas.renderAll();
    },

    _mouseUp: function(options) {
      const mode = this._annotator.mode;

      switch(mode) {
        case 'rectangle':
        case 'circle':
          this.activeShape.set("hasBorders", true);
          this.activeShape.set("hasControls", true);
          this.activeShape.setCoords();
          this.activeShape.id = this._getShapeId()
          this.highlight(this.activeShape)
          this._notifyShapeCreated(this.activeShape)
          this._annotator.mode = 'osd'
        break;
        case 'osd': this._notifyShapeChanged(options.target)
        break
        default:
          console.warn('_mouseUp called with unknown mode', options);
      }
    },

    _addPoint: function (options) {
      const pointer = this._fabricCanvas.getPointer(options.originalEvent);

      // new point marker
      const circle = new fabric.Circle(Object.assign({}, this.pointStyle, {
          left: pointer.x,
          top: pointer.y,
          id: 'p-' + Date.now() + Math.floor(Math.random() * 11),
      }));
      // first point marker is special
      if (this.pointArray.length === 0) {
          circle.set({ fill: 'tomato' })
      }

      // start a new line with length zero
      const newLinePoints = [
        pointer.x, pointer.y,
        pointer.x, pointer.y,
      ];
      this.line = new fabric.Line(newLinePoints, this.lineStyle);

      // draw new intermediate polygon
      const activeShape = this.activeShape
      const polyPoints = activeShape ? activeShape.get('points') : []

      polyPoints.push({ x: pointer.x, y: pointer.y })
      const polygon = new fabric.Polygon(polyPoints, {
        stroke:'#336',
        strokeWidth: 2,
        fill: '#aaf',
        opacity: 0.3,
        selectable: false,
        hasBorders: false,
        hasControls: false,
        evented: false,
        objectCaching: false
      });

      // render changes to fabric canvas
      if (activeShape) {
        this._fabricCanvas.remove(activeShape);
      }
      this._fabricCanvas.add(polygon);
      this._fabricCanvas.add(this.line);
      this._fabricCanvas.add(circle);
      this._fabricCanvas.renderAll();
      this._fabricCanvas.setActiveObject(polygon);

      // set inner overlay state
      this.activeShape = polygon;
      this.activeLine = this.line;
      this.pointArray.push(circle);
      this.lineArray.push(this.line);
    },

    _generatePolygon: function () {
      const points = this.pointArray.map(point => ({ x: point.left, y: point.top }));

      this.pointArray.forEach(point => this._fabricCanvas.remove(point));
      this.lineArray.forEach(line => this._fabricCanvas.remove(line));
      this._fabricCanvas.remove(this.activeShape).remove(this.activeLine);

      const polygon = new fabric.Polygon(points, this.defaultStyle);
      this._fabricCanvas.add(polygon);
      polygon.id = this._getShapeId()
      this.highlight(polygon);
      this._notifyShapeCreated(polygon)

      this.line = null;
      this.activeLine = null;

      this.pointArray = [];
      this.lineArray = [];
    },

    _notifyShapeCreated: function (object) {
      const detail = {shape: object.toJSON(['id', 'data'])}
      const event = new CustomEvent('shape-created', {composed:true, bubbles: true, detail: detail})
      this._canvas.dispatchEvent(event);
    },

    _notifyShapeChanged: function (object) {
      if (!object) { return }
      const detail = {shape: object.toJSON(['id', 'data'])}
      const event = new CustomEvent('shape-changed', {composed: true, bubbles: true, detail: detail})
      this._canvas.dispatchEvent(event);
    },

    _getShapeId () {
      return 's-' + Date.now() + Math.floor(Math.random() * 11)
    }
  };
})();
