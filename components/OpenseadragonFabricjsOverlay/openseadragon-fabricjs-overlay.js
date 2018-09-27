// OpenSeadragon canvas Overlay plugin 0.0.1 based on svg overlay plugin

(function () {

    if (!window.OpenSeadragon) {
        console.error('[openseadragon-canvas-overlay] requires OpenSeadragon');
        return;
    }


    /**
     * @param {Object} options
     *      Allows configurable properties to be entirely specified by passing
     *      an options object to the constructor.
     * @param {Number} options.scale
     *      Fabric 'virtual' canvas size, for creating objects
     **/
    OpenSeadragon.Viewer.prototype.fabricjsOverlay = function (options) {

        console.log("fabricjsOverlay options ", options);
        console.log("fabricjsOverlay options ", options.iviewer);
        this._fabricjsOverlayInfo = new Overlay(this);
        this._fabricjsOverlayInfo._scale = options.scale;
        // this._fabricjsOverlayInfo.iviewer = options.iviewer;

        console.log("fabricjsOverlayInfo ", this._fabricjsOverlayInfo);

        return this._fabricjsOverlayInfo;
    };
    // static counter for multiple overlays differentiation
    var counter = (function () {
        var i = 1;

        return function () {
            return i++;
        }
    })();
    // ----------
    var Overlay = function (viewer) {
        var self = this;

        this._viewer = viewer;

        this._containerWidth = 0;
        this._containerHeight = 0;

        this._canvasdiv = document.createElement('div');
        this._canvasdiv.style.position = 'absolute';
        this._canvasdiv.style.left = 0;
        this._canvasdiv.style.top = 0;
        this._canvasdiv.style.width = '100%';
        this._canvasdiv.style.height = '100%';
        this._viewer.canvas.appendChild(this._canvasdiv);

        this._canvas = document.createElement('canvas');

        // this._id='osd-overlaycanvas-'+counter();
        this._id = 'fabric';
        this._canvas.setAttribute('id', this._id);
        this._canvasdiv.appendChild(this._canvas);
        this.resize();
        this._fabricCanvas = new fabric.Canvas(this._canvas);
        // disable fabric selection because default click is tracked by OSD
        this._fabricCanvas.selection = false;


        // prevent OSD click elements on fabric objects
        /*
                this._viewer.addHandler('mouse:down', function (options) {
                    console.log('fabric overlay mousedown options: ',options);
                    if (options.target) {
                        options.e.preventDefaultAction = true;
                        options.e.preventDefault();
                        options.e.stopPropagation();
                    }
                    self._mouseDown(this.options);

                });
        */

        console.log("this.fabric ", this);
        console.log("this._viewer ", this._viewer);

        /*
                this._fabricCanvas.on('mouse:up', function(options){
                    console.log('mouse:up ', options);
                });
        */


        this._viewer.addHandler('update-viewport', function () {
            self.resize();
            self.resizecanvas();

        });

        this._viewer.addHandler('open', function () {
            self.resize();
            self.resizecanvas();
        });

        this._viewer.addHandler('canvas-press', function (options) {
            console.log('fabric canvas-press options ', options);

            const mode = document.getElementById('viewer').mode;
            console.log('>>>>> mode ', mode);
            if(mode === 'osd') return;

            this._viewer.setMouseNavEnabled(false);
            this._viewer.outerTracker.setTracking(false);
            // this._fabricCanvas.isDrawingMode=true;

            this._mouseDown(options, mode);
        }.bind(this));

        this._viewer.addHandler('canvas-release', function (options) {
            console.log('fabric canvas-release options ', options);

            const mode = document.getElementById('viewer').mode;
            console.log('>>>>> mode ', mode);
            if(mode === 'osd') return;


            this._viewer.setMouseNavEnabled(true);
            this._viewer.outerTracker.setTracking(true);
            this._fabricCanvas.isDrawingMode=false;

            this._mouseUp(options,mode);
            document.getElementById('viewer').mode = "osd";
        }.bind(this));

        this._viewer.addHandler('canvas-drag', function (options) {
            console.log('fabric canvas-release options ', options);
            if(document.getElementById('viewer').mode !== 'osd') {

                if(options.target){
                    options.e.preventDefaultAction = true;
                    options.e.preventDefault();
                    options.e.stopPropagation();
                }
            }
        });

    };

    // ----------
    Overlay.prototype = {
        // ----------
        canvas: function () {
            return this._canvas;
        },
        fabricCanvas: function () {
            return this._fabricCanvas;
        },
        // ----------
        clear: function () {
            this._fabricCanvas.clearAll();
        },
        // ----------
        resize: function () {
            if (this._containerWidth !== this._viewer.container.clientWidth) {
                this._containerWidth = this._viewer.container.clientWidth;
            }

            if (this._containerHeight !== this._viewer.container.clientHeight) {
                this._containerHeight = this._viewer.container.clientHeight;
                this._canvasdiv.setAttribute('height', this._containerHeight);
                this._canvas.setAttribute('height', this._containerHeight);
            }

        },
        resizecanvas: function () {

            var origin = new OpenSeadragon.Point(0, 0);
            var viewportZoom = this._viewer.viewport.getZoom(true);
            this._fabricCanvas.setWidth(this._containerWidth);
            this._fabricCanvas.setHeight(this._containerHeight);
            var zoom = this._viewer.viewport._containerInnerSize.x * viewportZoom / this._scale;
            this._fabricCanvas.setZoom(zoom);
            var viewportWindowPoint = this._viewer.viewport.viewportToWindowCoordinates(origin);
            var x = Math.round(viewportWindowPoint.x);
            var y = Math.round(viewportWindowPoint.y);
            var canvasOffset = this._canvasdiv.getBoundingClientRect();

            var pageScroll = OpenSeadragon.getPageScroll();

            this._fabricCanvas.absolutePan(new fabric.Point(canvasOffset.left - x + pageScroll.x, canvasOffset.top - y + pageScroll.y));

        },

        _mouseDown: function (options,mode) {
            console.log('fabricjs mouseDown', options);
//                console.log('isDown target', options.target);
//                console.log('isDown target.id', options.target.id);




            var pointer = this._fabricCanvas.getPointer(options.e);

            if (mode == 'rectangle') {
                var rect = new fabric.Rect({
                    left: pointer.x,
                    top: pointer.y,
                    fill: 'transparent',
                    stroke: 'blue',
                    strokeWidth: 2,
                    hasBorders: false,
                    hasControls: false,
                    opacity: 0.5,
                    data: 'a rectangle'
                });

                this._fabricCanvas.add(rect);
                this._fabricCanvas.setActiveObject(rect);
                this._fabricCanvas.renderAll();
                this.activeShape = rect;

            } else if (mode == 'circle') {
                console.log('mode = circle');

                var circle = new fabric.Circle({
                    left: pointer.x,
                    top: pointer.y,
                    fill: 'transparent',
                    stroke: 'blue',
                    strokeWidth: 2,
                    hasBorders: false,
                    hasControls: false,
                    selectionBackgroundColor: 'transparent'
                });
                this._fabricCanvas.add(circle);
                this._fabricCanvas.setActiveObject(circle);
                this._fabricCanvas.renderAll();
                this.activeShape = circle;

            } else if (mode == 'polygon') {
                this.line = null;
                this.activeLine = null;

                console.log('pointArray ', this.pointArray);

                // if the target id is the same as the first one created
                if (options.target && options.target.id == this.pointArray[0].id) {
                    this._generatePolygon();
                }
                if (mode == 'polygon') {
                    this._addPoint(options);
                }


            }
        },

        _mouseUp: function (options) {
            console.log('mouseUp', options);

            if (this.mode === 'osd') return;
            const imgView = document.getElementById('viewer');
            let mode = imgView.mode;

            if (mode == 'rectangle') {
                this.activeShape.set('hasBorders', true);
                this.activeShape.set('hasControls', true);
                this.activeShape.setCoords();

            } else if (mode == 'circle') {
                this.activeShape.set('hasBorders', true);
                this.activeShape.set('hasControls', true);
                this.activeShape.setCoords();
                imgView.mode = 'osd';
            }

            this.mode = 'osd';

        }


    };

})();
