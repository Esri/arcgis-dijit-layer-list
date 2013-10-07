# Layer Legend Widget

## Features
The LayerLegend widget provides a table of contents and legend view that allows the toggling of layer visibility and sublayers. Each layer has its own legend in an accordian view. The style can be completely changed and skinned to match your own map design.

## Quickstart
	var map = response.map;
    var layers = response.itemInfo.itemData.operationalLayers;
  
    myWidget = new LayerLegend({
      map: map,
      layers: layers
    }, "LayerLegend");
    myWidget.startup();

 [New to Github? Get started here.](https://github.com/)
 
## Documentation

### Setup
Set your dojo config to load the module.

	var package_path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
	var dojoConfig = {
		// The locationPath logic below may look confusing but all its doing is 
		// enabling us to load the api from a CDN and load local modules from the correct location.
		packages: [{
			name: "modules",
			location: package_path + '/js'
		}]
	};

### Require module
Include the module for the legend.

	require(["modules/LayerLegend", ... ], function(LayerLegend, ... ){ ... });

### Constructor

LayerLegend(options, srcNode);

#### Options (Object)
|property|required|type|value|description|
|---|---|---|---|
|theme||string|LayerLegend|CSS Class for uniquely styling the widget.|
|map|x|Map|null|ArcGIS JS Map|
|layers|x|Array|null|Array of layers|
|visible||Boolean|true|Show the widget|
|sublayers||Boolean|false|Show sublayers|
|zoomTo||Boolean|false|Show zoom to link|
|accordion||Boolean|true|Hide open legends when another is opened.|



### Properties
|property|type|description|
|---|---|---|
|theme|string|CSS Class for uniquely styling the widget.|
|map|Map|ArcGIS JS Map|
|layers|Array|Array of layers|
|visible|Boolean|Show the widget|
|sublayers|Boolean|Show sublayers|
|zoomTo|Boolean|Show zoom to link|
|accordion|Boolean|Hide open legends when another is opened.|
|loaded|Boolean|If the widget has been loaded.|

### Methods
#### startup
startup(): Start the widget.
#### destroy
destroy(): Destroy the widget.
#### show
show(): Show the widget.
#### hide
hide(): hide the widget.
#### refresh
refresh(): reload all layers and properties that may have changed.
#### expand
expand(Integer): Expands the legend to the layer index.
#### toggle
toggle(Integer): Expands or collapses the layer index.
#### collapse
collapse(Integer): Collapses the layer index.

### Events
#### load
##### Example
	on(widget, 'load', function(evt){…})
##### Event Object
	{}
	
#### zoom-to
##### Example
	on(widget, 'zoom-to', function(evt){…})
##### Event Object
	{
		layer: <Layer>,
        fullExtent: <Extent>
        index: <integer>
	}
	
	
#### toggle
##### Example
	on(widget, 'toggle', function(evt){…})
##### Event Object
	{
		expand: <Boolean>,
        index: <integer>
	}
	
#### expand
##### Example
	on(widget, 'expand', function(evt){…})
##### Event Object
	{
        index: <integer>
	}
	
#### collapse
##### Example
	on(widget, 'collapse', function(evt){…})
##### Event Object	
	{
        index: <integer>
	}

### CSS Classes
	LL_Container
	LL_Layer
	LL_FirstLayer
	LL_Legend
	LL_Title
	LL_TitleContainer
	LL_Content
	LL_Checkbox
	icon-check-1
	LL_Text
	LL_Expanded
	LL_Visible
	LL_ZoomTo
	LL_SublayerContainer
	LL_Sublayer
	LL_SublayerVisible
	LL_SublayerCheckbox
	LL_SublayerText

## Requirements

* Notepad or HTML editor
* A little background with Javascript
* Experience with the [ArcGIS Javascript API](http://www.esri.com/) would help.

## Resources

* [ArcGIS for JavaScript API Resource Center](http://help.arcgis.com/en/webapi/javascript/arcgis/index.html)
* [ArcGIS Blog](http://blogs.esri.com/esri/arcgis/)
* [twitter@esri](http://twitter.com/esri)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Anyone and everyone is welcome to contribute.

## Licensing
Copyright 2012 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](https://raw.github.com/Esri/geocoder-search-widget-js/master/license.txt) file.

[](Esri Tags: ArcGIS JavaScript API Layer Legend TOC Table of Contents Public)
[](Esri Language: JavaScript)