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
    console.log("fabricjsOverlay options ", options);
    console.log("fabricjsOverlay options ", options.iviewer);
    this._fabricjsOverlayInfo = new Overlay(this);
    this._fabricjsOverlayInfo._scale = options.scale || 1000;
    this._fabricjsOverlayInfo._annotator = options.annotator;

    console.log("fabricjsOverlayInfo ", this._fabricjsOverlayInfo);

    return this._fabricjsOverlayInfo;
  };
  // static counter for multiple overlays differentiation
  var counter = (function() {
    var i = 1;

    return function() {
      return i++;
    };
  })();
  // ----------
  var Overlay = function(viewer) {
    var self = this;

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

    this._viewer.addHandler("update-viewport", function() {
      self.resize();
      self.resizecanvas();
    });

    this._viewer.addHandler("open", function() {
      self.resize();
      self.resizecanvas();
    });

    this._tracker = new OpenSeadragon.MouseTracker({
        element: this._viewer.canvas,
        pressHandler: this._mouseDown.bind(this),
        dragHandler: this._mouseMove.bind(this),
        releaseHandler: this._mouseUp.bind(this),
    })

  };

  // ----------
  Overlay.prototype = {
    modes: ['rectangle', 'circle', 'polygon'],
    // ----------
    canvas: function() {
      return this._canvas;
    },
    fabricCanvas: function() {
      return this._fabricCanvas;
    },
    // ----------
    clear: function() {
      this._fabricCanvas.clearAll();
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
      const viewportWindowPoint = this._viewer.viewport.viewportToWindowCoordinates(
        origin
      );
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
    reset: function () {
      this.pointArray = [];
      this.lineArray = [];
      this.activeShape = null;
      this.activeLine = null;
    },
    track: function (mode) {
      const doTrack = this.modes.indexOf(mode) >= 0
      this._tracker.setTracking(doTrack)
    },

    _mouseDown: function(options) {
      const mode = this._annotator.mode
      const pointer = this._fabricCanvas.getPointer(options.originalEvent);
      const defaultStyle = {
        fill: "transparent",
        stroke: "blue",
        strokeWidth: 2,
        hasBorders: false,
        hasControls: false
      }

      switch (mode) {
        case "rectangle":
          const rect = new fabric.Rect(Object.assign({}, defaultStyle, {
            left: pointer.x,
            top: pointer.y
          }));

          this._fabricCanvas.add(rect);
          this._fabricCanvas.setActiveObject(rect);
          this._fabricCanvas.renderAll();
          this.activeShape = rect;
          break
        case "circle":
          const circle = new fabric.Circle(Object.assign({}, defaultStyle, {
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
          if (options.target && options.target.id == this.pointArray[0].id) {
            this._generatePolygon();
            this.line = null;
            this.activeLine = null;
            break;
          }
          this._addPoint(options);
          break
        default: 
          console.warn('_mouseUp called with unknown mode', options);
      }
      return options
    },

    _mouseMove: function(options) {
      console.log('mouse move', options)
      const mode = this._annotator.mode

      if (!(this.activeShape || this.activeLine)) { return console.warn('NO ACTIVE SHAPE'); }

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
        default: 
          console.warn('_mouseMove called with unknown mode', options);
      }
      this._fabricCanvas.renderAll();
    },

    _mouseUp: function(options) {
      const mode = this._annotator.mode;
      console.log("mouseUp", mode);

      console.log("this.activeShape", this.activeShape);

      switch(mode) {
        case 'rectangle':
          this.activeShape.set("hasBorders", true);
          this.activeShape.set("hasControls", true);
          this.activeShape.setCoords();
        break;
        case 'circle': 
          this.activeShape.set("hasBorders", true);
          this.activeShape.set("hasControls", true);
          this.activeShape.setCoords();
        break;
        default: 
          console.warn('_mouseUp called with unknown mode', options);
      }
    }
  };
})();
