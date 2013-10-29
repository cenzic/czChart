(function ($) {
    $.fn.jGraphic = function () {
        if (this.length != 1 || this.get(0).nodeName.toLowerCase() != "canvas") {
            console.error("canvas undefined");
            return null;
        }
        var graphic = new jGraphic(this);
        // register event to handle event on canvas. Events on canvas are
        // artificial event, which being calculated base on mouse event on the
        // document.
        var self = this;
        this.mouseenter(function () {
        	self.mousemove(function (event) {
        		graphic.mousePos = {
                    top: event.pageY,
                    left: event.pageX,
                    clientY: event.clientY,
                    clientX: event.clientX,
                    screenY: event.screenY,
					screenX: event.screenX
                };
            });
            graphic.timer = setInterval(function () {
                graphic.monitoringEvent();
            }, jGraphic.timerDelay);
        });
        this.mouseleave(function () {
			self.unbind("mousemove");
			clearInterval(graphic.timer);

        	/*If there is an image with the mouse currently over it that we are tracking we need to make sure
			its mouseout event gets triggered*/
			if (graphic.mouseOverImage) {
				graphic.mouseOverImage.invokeEvent("mouseout");
			}

			// trigger mouse out for dragging image
			var image = graphic.draggingImage;
			if (image) {
				image.mouseOver = false;
				image.invokeEvent("mouseout");
			}
        });
        this.bind("click mousedown mouseup", function (event) {
        	graphic.mousePos = {
        		top: event.pageY,
        		left: event.pageX,
        		clientY: event.clientY,
        		clientX: event.clientX,
        		screenY: event.screenY,
        		screenX: event.screenX
        	};
            graphic.monitoringEvent(event.type);
        });

        return graphic;
    };

    /**
	 * hash to image element for render image in canvas.
	 */
    imageSrc = {};


    jGraphic = function (jObj) {
        //=============== properties ===================
        /**
		 * Referent to the jquery object of the canvas itself.	
		 */
        this.jObj = null;

        /**
		 * referent to the canvas element
		 */
        this.canvas = null;

        /**
		 * Canvas context
		 */
        this.context = null;

        /**
		 *  position of canvas relative to the document. Need to update on scroll.
		 */
        this.canvasPos = {
            top: 0,
            left: 0
        };

        /**
		 * Mouse position relative to the document, update for each sampling point.	 
		 */
        this.mousePos = {
            top: 0,
            left: 0
        };

        /**
		 * timer keep the time interval when mouse on the canvas.
		 * handling event for canvas was not trigger directly, and it only being
		 * trigger when timer come by calling
		 *  registered handler.
		 */
        this.timer = null;

        /**
		 * colection of image with imageCollection:{
		 * guid:{x0,x1,y0,y1,args,image} },
		 */
        this.imageCollection = {};

        /**
		 * imageList is an order list of image in the canvas registered in
		 * order. when refresh, each image will be reloaded in order. this also
		 * allow to reorder an image. imageList: [guid2,guid1,guid0]
		 */
        this.imageList = [];

        //initializing properties
        this.jObj = jObj;
        this.canvas = jObj.get(0);
        if (!this.canvas) {
            console.error("Canvas not defined");
            return;
        }
        this.initCanvasPos();
        var el = this.canvas;
        //special initialize for canvas context with excanvas library
        if (typeof (HTMLCanvasElement) != "undefined") {
            this.context = el.getContext("2d");
            this.isCanvas = true;
        } else {
            G_vmlCanvasManager.initElement(el);
            this.context = el.getContext('2d');
            this.isCanvas = false;
        }
    };

    //sampling rate for synthetic mouse move event.
    jGraphic.timerDelay = 10; // 15 frames/seconds.

    jGraphic.prototype = {
        width: function () {
            return this.canvas.width;
        },
        height: function () {
            return this.canvas.height;
        },
        /**
		 * Get canvas position. This need to be update on document scroll.
		 */
        initCanvasPos: function () {
            var canvasPos = this.jObj.offset();
            //console.log("initCanvasPos: top: %d, left: %d, width: %d, height: %d", canvasPos.top, canvasPos.left, this.canvas.width, this.canvas.height);
            this.canvasPos = {
                top: Math.floor(canvasPos.top),
                left: Math.floor(canvasPos.left)
            };
        },
        /**
		 * Entry point to handle synthetic event.
		 * Calculate the current position then pass to the event handler function.q
		 */
        monitoringEvent: function (type) {
            type = type || "mousemove";
            var pos = {
                x: this.mousePos.left - this.canvasPos.left,
                y: this.mousePos.top - this.canvasPos.top
            };
            if (type == "mousemove" && this.lastMousePos && this.lastMousePos.x == pos.x && this.lastMousePos.y == pos.y) return;

            //continue to process event
            this.lastMousePos = pos;
            var px = this.isCanvas ? this.context.getImageData(pos.x, pos.y, pos.x + 1, pos.y + 1) : { data: null };
            var d = px.data;
            this.handlingEvent(type, pos, px.data);
        },

        /**
		 * check to see if current pointer point to any image object
		 * to handle for mouse over and mouse out event.
		 */
        handlingEvent: function (eventType, pos, pxData) {
            //console.log("handlingEvent: %j", arguments);

            var image = this.getImage(pos, pxData);
            if (image) {
                // console.log("image: %j", image);
                // create artificial event.
                if (eventType == "mousemove") {
                    if (image.mouseOver) {
                        image.invokeEvent("mousemove");
                    }
                        // mouse enter event or mouse over are the same in canvas.
                    else {
                        if (this.mouseOverImage && this.mouseOverImage != image) {
                            // invoke mouse out from the other image
                            this.mouseOverImage.invokeEvent("mouseout");
                            this.mouseOverImage.mouseOver = false;
                        }
                        image.invokeEvent("mouseover");
                        image.invokeEvent("mousemove");
                        image.mouseOver = true;
                        this.mouseOverImage = image;
                    }
                } else {
                    // handling register even
                    image.invokeEvent(eventType);
                }
            } else {
            	// check if any image register as mouse over, then invoke mouse
                // out.
                if (this.mouseOverImage) {
                    this.mouseOverImage.invokeEvent("mouseout");
                    this.mouseOverImage.mouseOver = false;
                    this.mouseOverImage = null;
                }
            }
        },

        /**
		 * Attempt to get if current cursor point to any image object on the canvas
		 */
        getImage: function (pos, pxData) {
            for (var i = this.imageList.length - 1 ; i >= 0; i--) {
                var image = this.imageCollection[this.imageList[i]];
                //skip hidden image
                if (image.isHidden === true) {
                    continue;
                }
                if (image.detect(pos, pxData)) {
                    return image;
                }
            }
            return null;
        },

        /**
		 * Loop through all image object and refresh each image.
		 * this is not need for charting where each images
		 */
        refresh: function () {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            for (var i = 0; i < this.imageList.length; i++) {
                var image = this.imageCollection[this.imageList[i]];
                image.renderHelper(image.render);
            }
        },

        //============================== Drawing functions ================================
        _getTextWidth: function (text, font) {
            this.context.save();
            this.context.font = font;
            var w = this.context.measureText(text).width;
            this.context.restore();
            return w;
        },
        /**
		 * create text image on canvas.
		 */
        text: function (x, y, text, opts) {
            var defaultOptions = {
                fillStyle: "black",
                textAlign: "left",
                textBaseline: "alphabetic",
                font: "normal 12px arial",
                lineWidth: 0,
                angle: 0 // text always go from left to right. from 0 to 180
                // textAlign, Since negative number will have same
                // effect and so it will not be handle.
            };
            var options = $.extend({}, defaultOptions, opts);
            var self = this;
            var render = function () {
                var ax = this.dx || 0;
                ax += x;
                var ay = this.dy || 0;
                ay += y;
                self.context.fillText(text, ax, ay);
            };

            var w = this._getTextWidth(text, options.font);
            var adjustedX = x;
            if (options.textAlign) {
                switch (options.textAlign.toLowerCase()) {
                    case "start":
                    case "left":
                        break;
                    case "end":
                    case "right":
                        adjustedX -= w;
                        break;
                    case "center":
                        adjustedX -= w / 2;
                        break;
                    default:
                        console.log("not valid");
                }
            }
            var regex = new RegExp("(\\d+)px");
            var match = regex.exec(options.font);
            var h = match ? match[1] : "12";// need to fix;
            h = parseInt(h, 10);
            var adjustedY = y;
            if (options.textBaseline) {
                switch (options.textBaseline.toLowerCase()) {
                    case "bottom":
                    case "alphabetic":
                        adjustedY -= h;
                        break;
                    case "middle":
                        adjustedY -= h / 2;
                        break;
                    case "top":
                    case "hanging":
                        break;
                    default:
                        console.log("not valid textBaseline");
                }
            }

            var detect = function (pos, pxData) {
                var dx = this.dx || 0;
                var ax = dx + adjustedX;
                var dy = this.dy || 0;
                var ay = dy + adjustedY;
                var x0 = ax,
					x1 = ax + w,
					y0 = ay,
					y1 = ay + h;
                //				console.log("detect text: x0: %d, x1: %d, y0: %d, y1: %d, dx: %d, dy: %d", x0, x1, y0, y1, dx, dy);
                //				this.jGraphicObj.context.strokeRect(x0, y0, w, h);	
                var success = pos.x >= x0 && pos.x <= x1 && pos.y >= y0 && pos.y <= y1;
                return success;
            }
            var textObj = new jGraphic.ImageBase(this, options, detect, render);

            return textObj;
        },

        /**
		 * Draw a line on canvas with event registering
		 */
        line: function (x1, y1, x2, y2, options) {
            var self = this;
            var render = function () {
                var dx = this.dx || 0,
					ax1 = dx + x1,
					ax2 = dx + x2,
					dy = this.dy || 0,
					ay1 = dy + y1,
					ay2 = dy + y2;

                self.context.moveTo(ax1, ay1);
                self.context.lineTo(ax2, ay2);
            }
            var detect = function (pos, pxData) {
                var x0 = pos.x;
                var y0 = pos.y;
                var dx = this.dx || 0,
				ax1 = dx + x1,
				ax2 = dx + x2,
				dy = this.dy || 0,
				ay1 = dy + y1,
				ay2 = dy + y2;

                if (
					(ax1 >= ax2 && (x0 < ax2 || x0 > ax1)) ||
					(ax1 < ax2 && (x0 < ax1 || x0 > ax2)) ||
					(ay1 >= ay2 && (y0 < ay2 || y0 > ay1)) ||
					(ay1 < ay2 && (y0 < ay1 || y0 > ay2))
				) return false;

                d = Math.abs((ax2 - ax1) * (ay1 - y0) - (ax1 - x0) * (ay2 - ay1)) / Math.sqrt(Math.pow(ax2 - ax1, 2) + Math.pow(ay2 - ay1, 2));
                var lineWidth = options.lineWidth || 1;
                var delta = options.delta || 5;
                return d <= (lineWidth / 2 + delta);
            }

            var line = new jGraphic.ImageBase(this, options, detect, render);
            return line;
        },

        /**
		 * Draw dash line on canvas with event registering
		 * special property of options:
		 * da: [length, space]. length the how long it will draw one dash, and space in between dash.
		 */
        dashLine: function (x1, y1, x2, y2, options) {
            var self = this;
            var render = function () {
                var dx = this.dx || 0,
					ax1 = dx + x1,
					ax2 = dx + x2,
					dy = this.dy || 0,
					ay1 = dy + y1,
					ay2 = dy + y2;

                var da = options.da || [10, 5];
                var dx = (ax2 - ax1), dy = (ay2 - ay1);
                var len = Math.sqrt(dx * dx + dy * dy);
                var rot = Math.atan2(dy, dx);
                self.context.translate(ax1, ay1);
                self.context.rotate(rot);
                self.context.moveTo(0, 0);
                var dc = da.length;
                var di = 0, draw = true;
                var x = 0;
                while (len > x) {
                    x += da[di++ % dc];
                    if (x > len) x = len;
                    draw ? self.context.lineTo(x, 0) : self.context.moveTo(x, 0);
                    draw = !draw;
                }
            };
            var detect = function (pos, pxData) {
                var x0 = pos.x;
                var y0 = pos.y;
                var dx = this.dx || 0,
				ax1 = dx + x1,
				ax2 = dx + x2,
				dy = this.dy || 0,
				ay1 = dy + y1,
				ay2 = dy + y2;

                if (
					(ax1 >= ax2 && (x0 < ax2 || x0 > ax1)) ||
					(ax1 < ax2 && (x0 < ax1 || x0 > ax2)) ||
					(ay1 >= ay2 && (y0 < ay2 || y0 > ay1)) ||
					(ay1 < ay2 && (y0 < ay1 || y0 > ay2))
				) return false;

                d = Math.abs((ax2 - ax1) * (ay1 - y0) - (ax1 - x0) * (ay2 - ay1)) / Math.sqrt(Math.pow(ax2 - ax1, 2) + Math.pow(ay2 - ay1, 2));
                var lineWidth = options.lineWidth || 1;
                var delta = options.delta || 5;
                return d <= (lineWidth / 2 + delta);
            };
            var dashLine = new jGraphic.ImageBase(this, options, detect, render);
            return dashLine;
        },

        /**
		 * Draw rectangle image with event registering
		 */
        rectangle: function (x, y, w, h, options) {
            //render image.		    
            var self = this;
            var render = function () {
                var opts = this.options;
                var ax = this.dx || 0;
                ax += x;
                var ay = this.dy || 0;
                ay += y;
                if (opts.shadowLayer) {
                    var s = opts.shadowLayer,
						offsetX = s.offsetX || 0,
						offsetY = s.offsetY || 0,
						shadowX = ax + (offsetX ? w : 0),
						shadowY = ay + (offsetY ? h : 0),
						shadowW = offsetX || w + 1,
						shadowH = offsetY || h + 1;
                    //console.log("shadowX: %d, shadowY: %d, shadowW: %d, shadowH: %d, offsetX: %d, offsetY: %d, h: %d", shadowX, shadowY, shadowW, shadowH, offsetX, offsetY, h);
                    self.context.save();
                    self.context.beginPath();
                    var gradient = self.context.createLinearGradient(shadowX - offsetX, shadowY - offsetY, shadowX + offsetX, shadowY + offsetY);
                    gradient.addColorStop(0, "black");
                    gradient.addColorStop(1, "white");
                    self.context.fillStyle = gradient;
                    self.context.fillRect(shadowX, shadowY, shadowW, shadowH);
                    self.context.restore();
                }
                if (opts.lighten) {
                    self.context.save();
                    self.context.beginPath();
                    self.context.fillStyle = opts.fillStyle || "black";
                    self.context.fillRect(ax, ay, w, h);
                    self.context.restore();
                    var color = Math.floor(opts.lighten * 255 / 100);
                    var hex = "#" + color.toString(16) + color.toString(16) + color.toString(16);
                    self.context.globalCompositeOperation = "lighten";
                    self.context.fillStyle = hex;
                }
                if (opts.gradientLayer) {
                    self.context.save();
                    self.context.beginPath();
                    self.context.fillStyle = opts.fillStyle || "black";
                    self.context.fillRect(ax, ay, w, h);
                    self.context.restore();
                    var isH = opts.gradientLayer.isHorizontal;
                    var gradient = self.context.createLinearGradient(ax, ay, ax + (isH ? w : 0), ay + (isH ? 0 : h));
                    gradient.addColorStop(0, "black");
                    gradient.addColorStop(0.4, "white");
                    gradient.addColorStop(1, "black");
                    self.context.fillStyle = gradient;
                    self.context.globalAlpha = 0.3;
                }


                self.context.rect(ax, ay, w, h);

            };

            //this.renderHelper(options,render);

            var detect = function (pos, pxData) {
                var ax = this.dx || 0;
                ax += x;
                var ay = this.dy || 0;
                ay += y;
                var x0 = ax,
				x1 = ax + w,
				y0 = ay,
				y1 = ay + h;
                var success = pos.x >= x0 && pos.x <= x1 && pos.y >= y0 && pos.y <= y1;
                return success;
            }
            var rectangle = new jGraphic.ImageBase(this, options, detect, render);
            return rectangle;
        },

        /**
		 * Triangle shape
		 */
        triangle: function (x1, y1, x2, y2, x3, y3, options) {
            var self = this;
            var render = function () {
                var dx = this.dx || 0,
					ax1 = dx + x1,
					ax2 = dx + x2,
					ax3 = dx + x3,
					dy = this.dy || 0,
					ay1 = dy + y1,
					ay2 = dy + y2,
					ay3 = dy + y3;
                self.context.moveTo(ax1, ay1);
                self.context.lineTo(ax2, ay2);
                self.context.lineTo(ax3, ay3);
                self.context.closePath();
            }
            var detect = function (pos, pxData) {
                var dx = this.dx || 0,
					ax1 = dx + x1,
					ax2 = dx + x2,
					ax3 = dx + x3,
					dy = this.dy || 0,
					ay1 = dy + y1,
					ay2 = dy + y2,
					ay3 = dy + y3;
                var s = pos,
					a = { x: ax1, y: ay1 },
					b = { x: ax2, y: ay2 },
					c = { x: ax3, y: ay3 };

                var as_x = s.x - a.x;
                var as_y = s.y - a.y;

                var s_ab = (b.x - a.x) * as_y - (b.y - a.y) * as_x > 0;

                if ((c.x - a.x) * as_y - (c.y - a.y) * as_x > 0 == s_ab) return false;

                if ((c.x - b.x) * (s.y - b.y) - (c.y - b.y) * (s.x - b.x) > 0 != s_ab) return false;

                return true;
            }
            var triangle = new jGraphic.ImageBase(this, options, detect, render);
            return triangle;
        },
        /**
		 * draw equilateral triangle
		 */
        isoscelesTriangle: function (x, y, h, a, options) {
            var l = h * Math.tan(a * Math.PI / 360),
				x1 = x - l,
				y1 = y + h,
				x2 = x,
				y2 = y,
				x3 = x + l,
				y3 = y + h;
            return this.triangle(x1, y1, x2, y2, x3, y3, options);
        },

        /**
		 * Circle shape
		 */
        circle: function (x0, y0, r, options) {
            var self = this;
            var render = function () {
                var ax = this.dx || 0;
                ax += x0;
                var ay = this.dy || 0;
                ay += y0;
                self.context.arc(ax, ay, r, 0, 2 * Math.PI);
            };

            var detect = function (pos, pxData) {
                var ax = this.dx || 0;
                ax += x0;
                var ay = this.dy || 0;
                ay += y0;
                var d = Math.sqrt(Math.pow(pos.x - ax, 2) + Math.pow(pos.y - ay, 2));
                return d <= r;
            };

            var circle = new jGraphic.ImageBase(this, options, detect, render);
            return circle;
        },

        /**
		 * draw a path with angle. This is not complete drawing yet, just the path only,
		 * to make it complete, need to fill or stroke...
		 */
        _drawSegmentLine: function (x, y, r, angle) {
            this.context.save();
            this.context.translate(x, y);
            this.context.rotate(angle);
            this.context.moveTo(0, 0);
            this.context.lineTo(r, 0);
            this.context.restore();
        },
        defaultOptions: {
            lineWidth: 1,
            fillStyle: "#eee",
            strokeStyle: "black",
            lineJoin: "bevel",
            globalAlpha: 1
        },
        /**
		 * Pie shape
		 * x,y: center of the pie
		 * r: radius of the pie
		 * a0,a1: start and end angle in degree using canvas angle positive direction goes clockwise.
		 * options: for render the pie such as fill and stroke
		 */
        pie: function (x, y, r, a0, a1, options) {
            var self = this;
            var start = a0 * Math.PI / 180;
            var end = a1 * Math.PI / 180;

            var render = function () {
                var opts = this.options;
                var ax = this.dx || 0;
                ax += x;
                var ay = this.dy || 0;
                ay += y;
                var w = opts.lineWith || 1;
                if (opts.gradientLayer) {
                    self.context.save();
                    self.context.beginPath();
                    self.context.fillStyle = opts.fillStyle || "black";

                    self._drawSegmentLine(ax, ay, r - w, start);
                    self.context.arc(ax, ay, r - w, start, end);
                    self.context.closePath();

                    self.context.restore();
                    var grd = self.context.createRadialGradient(x, y, .9 * r, x, y, r * 1.1);
                    grd.addColorStop(0, opts.fillStyle);
                    grd.addColorStop(1, "white");

                    self.context.globalAlpha = 0.5;
                    self.context.fillStyle = grd;
                    self.context.fill();
                }
                self._drawSegmentLine(ax, ay, r - w, start);
                self.context.arc(ax, ay, r - w, start, end);
                self.context.closePath();
            };

            //			this.renderHelper(options,render);					

            var detect = function (pos, pxData) {
                var ax = this.dx || 0;
                ax += x;
                var ay = this.dy || 0;
                ay += y;
                var d = Math.sqrt(Math.pow(pos.x - ax, 2) + Math.pow(pos.y - ay, 2));
                //console.log("detect pie|pos.x: %d, pos.y: %d, x: %d, y: %d, d: %d",pos.x,pos.y,x,y,d);
                if (d > r) return false;
                //calculate angle in degree, using sin to avoid infinitive
                var a = Math.asin((pos.y - ay) / d) * 180 / Math.PI;
                //console.log("angle a: %d",a);
                if (a >= 0) {
                    if (pos.x < ax) a = 180 - a;
                } else {
                    a = (pos.x > ax) ? 360 + a : 180 - a;
                }
                //console.log("adjusted angle a: %d",a);
                var start = a0;
                start = (start < 0) ? 360 + start : start;

                var end = a1;
                end = (end < 0) ? 360 + end : end;
                //console.log("start: %d, end: %d",start, end);
                if (start < end)
                    return a >= start && a <= end;
                else {

                    return a >= start || a <= end;
                }

            }
            var pie = new jGraphic.ImageBase(this, options, detect, render);

            return pie;
        },

        /**
		 * draw real image into canvas
		 */
        image: function (orgSrc, x, y, w, h) {
            //var img = document.createElement("img");
            var self = this;
            var render = function () {
                var dx = this.dx || 0;
                var dy = this.dy || 0;
                var ax = x + dx;
                var ay = y + dy;
                //console.log("dx: %d, dy: %d, ax: %d, ay: %d", this.dx, this.dy, ax, ay);

                var src = (this.options && this.options.orgSrc) ? this.options.src : orgSrc;
                var onLoadHandler = function (e) {
                    var img = e.target || e.srcElement;
                    //console.log('get here: img: %s',img.nodeName);

                    w = w || img.width;
                    h = h || img.height;
                    self.context.drawImage(img, ax, ay, w, h);
                    img.isLoaded = true;
                };
                if (imageSrc[src]) {
                    var img = imageSrc[src];
                    if (img.isLoaded) {
                        w = w || img.width;
                        h = h || img.height;
                        self.context.drawImage(img, ax, ay, w, h);
                    }
                    else {
                        $(img).bind('load', onLoadHandler);
                    }
                }
                else {
                    var img, jImg;
                    if (this.isCanvas) {
                        img = document.createElement("img");
                        jImg = $(img);
                    } else {
                        var jImg = $('<img style="visibility:hidden; position: absolute: top: 0, left: 0"/>');
                        img = jImg.get(0);
                        $(document.body).append(img);
                    }

                    jImg.bind('load', onLoadHandler);
                    img.src = src;
                    if (!imageSrc[src]) {
                        imageSrc[src] = img;
                    }
                }
            };
            var detect = function (pos, pxData) {
                var dx = this.dx || 0;
                var dy = this.dy || 0;
                var ax = x + dx;
                var ay = y + dy;
                var x0 = ax,
					x1 = ax + w,
					y0 = ay,
					y1 = ay + h;
                var success = pos.x >= x0 && pos.x <= x1 && pos.y >= y0 && pos.y <= y1;
                return success;
            }
            var image = new jGraphic.ImageBase(this, { src: orgSrc }, detect, render);
            return image;
        },

        /**
		 * Apply linearGradient
		 */
        linearGradient: function (x0, y0, x1, y1, colors) {
            var defaultColors = [[0, black], [1, white]];// list of color
            // stop and the
            // percent
        },

        /**
		 * Radial gradient
		 */
        radialGradient: function (x0, y0, r0, r1, colors) {// if need to
            // provide x1,y1
            // then create
            // manually.
            var defaultColors = [[0, black], [1, white]];// list of color
            // stop and the
            // percent
        },

        /**
		 * wrapper function to apply to the canvas
		 */
        applyOptions: function (options) {
            if (!options)
                return;
            for (var i in options) {
                //console.log("options: %s = %s", i, options[i]);
                this.context[i] = options[i];
            }
        }
    };

    /**
	 * define base class for all shapes and picture It will register the shapes
	 * with jGraphic.
	 */
    jGraphic.ImageBase = function (jGraphicObj, options, detect, render) {
        this.options = $.extend({}, jGraphicObj.defaultOptions, options);
        this.detect = detect;
        this.render = render;
        this.jGraphicObj = jGraphicObj;
        this.guid = jGraphic.Utils.guid();
        this.renderHelper(this.render);
        this.register();
        /*
		 * event is the collection of all event registered. for example: {
		 * 'click' : [handler1, handler2] // type: point to array of handler
		 * will be executed when event happen. }
		 * 
		 */
        this.events = {};
        this.dx = 0;
        this.dy = 0;
        this.isHidden = false;
        this.orgOptions = [];
    };

    jGraphic.ImageBase.prototype = {
        renderHelper: function (render) {
            if (this.isHidden) return;
            this.jGraphicObj.context.save();
            this.jGraphicObj.context.beginPath();
            this.jGraphicObj.applyOptions(this.options);
            render.apply(this);
            this.jGraphicObj.context.fill();
            if (this.options.lineWidth !== 0) {
                this.jGraphicObj.context.stroke();
            }

            this.jGraphicObj.context.restore();
            this.invokeEvent("change");
        },
        register: function () {
            this.jGraphicObj.imageCollection[this.guid] = this;
            this.index = this.jGraphicObj.imageList.push(this.guid) - 1;
        },

        update: function (options) {
            if (options) {
                this.orgOptions.push($.extend({}, this.options));
                $.extend(this.options, options);
                //console.log("this.options: %s", JSON.stringify(this.options));
            }
            this.jGraphicObj.refresh();
        },
        restore: function () {
            var orig = this.orgOptions.pop();
            if (!orig) return;
            this.options = orig;
            //this.renderHelper(this.render);
            this.jGraphicObj.refresh();
        },

        lighten: function (percent) {
            var opt = { "lighten": percent };
            this.orgOptions.push($.extend({}, this.options));
            $.extend(this.options, opt);
            this.jGraphicObj.refresh();
        },
        /**
		 * move down make the index smaller. image will be render from smaller
		 * index to large index, the higher index the more on top it will be.
		 */
        moveDown: function () {
            if (this.index === 0)
                return;
            var tmpGuid = this.jGraphicObj.imageList[this.index - 1];
            this.jGraphicObj.imageList[this.index - 1] = this.guid;
            this.jGraphicObj.imageList[this.index] = tmpGuid;
            this.index -= 1;
            this.jGraphicObj.refresh();
        },

        /**
		 * Move image up the stack
		 */
        moveUp: function () {
            if (this.index === this.jGraphicObj.imageList.length - 1)
                return;
            var tmpGuid = this.jGraphicObj.imageList[this.index + 1];
            this.jGraphicObj.imageList[this.index + 1] = this.guid;
            this.jGraphicObj.imageList[this.index] = tmpGuid;
            this.index += 1;
            this.jGraphicObj.refresh();
        },

        /**
		 * move image to a new location
		 */
        move: function (dx, dy) {
            this.dx += dx;
            this.dy += dy;
            this.jGraphicObj.refresh();
        },

        /**
		 * hide current image by not render but the object still there.
		 */
        hide: function (dx, dy) {
            this.isHidden = true;
            this.jGraphicObj.refresh();
        },

        show: function (dx, dy) {
            this.isHidden = false;
            this.jGraphicObj.refresh();
        },
        //===============================Register Events================================

        /**
		 * wrapper for binding each synthetic event
		 */
        bind: function (events, handler) {
            var arr = events.toLowerCase().split(" ");
            for (var i = 0; i < arr.length; i++) {
                var event = arr[i];
                if (event == "mouseenter") {
                    event = "mouseover";
                }
                if (event == "mouseleave") {
                    event = "mouseout";
                }
                this._registerEvent(event, handler);
            }
        },
        /**
		 * wrapper for unbind each synthetic event
		 */
        unbind: function (events, handler) {
            var arr = events.toLowerCase().split(" ");
            for (var i = 0; i < arr.length; i++) {
                var event = arr[i];
                if (event == "mouseenter") {
                    event = "mouseover";
                }
                if (event == "mouseleave") {
                    event = "mouseout";
                }
                this._unregisterEvent(event, handler);
            }
        },
        /**
		 * direct bind on click event
		 */
        click: function (handler) {
            this._registerEvent("click", handler);
        },
        /**
		 * happen when it call render
		 */
        change: function (handler) {
            this._registerEvent("change", handler);
        },
        /**
		 * direct bind on mouse down event
		 */
        mousedown: function (handler) {
            this._registerEvent("mousedown", handler);
        },
        /**
		 * Direct bind on mouse up event
		 */
        mouseup: function (handler) {
            this._registerEvent("mouseup", handler);
        },
        /**
		 * Direct bind on mouse over event
		 */
        mouseover: function (handler) {
            this._registerEvent("mouseover", handler);
        },
        /**
		 * Direct bind on mouse out event.
		 */
        mouseout: function (handler) {
            this._registerEvent("mouseout", handler);
        },
        /**
		 * Direct bind on mouse move event
		 */
        mousemove: function (handler) {
            this._registerEvent("mousemove", handler);
        },
        /**
		 * Helper function to register event.
		 */
        _registerEvent: function (type, handler) {
            //console.log("_registerEvent: %s",type);
            if (this.events[type]) {
                this.events[type].push(handler);
            } else {
                this.events[type] = [handler];
            }
        },
        /**
		 * Helper function to unregister event
		 */
        _unregisterEvent: function (type, handler) {
            if (!this.events[type])
                return;
            // remove all handlers
            if (handler === undefined) {
                delete this.events[type];
                return;
            }
            var index = this.events[type].indexOf(handler);
            this.events[type].splice(index, 1);
        },
        /**
		 * invoke event handlers register with the images.
		 */
        invokeEvent: function (type) {
            if (!this.events || !this.events[type])
                return;
            for (var i = 0; i < this.events[type].length; i++) {
                var event = {
                    type: type,
                    target: this
                }
                if (typeof (this.events[type][i]) != 'function') continue;
                this.events[type][i].call(this, event);
            }
        }
    };

    /**
	 * Ultility functions.
	 */
    jGraphic.Utils = {
        /**
		 * Get a hash key base on color code
		 */
        hashKey: function (pxData) {
            return this.formatHexColor(pxData[0])
					+ this.formatHexColor(pxData[1])
					+ this.formatHexColor(pxData[2]);
        },

        /**
		 * Get hex color function
		 */
        formatHexColor: function (val) {
            var strVal = "0" + val.toString(16);
            return strVal.slice(-2);
        },

        /**
		 * Helper for guid function
		 */
        s4: function () {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16)
					.substring(1);
        },

        /**
		 * Create guid
		 */
        guid: function () {
            return this.s4() + this.s4() + '-' + this.s4() + '-' + this.s4()
					+ '-' + this.s4() + '-' + this.s4() + this.s4() + this.s4();
        }
    };
})(jQuery)