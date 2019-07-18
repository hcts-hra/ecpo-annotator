# Image annotation tool

This is an eXist-db-based application that allows graphical image annotation.

Users can draw different shapes on top of images (rectangles, circles, polygons) and store these
selections as part of an standoff annotation which will contain the selections as SVG.

The app provides the following functions:

* loading images from a iiif server
* loading of annotations from WAP app
* zooming of images
* full screen mode
* image pan
* switch between filled and non-filled mode for shapes
* drawing of rectangles, circles and polygons
* deletion of shapes
* editing of a shapes allowing to move single points of a shape
* storing shapes as annotations via WAP app
* grouping shapes
* assigning a label to a shape or group

The separate [WAP app](https://gitlab.existsolutions.com/foss/web-annotation-protocol) implements
the basics of the [Web Annotation Protocol](https://www.w3.org/TR/annotation-protocol/) to allow storage of the 
standoff annotations.

## Implemenation Notes

The application is built as an [eXist-db](https://exist-db.org) application and relies
on Polymer 2.0 Web Components in the frontend. 

## Requirements and Dependencies

* eXist-db 5.0rc8 or higher
* [WAP](https://gitlab.existsolutions.com/foss/web-annotation-protocol) 3.0.0 or higher
* Polymer 2.x (bundled)
* OpenSeadragon 2.3.0 or higher (bundled)
* Fabricjs 2.6.0 or higher (bundled)


## Building the app

The app is built via Ant with this command:

```
ant xar
```

