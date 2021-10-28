/**
 * OpenSeadragon canvas Overlay plugin 0.0.1 based on svg overlay plugin.
 *
 * Connection code to hook Fabricjs to OpenSeaDragon. Establishes a canvas that is resized with OSD canvas and
 * allows drawing of shapes.
 */

(function() {
  if (!window.OpenSeadragon) {
    console.error("[openseadragon-canvas-overlay] requires OpenSeadragon");
    return;
  }

  /**
   * Array of colors to be used for grouping. When a new group is started this array is used to select a new color
   * each time.
   *
   * @type {string[]}
   */
  const colors = [
    "#e67c73","#db4437","#c53929","#7baaf7","#4285f4","#3367d6","#57bb8a","#0f9d58","#0b8043","#f7cb4d","#f4b400","#f09300","#f44336","#e53935","#d32f2f","#c62828","#b71c1c","#ff8a80","#ff5252","#ff1744","#d50000","#e91e63","#d81b60","#c2185b","#ad1457","#880e4f","#ff80ab","#ff4081","#f50057","#c51162","#ce93d8","#ba68c8","#ab47bc","#9c27b0","#8e24aa","#7b1fa2","#6a1b9a","#4a148c","#ea80fc","#e040fb","#d500f9","#aa00ff","#b39ddb","#9575cd","#7e57c2","#673ab7","#5e35b1","#512da8","#4527a0","#311b92","#b388ff","#7c4dff","#651fff","#6200ea","#9fa8da","#7986cb","#5c6bc0","#3f51b5","#3949ab","#303f9f","#283593","#1a237e","#8c9eff","#536dfe","#3d5afe","#304ffe","#90caf9","#64b5f6","#42a5f5","#2196f3","#1e88e5","#1976d2","#1565c0","#0d47a1","#82b1ff","#448aff","#2979ff","#2962ff","#b3e5fc","#81d4fa","#4fc3f7","#29b6f6","#03a9f4","#039be5","#0288d1","#0277bd","#01579b","#80d8ff","#40c4ff","#00b0ff","#0091ea","#b2ebf2","#80deea","#4dd0e1","#26c6da","#00bcd4","#00acc1","#0097a7","#00838f","#006064","#84ffff","#18ffff","#00e5ff","#00b8d4","#b2dfdb","#80cbc4","#4db6ac","#26a69a","#009688","#00897b","#00796b","#00695c","#004d40","#a7ffeb","#64ffda","#1de9b6","#00bfa5","#c8e6c9","#a5d6a7","#81c784","#66bb6a","#4caf50","#43a047","#388e3c","#2e7d32","#1b5e20","#b9f6ca","#69f0ae","#00e676","#00c853","#dcedc8","#c5e1a5","#aed581","#9ccc65","#8bc34a","#7cb342","#689f38","#558b2f","#33691e","#ccff90","#b2ff59","#76ff03","#64dd17","#f0f4c3","#e6ee9c","#dce775","#d4e157","#cddc39","#c0ca33","#afb42b","#9e9d24","#827717","#f4ff81","#eeff41","#c6ff00","#aeea00","#fff176","#ffee58","#ffeb3b","#fdd835","#fbc02d","#f9a825","#f57f17","#ffff00","#ffea00","#ffd600","#ffe082","#ffd54f","#ffca28","#ffc107","#ffb300","#ffa000","#ff8f00","#ff6f00","#ffe57f","#ffd740","#ffc400","#ffab00","#ffcc80","#ffb74d","#ffa726","#ff9800","#fb8c00","#f57c00","#ef6c00","#e65100","#ffd180","#ffab40","#ff9100","#ff6500","#ffab91","#ff8a65","#ff7043","#ff5722","#f4511e","#e64a19","#d84315","#bf360c","#ff9e80","#ff6e40","#ff3d00","#dd2c00","#d7ccc8","#bcaaa4","#a1887f","#8d6e63","#795548","#6d4c41","#5d4037","#4e342e","#3e2723","#bdbdbd","#9e9e9e","#757575","#616161","#424242","#212121","#cfd8dc","#b0bec5","#90a4ae","#78909c","#607d8b","#546e7a","#455a64","#37474f","#263238"    
  ]
  /**
   * Configuration for this class.
   *
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

  /**
   * constructor. Takes the OSD instance as parameter. Sets up eventlisteners to react to OSD as well as to Fabricjs
   * events.
   *
   * @param viewer - the OSD instance created by `existdb-image-annotator'
   * @constructor
   */
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

    this.groups = [];

    this._viewer.addHandler('animation', _ => {
      this.resize();
      this._fabricCanvas.renderAll();
    });

    this._viewer.addHandler("update-viewport", _ => {
      this.resize();
      this.resizecanvas();
    });

    this._viewer.addHandler("open", _ => {
      this.resize();
      this.resizecanvas();
    });

    this._fabricCanvas.on('mouse:down', this._mouseDown.bind(this))
    this._fabricCanvas.on('mouse:up', this._mouseUp.bind(this))
    // this._fabricCanvas.on('selection:created', options => console.log('selection:created', options))
    // this._notifyShapeSelected.bind(this))
    // this will be dynamically registered
    this._boundMouseMoveListener = this._mouseMove.bind(this)
  };

  // ----------
  Overlay.prototype = {
    // modes: ['rectangle', 'circle', 'polygon', 'remove', 'select'],
    unassignedColor: 'grey',
    currentHue: 0,
    defaultStyle: {
      strokeWidth: 1,
      opacity: 0.6,
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
      radius: 35,
      fill: 'transparent',
      stroke: '#336',
      strokeWidth: 5,
      selectable: false,
      hasBorders: false,
      hasControls: false,
      originX: 'center',
      originY: 'center',
      objectCaching: false
    },
    lineStyle: {
      strokeWidth: 5,
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
      radius: 35,
      stroke:'#336',
      strokeWidth: 5,
      fill: 'transparent',
      selectable: false,
      hasBorders: false,
      hasControls: false,
      evented: false,
      objectCaching: false
    },
    /**
     * getter for raw canvas that is used by fabricjs
     * @returns {HTMLCanvasElement}
     */
    canvas: function() {
      return this._canvas;
    },

    /**
     * getter for facbric canvas object.
     *
     * @returns {fabric.Canvas}
     */
    fabricCanvas: function() {
      return this._fabricCanvas;
    },
    /**
     * remove all objects from fabric canvas
     */
    clear: function() {
      this._fabricCanvas.clear();
    },
    /**
     * called to resize the raw canvas to match the OSD dimensions
     */
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

    /**
     * get the zoom factor of the OSD viewer
     *
     * @returns {number}
     */
    getZoom: function () {
      const viewportZoom = this._viewer.viewport.getZoom(true);
      return (this._viewer.viewport._containerInnerSize.x * viewportZoom) / this._scale;
    },

    /**
     * called to resize the fabricjs canvas to match with OSD.
     */
    resizecanvas: function() {
      // TODO: use image top left instead of OSD top left as origin?
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
      // set borderScaleFactor for all shapes

    },

    /**
     * highlight a shape when selecting it.
     *
     * @param idOrElement
     */
    highlight: function (idOrElement) {
      let object = (typeof idOrElement === 'string') ? this.getObjectById(idOrElement) : idOrElement
      if (!object) {
        return console.error('nothing found to highlight')
      }
      this._highlight(object)
    },

    _highlight: function (object) {
      console.log('highlight');
      if (object !== this.activeShape) {
        console.log("new object", object);
        this.activeShape = object;
      }
      this._fabricCanvas.setActiveObject(this.activeShape);
      this._objectEndEditMode()
      object.borderColor = 'red';
      object.borderScaleFactor = 2;
      object.setCoords()

      this._fabricCanvas.requestRenderAll();
    },

    /**
     * render visible points in editing mode.
     *
     * @param object - the fabric object to render points for
     */
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

    selectAll: function () {
      this._fabricCanvas.discardActiveObject();
      var sel = new fabric.ActiveSelection(this._fabricCanvas.getObjects(), {
        canvas: this._fabricCanvas,
      });
      this._fabricCanvas.setActiveObject(sel);
      this._fabricCanvas.requestRenderAll();
    },

    _objectEndEditMode: function () {
      console.log('end edit mode of activeShape', this.activeShape)
      this.activeShape.set({
        selectable: true,
        hasBorders: true,
        objectCaching: true,
        evented: true,
        lockMovementX: false,
        lockMovementY: false
      })
    },

    /**
     * unselect the currently active shape.
     */
    deselect: function () {
      if (this.activeShape) {
        this._objectEndEditMode()
        this.activeShape.setCoords()
      }
      this._fabricCanvas.discardActiveObject()
      this._notifyEmptySelection()
      this.reset()
    },

    /**
     * get an object by its id
     *
     * @param id - the object id
     * @returns {fabric.Object}
     */
    getObjectById: function (id) {
      const result = this._fabricCanvas.getObjects().filter(function (o) {
        return o.id && o.id === id
      })
      return result[0];
    },

    /**
     * lock all object from being modified
     *
     * @param lock
     */
    lockAllObjects: function (lock) {
      const objects = this._fabricCanvas.getObjects()
      objects.map(object => object.set({ selectable: !lock, evented: !lock }))
      this._fabricCanvas.renderAll()
    },

    lockAllMovement: function (lock) {
      const objects = this._fabricCanvas.getObjects()
      objects.map(object => object.set({
        hasBorders: !lock,
        lockMovementX: lock,
        lockMovementY: lock
      }))
      this._fabricCanvas.renderAll()
    },

    /**
     * reset fabric to initial state.
     */
    reset: function () {
      console.log('RESET')
      this.activeShape = null;
      this.activeLine = null;
      this.activeGroup = null;
      this.removeLineHandles();
      this.removePointHandles();
      this._fabricCanvas.discardActiveObject();
      this._fabricCanvas.renderAll();
    },

    removeLineHandles: function () {
      this.lineArray.forEach(line => this._fabricCanvas.remove(line));
      this.lineArray = [];
    },

    removePointHandles: function () {
      this.pointArray.forEach(point => this._fabricCanvas.remove(point))
      this.pointArray = [];
    },

    /**
     * remove the currently active shape
     */
    remove: function () {
      const ao = this._fabricCanvas.getActiveObject() || this.activeShape;
      if (!ao) { return; }
      this.reset()
      this._notifyShapeRemoved(ao);
      this._fabricCanvas.remove(ao);
      this._fabricCanvas.renderAll();
    },

    /**
     * serialize an object as svg shape
     * @param object - the fabric object to serialize
     * @returns {{svg: (*|Array), id: *}}
     */
    serializeObject: function (object) {
      if (!object) { return; }
      // clean filtering of the style attribute is only possible calling fabric's private methods
      const svg = object._createBaseSVGMarkup(object._toSVG(), { noStyle: true })
      return { id: object.id, svg: svg }
    },

    /**
     * serialize group of shape to svg.
     *
     * @param group - the fabric group to serialize
     * @returns {{data: *, objects: Array, dimensions: (null|*)}}
     */
    serializeGroup: function (group) {
      const contents = group.getObjects()
      const serializedContents = contents.map(object => this.serializeObject(object))

      return {
        data: group.data,
        objects: serializedContents,
        dimensions: group.aCoords
      }
    },

    /**
     * import shapes from svg.
     *
     * @param svg - the svg shapes to import
     * @param attributes
     */
    importSVG: function (svg, attributes) {
      fabric.loadSVGFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
        objects => {
          objects.map(object => {
            const props = Object.assign({}, this.defaultStyle)
            object.set(props)
            this._fabricCanvas.add(object)
            object.set(attributes)
            object.set(this._getFillAndStroke(object))
            object.setCoords()
          })
        }
      )
    },

    /**
     * import a group of shapes from svg.
     *
     * @param data
     * @param members
     */
    importGroup: function (data, members) {
      const group = new fabric.Group()
      group.data = data
      group.subTargetCheck = true;
      this.groups.push(group)
      members.forEach(m => {
        const object = this.getObjectById(m.id)
        if (!object) { return console.error('no ID found for', m.id, object) }
        group.add(object)
        object.setCoords()
      })
      group.setCoords()
      this._fabricCanvas.add(group)
      this._fabricCanvas.renderAll()
    },

    /**
     * toggle between filled and unfilled mode for shapes.
     *
     * @param newValue - the new value
     */
    switchFillMode: function(newValue) {
      if (newValue !== this.fillMode) {
        console.log('switchFillMode to', this.fillMode)
        this.fillMode = newValue
      }

      // set fill and stroke for
      this._fabricCanvas.forEachObject(object => {
        if (this._isPointHandle(object) || object.type === 'group') {
          return
        }
        object.set(this._getFillAndStroke(object))
        object.setCoords()
      });
      this._fabricCanvas.requestRenderAll()

      if (this._annotator.mode === this._annotator.modes.GROUP) {
        this._fabricCanvas
          .getObjects('group')
          .map(group => this._setPropertiesForGroupMembers(group))
      }

      this._fabricCanvas.requestRenderAll()
    },

    _setPropertiesForGroupMembers: function (group) {
      let groupProperties = this._getFillAndStroke(group)
      group.getObjects().map(member => {
        member.set(groupProperties)
        member.setCoords()
      })
      group.setCoords()
    }, 

    /**
     * switch active shape into edit mode
     */
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
            this._getFillAndStroke(object)
          )
          newObject.set(props)
          // newObject.setCoords()
        }
      )
      return newObject
    },

    _getFillAndStroke: function(object) {
      let color = this.unassignedColor
      if ( object.data && object.data.label) {
        color = object.data.label.color
      }
      if (this._annotator.mode === this._annotator.modes.GROUP) {
        color = object.data.color || this.unassignedColor
      }

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
      const mergedData = Object.assign({}, currentData, newData)
      object.set(mergedData)
      object.set(this._getFillAndStroke(object))
      this._fabricCanvas.renderAll()
    },

    /**
     * create a new group and add to fabric canvas
     */
    addGroup: function () {
      this.activeGroup = new fabric.Group()
      this.activeGroup.data = {
        id: this._getShapeId(),
        color: colors[this.currentHue]
      }
      this.activeGroup.subTargetCheck = true;
      this.groups.push(this.activeGroup)
      this.currentHue = (this.currentHue + 12) % colors.length
      this._fabricCanvas.add(this.activeGroup)
      this.activeGroup.setCoords()
      this._fabricCanvas.requestRenderAll()
      this._notifyGroupCreated(this.activeGroup)
    },

    _groupIsEmpty: function (group) {
      return group.getObjects().length === 0
    },

    _groupHasObjects: function (group) {
      return group.getObjects().length > 0
    },

    _groupCleanup: function () {
      if (
        this.groups.length === 0 ||
        this.groups.every(this._groupHasObjects)
      ) { 
        return console.log('No cleanup needed, no empty groups')
      }

      console.log('group cleanup needed')
      const cleanup = this.groups.filter(this._groupIsEmpty)
      cleanup
        .map(group => {
          const data = group.data
          group.destroy()
          return data
        })
        .map(data => this._notifyGroupRemoved(data))

      console.log(`removed ${cleanup.length} empty groups`)

      const keep = this.groups.filter(this._groupHasObjects)
      console.log(`keep ${keep.length} groups`)

      this.groups = keep
    },

    _setState: function (options) {
      console.log('_setState', options.pointer)
      const pointer = this._fabricCanvas.getPointer(options.e);
      this._clickOrigin = pointer
      this._state = this.activeShape.get('points')
      console.log('_state', this._state)
    },

    _objectMove: function (options) {
      const target = options.transform.target
      if (!this._isPointHandle(target)) { return }
      const pointer = this._fabricCanvas.getPointer(options.e);

      const dx = pointer.x - this._clickOrigin.x
      const dy = pointer.y - this._clickOrigin.y
      const i = target.data.index
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

    _nextState: function () {
      const clone = this.reimport(this.activeShape)
      this._fabricCanvas.remove(this.activeShape)
      this.activeShape = clone
      this._fabricCanvas.add(clone)
      this._notifyShapeChanged(this.activeShape)
      this._putObjectInEditMode(this.activeShape)
      this._fabricCanvas.renderAll()
    },

    /*
    * _mouseDown, _mouseMove and _mouseUp are of central importance for user interactions as they need to handle
    * all the different modes for manipulating shapes or zooming, panning the canvases .
    *
    */

    _mouseDown: function (options) {
      const mode = this._annotator.mode
      const pointer = this._fabricCanvas.getPointer(options.originalEvent);

      switch (mode) {
        case this._annotator.modes.EDIT:
          // pointhandle selection
          if (this._isPointHandle(options.target)) {
            console.log('point', options.target)
            this.currentPointHandle = options.target
            this.pointArray.forEach(point => point.set({ stroke: this.pointStyle.stroke }))
            options.target.set({ stroke: 'tomato' })
            this._fabricCanvas.renderAll()
            break
          }
          // clicking anywhere but on a point handle will end the edit mode
          this._annotator.mode = this._annotator.modes.SELECT
          break
        case this._annotator.modes.SELECT:
          console.log('mouse:down', options.target)
          if (options.target) {
            this._highlight(options.target);
            // options.target.setCoords()
            this._notifyShapeSelected(options)
            break
          }
          this.deselect()
          break
        case this._annotator.modes.GROUP:
          // enable multi select
          // this._fabricCanvas.selection = true;
          if (options.target && !this.activeGroup.contains(options.target)) {
            // remove target from all previous groups (should only be one)
            this.groups
              .filter(group => group.contains(options.target))
              .forEach(group => {
                console.log("remove", options.target.id, "from", group.data.id)
                group.remove(options.target)
                this._notifyGroupChanged(group)
              })

            this.activeGroup.add(options.target)
            options.target.set(this._getFillAndStroke(this.activeGroup))
            options.target.setCoords()
            this.activeGroup.setCoords()
            this._groupCleanup()
            this._notifyGroupChanged(this.activeGroup)
            this._fabricCanvas.renderAll()
          }
          // log selection
          console.log(this.activeGroup.getObjects())
          console.log(this.groups.length)
          break
        case this._annotator.modes.RECTANGLE:
          this.deselect()
          this._fabricCanvas.on('mouse:move', this._boundMouseMoveListener)
          const rect = new fabric.Rect(Object.assign({}, this.defaultStyle, {
            evented: false,
            selectable: false,
            left: pointer.x,
            top: pointer.y
          }));
          rect.set(this._getFillAndStroke(rect))
          this._fabricCanvas.add(rect);
          this.activeShape = rect;
          this._fabricCanvas.setActiveObject(rect);
          this._fabricCanvas.renderAll();
          break
        case this._annotator.modes.CIRCLE:
          this.deselect()
          this._fabricCanvas.on('mouse:move', this._boundMouseMoveListener)
          // TODO improve circle painting
          const circle = new fabric.Circle(Object.assign({}, this.defaultStyle, {
            evented: false,
            selectable: false,
            left: pointer.x,
            top: pointer.y,
            selectionBackgroundColor: "transparent"
          }));
          circle.set(this._getFillAndStroke(circle))

          this._fabricCanvas.add(circle);
          this.activeShape = circle;
          this._fabricCanvas.setActiveObject(circle);
          this._fabricCanvas.renderAll();
          break
        case this._annotator.modes.POLYGON:
          if (this.pointArray.length === 0) {
            this.deselect()            
          }
          if (
            !options.target || 
            this.pointArray.length === 0 ||
            options.target.id !== this.pointArray[0].id
          ) {
            // register event listener
            this._fabricCanvas.on('mouse:move', this._boundMouseMoveListener)
            this._addPointFromEvent(options);
            break;
          }

          // if the target id is the same as the first one created
          const polygon = this._generatePolygon();
          polygon.set(this._getFillAndStroke(polygon))
          this._fabricCanvas.add(polygon);
          this._notifyShapeCreated(polygon)
          this.lockAllMovement(true);
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
          reimport.evented = false
          reimport.selectable = false
          this._fabricCanvas.add(reimport)
          this._highlight(reimport)
          this.activeShape.set(this._getFillAndStroke(this.activeShape))
          this.activeShape.setCoords();
          this.lockAllMovement(true);
          this._notifyShapeCreated(reimport)
          break
        case this._annotator.modes.CIRCLE:
          this._fabricCanvas.off('mouse:move', this._boundMouseMoveListener)
          // circle is special
          this.activeShape.set("hasBorders", true);
          this.activeShape.id = this._getShapeId()
          this._highlight(this.activeShape)
          this.activeShape.set(this._getFillAndStroke(this.activeShape))
          this.activeShape.setCoords();
          this.lockAllMovement(true);

          this._notifyShapeCreated(this.activeShape)
        case this._annotator.modes.POLYGON:
          this._fabricCanvas.off('mouse:move', this._boundMouseMoveListener)
          break
      }

      if (!this.activeShape) { return }
    },

    _addPointFromEvent: function (options) {
      const pointer = this._fabricCanvas.getPointer(options.originalEvent);
      // first point marker is special
      const attributes = this.pointArray.length === 0 ? { stroke: 'tomato' } : null
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

      console.log('numer of points', points.length)
      const polygon = new fabric.Polygon(points, this.defaultStyle, {
        evented: false,
        selectable: false
      });
      polygon.id = this._getShapeId()
      return this.reimport(polygon)
    },

    // NOTIFY

    _notifyShapeCreated: function (object) {
      const shape = this.serializeObject(object)
      const event = new CustomEvent('shape-created', {composed:true, bubbles: true, detail: {shape: shape}})
      this._canvas.dispatchEvent(event)
    },

    _notifyShapeChanged: function (object) {
      if (!object) { return }
      const shape = this.serializeObject(object)
      const event = new CustomEvent('shape-changed', {composed: true, bubbles: true, detail: {shape: shape}})
      this._canvas.dispatchEvent(event)
    },

    _notifyShapeSelected: function (options) {
      // in group mode selections are handled elsewhere
      if (this._annotator.mode === this._annotator.modes.GROUP) { return }
      if (!options) { return this._notifyEmptySelection(); }
      const shape = this.serializeObject(options.target);
      const event = new CustomEvent('shape-selected', {composed: true, bubbles: true, detail: {shape: shape}})
      this._canvas.dispatchEvent(event)
    },

    _notifyShapeRemoved: function (object) {
      const shape = this.serializeObject(object)
      const event = new CustomEvent('shape-deleted', {composed: true, bubbles: true, detail: {shape: shape}})
      this._canvas.dispatchEvent(event);
    },

    _notifyEmptySelection: function (options) {
      this._canvas.dispatchEvent(new CustomEvent('shape-selected', {composed: true, bubbles: true, detail: {shape: null}}));
    },

    // group already removed, therefore 
    _notifyGroupRemoved: function (data) {
      if (!data) { return }
      const event = new CustomEvent('group-deleted', {composed:true, bubbles: true, detail: data})
      this._canvas.dispatchEvent(event)
    },

    _notifyGroupCreated: function (group) {
      if (!group) { return }
      const detail = this.serializeGroup(group)
      console.info('serialized Group', detail)
      const event = new CustomEvent('group-created', {composed:true, bubbles: true, detail: detail})
      this._canvas.dispatchEvent(event)
    },

    _notifyGroupChanged: function (group) {
      if (!group) { return }
      const detail = this.serializeGroup(group)
      const event = new CustomEvent('group-changed', {composed:true, bubbles: true, detail: detail})
      this._canvas.dispatchEvent(event)
    },

    // ID generator

    _getShapeId: function () {
      return 's-' + Date.now() + Math.floor(Math.random() * 11)
    }
  };
})();
