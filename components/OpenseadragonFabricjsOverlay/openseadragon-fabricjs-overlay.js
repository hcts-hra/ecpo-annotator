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
    // this.resize();
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
    captureEvent: function (options) {
      return (options.target || this.modes.indexOf(this._annotator.mode) >= 0)
    },
    highlight: function (idOrElement) {
      let object = (typeof idOrElement === 'string') ? this.getObjectById(idOrElement) : idOrElement
      if (!object) {
        return console.error('nothing found to highlight')
      }
      this._highlight(object)
    },
    _highlight: function (object) {
      if (object === this.activeShape) { return console.log('same same but different') }
      this.deselect()
      object.set({stroke: 'tomato'})
      console.log('highlight', object)
      this.activeShape = object
      this._fabricCanvas.setActiveObject(object)
      // object.bringToFront()

      this._fabricCanvas.renderAll()
    },
    markPoints: function (object) {
      this._fabricCanvas.calcOffset()
      if (object.type !== 'polygon') { return }
      object.setCoords()
      const center = object.getCenterPoint();
      // const centerPoint = this._addPoint(center, {
      //   data: { type: 'pointHandle'},
      //   fill: 'pink'
      // })
      // this._fabricCanvas.add(centerPoint);
      // const tlPoint = this._addPoint({x:object.left, y:object.top}, {
      //   data: { type: 'pointHandle' },
      //   fill: 'yellow'
      // })
      // this._fabricCanvas.add(tlPoint);

      object.hasControls = false

      const t = object.calcTransformMatrix() 
      // sometimes points are relative to center and sometimes not
      console.log('center', center);
      console.log('object', object);
      console.log('transform', t);
      console.log('getCoords', object.getCoords());

      // object.getCoords()
      // // .map(point => fabric.util.transformPoint(point, t, false))
      // .map((point,index) => {
      //   console.log('new point', point);

      //   return this._addPoint(point, {
      //     data: { type: 'pointHandle', index: index },
      //     fill: 'green'
      //   })
      // })
      // .forEach(c => this._fabricCanvas.add(c));

      let ps = object.get('points')

      console.log(object.pathOffset)
      if (object.pathOffset.x > 0) {
      }
      else {
        // ps = ps.map(point => ({x: center.x + point.x, y: center.y + point.y}))
        ps = ps.map(point => fabric.util.transformPoint(point, t, false))
      }

      this.pointArray = ps.map((point,index) => {
          console.log('new point', point);
          return this._addPoint(point, {
            data: { type: 'pointHandle', index: index }
          })
        });
      
      this.pointArray.forEach(c => {
        this._fabricCanvas.add(c)
      })
      this._fabricCanvas.renderAll()

      // object.sendBackwards()

      this.pointArray.forEach(c => {
        console.log('ktfkytf', c)
        c.bringToFront()
      })
      this._fabricCanvas.renderAll()

      console.log('pointArray', this.pointArray);
    },
    deselect: function () {
      console.log('DESELECT')
      if (this.activeShape) { 
        this.activeShape.set({stroke: 'blue'})
      }
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
      this.pointArray.forEach(point => this._fabricCanvas.remove(point))
      this.pointArray = [];
      this.lineArray.forEach(line => this._fabricCanvas.remove(line));
      this.lineArray = [];
      this.activeShape = null;
      this.activeLine = null;
      this._fabricCanvas.discardActiveObject();
      this._fabricCanvas.renderAll();
    },
    remove: function () {
      const ao = this._fabricCanvas.getActiveObject()
      this._fabricCanvas.remove(ao);
      this._fabricCanvas.renderAll();
      this._canvas.dispatchEvent(new CustomEvent('shape-deleted', {
        composed: true, bubbles: true, 
        detail: this.serializeObject(ao)}));
    },
    serialize: function () {
      console.log('all objects ', this._fabricCanvas.getObjects());
      console.log('_logShapes canvas ', this._fabricCanvas.toJSON('data'));
      return this._fabricCanvas.toJSON(['id','data'])
    },
    serializeObject: function (object) {
      console.log('serialize', object)
      return {
        shape: {
          id: object.id,
          svg: object.toSVG(d => d)
        }
      }
    },
    load: function (json) {
      this._fabricCanvas.loadFromJSON(json)
    },
    addShapes: function (shapes) {
      shapes.forEach(shape => {
        console.log('shhh... APE!', shape)

        fabric.loadSVGFromString(
          `<svg xmlns="http://www.w3.org/2000/svg">${shape}</svg>`, 
          objects => {
            console.log('loadedfromSVGString', objects)
            objects.map(o => this._fabricCanvas.add(o))
          }
        )
      })
    },

    foooo: function (svg) {
      let newObject
      fabric.loadSVGFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`, 
        objects => {
          newObject = objects[0]
          this._fabricCanvas.add(newObject)
        }
      )
      return newObject
    },

    _mouseDown: function(options) {
      const mode = this._annotator.mode
      const pointer = this._fabricCanvas.getPointer(options.originalEvent);


      switch (mode) {
        case 'edit':
          // pointhandle selection
          if (options.target && options.target.data && options.target.data.type === 'pointHandle') { 
            console.log('point', options.target)
            this.currentPointHandle = options.target
            this.pointArray.forEach(point => point.set({ fill: 'white' }))
            options.target.set({ fill: 'tomato' })
            this._fabricCanvas.renderAll()
            break
          }
        case 'osd':
          if (options.target) {
            // if (this._fabricCanvas.getActiveObject() === options.target) {
            //   return
            // }
            this._highlight(options.target);
            break
          }
          console.log('i have no other option')
          this.deselect()
        break
        case "rectangle":
          const rect = new fabric.Rect(Object.assign({}, this.defaultStyle, {
            left: pointer.x,
            top: pointer.y
          }));

          this._fabricCanvas.add(rect);
          this.activeShape = rect;
          this._fabricCanvas.setActiveObject(rect);
          this._fabricCanvas.renderAll();
          break
        case "circle":
          // TODO improve circle painting
          const circle = new fabric.Circle(Object.assign({}, this.defaultStyle, {
            left: pointer.x,
            top: pointer.y,
            selectionBackgroundColor: "transparent"
          }));

          this._fabricCanvas.add(circle);
          this.activeShape = circle;
          this._fabricCanvas.setActiveObject(circle);
          this._fabricCanvas.renderAll();
          break
        case "polygon":
          // if the target id is the same as the first one created
          if (options.target && this.pointArray.length && options.target.id === this.pointArray[0].id) {
            const polygon = this._generatePolygon();
            this._fabricCanvas.add(polygon);
            this._highlight(polygon);
            this._notifyShapeCreated(polygon)
            // this.activeShape = polygon;
            this._fabricCanvas.selection = true;
            this._annotator.mode = 'osd'
            break;
          }
          this._fabricCanvas.selection = false;
          this.addPointFromEvent(options);
          break
        // default:
        //   console.warn('_mouseUp called with unknown mode', options);
      }
      return options
    },

    _mouseMove: function(options) {
      const mode = this._annotator.mode

      if (options.transform) {
          console.log('TRANSFORM')
          // console.log(dx, dy)
          const dx = options.e.movementX / this.getZoom()
          const dy = options.e.movementY / this.getZoom()
          console.log(this.pointArray)
          this.pointArray.forEach(point => {
            const l = point.left
            const t = point.top
            console.log(l)
            console.log(t)
            point.set({ left: l + dx })
            point.set({ top: t + dy })
            console.log(point.left)
            console.log(point.top)
          })
          this._fabricCanvas.renderAll();
          // console.log('END TRANSFORM')
          return 
      }

      if (!(this.activeShape || this.activeLine)) { return }

      const pointer = this._fabricCanvas.getPointer(options.originalEvent);
      switch (mode) {
        case "rectangle":
          this.activeShape.set("width", pointer.x - this.activeShape.get("left"));
          this.activeShape.set("height", pointer.y - this.activeShape.get("top"));
          this.activeShape.setCoords()
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
          this.activeShape.setCoords()
          break
        //   console.warn('_mouseMove called with unknown mode', options);
      }
      this._fabricCanvas.renderAll();
    },

    _mouseUp: function(options) {
      const mode = this._annotator.mode;

      switch(mode) {
        case 'rectangle':
          // this._fabricCanvas.discardActiveObject()
          this.activeShape.setCoords();
          const rect = this.activeShape
          const points = [
            {x:rect.left, y: rect.top },
            {x:rect.left + rect.width, y: rect.top },
            {x:rect.left + rect.width, y: rect.top  + rect.height },
            {x:rect.left, y: rect.top  + rect.height }
          ]
          this._fabricCanvas.remove(rect)
          const poly = new fabric.Polygon(points, this.defaultStyle)
          poly.id = this._getShapeId()
          const reimport = this.foooo(poly.toSVG())
          this._fabricCanvas.add(reimport)
          this._highlight(reimport)
          this._notifyShapeCreated(reimport)
          this.activeShape = reimport
          this._annotator.mode = 'osd'
          break
        case 'circle':
          // circle is special
          this.activeShape.set("hasBorders", true);
          this.activeShape.set("hasControls", true);
          this.activeShape.setCoords();
          this.activeShape.id = this._getShapeId()
          this._highlight(this.activeShape)
          this._notifyShapeCreated(this.activeShape)
          this._annotator.mode = 'osd'
        break;
        case 'osd': this._notifyShapeChanged(options.target)
        break
        default:
          console.warn('_mouseUp called with unknown mode', options);
      }
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
      polygon.setCoords()
      this._fabricCanvas.add(this.line);
      this._fabricCanvas.add(circle);
      this._fabricCanvas.setActiveObject(polygon);
      console.log('addPointFromEvent CENTER', polygon.getCenterPoint())

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

    _generatePolygon: function () {
      const points = this.activeShape.get('points')
      const polygon = new fabric.Polygon(points, this.defaultStyle);
      polygon.id = this._getShapeId()
      const reimport = this.foooo(polygon.toSVG())

      this.pointArray.forEach(point => this._fabricCanvas.remove(point));
      this.lineArray.forEach(line => this._fabricCanvas.remove(line));
      this._fabricCanvas.remove(this.activeShape).remove(this.activeLine);


      // reset
      this.line = null;
      this.activeLine = null;

      this.pointArray = [];
      this.lineArray = [];
      return reimport
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

    _getShapeId () {
      return 's-' + Date.now() + Math.floor(Math.random() * 11)
    }
  };
})();
