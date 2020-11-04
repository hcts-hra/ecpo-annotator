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

* eXist-db 5.0.0 or higher
* [WAP](https://github.com/eXistSolutions/web-annotation-service/releases) 3.0.3 or higher
* Polymer 2.x (bundled)

* OpenSeadragon 2.4.0 or higher (bundled)
* Fabricjs 3.6.1 or higher (bundled)


## Building the app

Install npm and bower dependencies

```
npm install
```

```
bower install
```

The app is then built via Ant with this command:

```
ant xar
```

Since the xar task is the default you can also just call

```
ant
```

## Development

`gulpfile.js` in the project root defines two tasks `gulp deploy` and `gulp watch` that lets you 
upload and test changes you made to the code without having to package and install ecpo each time.

For this to work you might have to adapt the connection settings on your local checkout to match
your settings.

NOTE: do not commit those changes

The default connection settings are:

```
const exClient = exist.createClient({
    host: 'localhost',
    port: '8080',
    path: '/exist/xmlrpc',
    basic_auth: {user: 'admin', pass: ''}
})
```
