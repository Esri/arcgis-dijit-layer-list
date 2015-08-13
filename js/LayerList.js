define([
  "dojo/_base/array",
  "dojo/_base/declare",
  "dojo/_base/lang",

  "esri/kernel",
  "dojo/uacss",

  "dojo/Deferred",
  "dojo/on",

  "dojo/dom-class",
  "dojo/dom-style",
  "dojo/dom-construct",
  "dojo/dom-attr",

  "dojo/i18n!./LayerList/nls/LayerList",

  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",

  "esri/promiseList",

  "esri/layerUtils",

  "dojo/text!./LayerList/templates/LayerList.html"
],
  function (
    array, declare, lang,
    esriNS, has,
    Deferred, on,
    domClass, domStyle, domConstruct, domAttr,
    i18n,
    _WidgetBase, _TemplatedMixin,
    promiseList,
    layerUtils,
    dijitTemplate
  ) {

    var Widget = declare([_WidgetBase, _TemplatedMixin], {

      templateString: dijitTemplate,

      defaults: {
        theme: "esriLayerList",
        map: null,
        layers: null,
        subLayers: true,
        showOpacitySlider: false,
        showLegend: false,
        removeUnderscores: true,
        visible: true
      },

      // lifecycle: 1
      constructor: function (options) {
        // mix properties
        var properties = lang.mixin({}, this.defaults, options);
        this.set(properties);
        // classes
        this.css = {
          container: "esriContainer",
          noLayers: "esriNoLayers",
          noLayersText: "esriNoLayersText",
          slider: "esriSlider",
          legend: "esriLegend",
          list: "esriList",
          listExpand: "esriListExpand",
          listVisible: "esriListVisible",
          subList: "esriSubList",
          hasSubList: "esriHasSubList",
          subListLayer: "esriSubListLayer",
          layer: "esriLayer",
          layerScaleInvisible: "esriScaleInvisible",
          title: "esriTitle",
          titleContainer: "esriTitleContainer",
          checkbox: "esriCheckbox",
          label: "esriLabel",
          button: "esriButton",
          content: "esriContent",
          clear: "esriClear"
        };
      },

      postCreate: function () {
        this.inherited(arguments);
        var _self = this;
        // when checkbox is clicked
        this.own(on(this._layersNode, "." + this.css.checkbox + ":click", function () {
          var data, subData;
          // layer index
          data = domAttr.get(this, "data-layer-index");
          // subLayer index
          subData = domAttr.get(this, "data-sublayer-index");
          // expand/collapse if necessary
          _self._toggleState(data, subData);
          // toggle layer visibility
          _self._toggleLayer(data, subData);
        }));
      },

      // start widget. called by user
      startup: function () {
        this.inherited(arguments);
        this._mapLoaded(this.map).then(lang.hitch(this, this._init));
      },

      // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
      destroy: function () {
        this._removeEvents();
        this.inherited(arguments);
      },

      /* ---------------- */
      /* Public Functions */
      /* ---------------- */

      refresh: function () {
        // all layer info
        var layers = this.layers;
        // store nodes here
        this._nodes = [];
        var promises = [];
        // if we got layers
        if (layers && layers.length) {
          for (var i = 0; i < layers.length; i++) {
            promises.push(this._layerLoaded(i));
          }
        }
        // wait for layers to load or fail
        return promiseList(promises).always(lang.hitch(this, function (response) {
          this._loadedLayers = response;
          this._removeEvents();
          this._createLayerNodes();
          this._setLayerEvents();
          this.emit("refresh");
        }));
      },

      /* ---------------- */
      /* Private Functions */
      /* ---------------- */

      _mapLoaded: function (map) {
        var def = new Deferred();
        if (map) {
          // when map is loaded
          if (map.loaded) {
            def.resolve();
          } else {
            on.once(map, "load", lang.hitch(this, function () {
              def.resolve();
            }));
          }
        } else {
          def.resolve();
        }
        return def.promise;
      },

      _layerLoaded: function (layerIndex) {
        var layers = this.layers;
        var layerInfo = layers[layerIndex];
        var layer = layerInfo.layer;
        // returned event
        var evt = {
          layer: layer,
          layerInfo: layerInfo,
          layerIndex: layerIndex
        };
        var def = new Deferred();
        if (layer) {
          if (layer.loaded) {
            // nothing to do
            def.resolve(evt);
          } else if (layer.loadError) {
            def.reject(layer.loadError);
          } else {
            var loadedEvent, errorEvent;
            // once layer is loaded
            loadedEvent = on.once(layer, "load", lang.hitch(this, function () {
              errorEvent.remove();
              def.resolve(evt);
            }));
            // error occurred loading layer
            errorEvent = on.once(layer, "error", lang.hitch(this, function (error) {
              loadedEvent.remove();
              def.reject(error);
            }));
          }
        } else {
          def.resolve(evt);
        }
        return def.promise;
      },

      _checkboxStatus: function (layerInfo) {
        return !!layerInfo.visibility;
      },

      _WMSVisible: function (layerInfo, subLayerInfo) {
        var visibleLayers = [];
        if (layerInfo && layerInfo.layer) {
          visibleLayers = layerInfo.layer.visibleLayers;
        }
        return array.indexOf(visibleLayers, subLayerInfo.name) > -1;
      },

      _subCheckboxStatus: function (layerInfo, subLayerInfo) {
        var checked;
        var layerType = layerInfo.layer.declaredClass;
        switch (layerType) {
        case "esri.layers.KMLLayer":
          checked = subLayerInfo.visible;
          break;
        case "esri.layers.WMSLayer":
          checked = this._WMSVisible(layerInfo, subLayerInfo);
          break;
        default:
          checked = subLayerInfo.defaultVisibility;
        }
        return checked;
      },

      _getLayerTitle: function (e) {
        var title = "",
          layer = e.layer,
          layerInfo = e.layerInfo;
        // get best title
        if (layerInfo && layerInfo.title) {
          title = layerInfo.title;
        } else if (layer && layer.arcgisProps && layer.arcgisProps.title) {
          title = layer.arcgisProps.title;
        } else if (layer && layer.name) {
          title = layer.name;
        } else if (layerInfo && layerInfo.id) {
          title = layerInfo.id;
        } else if (layer && layer.id) {
          title = layer.id;
        }
        // optionally remove underscores
        return this.removeUnderscores ? title.replace(/_/g, " ") : title;
      },

      _showSublayers: function (layerInfo) {
        return layerInfo.hasOwnProperty("subLayers") ? layerInfo.subLayers : this.subLayers;
      },

      _opacityChange: function (value) {
        if (this.layer) {
          this.layer.setOpacity(value);
        } else if (this.layers) {
          for (var i = 0; i < this.layers.length; i++) {
            if (this.layers[i].layerObject) {
              this.layers[i].layerObject.setOpacity(value);
            }
          }
        }
      },

      _legend: function (titleNode, layerInfo) {
        require(["esri/dijit/Legend"], lang.hitch(this, function (Legend) {
          var legendInfo = [layerInfo];
          if (layerInfo && layerInfo.featureCollection && layerInfo.featureCollection.layers) {
            legendInfo = layerInfo.featureCollection.layers;
            for (var i = 0; i < legendInfo.length; i++) {
              legendInfo[i].layer = legendInfo[i].layerObject;
            }
          }
          var legendDiv = domConstruct.create("div", {
            className: this.css.legend
          }, titleNode);
          var legend = new Legend({
            map: this.map,
            layerInfos: legendInfo
          }, domConstruct.create("div"));
          domConstruct.place(legend.domNode, legendDiv);
          legend.startup();
        }));
      },

      _slider: function (titleNode, layer, layers, opacity) {
        require(["dijit/form/HorizontalSlider"], lang.hitch(this, function (HorizontalSlider) {
          var sliderDiv = domConstruct.create("div", {
            className: this.css.slider
          }, titleNode);
          var slider = new HorizontalSlider({
            showButtons: false,
            minimum: 0.1,
            maximum: 1,
            layer: layer,
            layers: layers,
            discreteValues: 0.1,
            value: opacity,
            onChange: this._opacityChange
          }, domConstruct.create("div"));
          domConstruct.place(slider.domNode, sliderDiv);
          slider.startup();
        }));
      },

      _createLayerNodes: function () {
        // clear node
        this._layersNode.innerHTML = "";
        this._noLayersNode.innerHTML = "";
        domClass.remove(this._container, this.css.noLayers);
        var loadedLayers = this._loadedLayers;
        if (loadedLayers && loadedLayers.length) {
          // create nodes for each layer
          for (var i = 0; i < loadedLayers.length; i++) {
            var response = loadedLayers[i];
            if (response) {
              var layer = response.layer;
              var layerIndex = response.layerIndex;
              var layerInfo = response.layerInfo;
              if (layerInfo) {
                if (layerInfo.featureCollection && !layerInfo.hasOwnProperty("visibility")) {
                  var firstLayer = layerInfo.featureCollection.layers[0];
                  if (firstLayer && firstLayer.layerObject) {
                    layerInfo.visibility = firstLayer.layerObject.visible;
                  }
                }
                // set visibility on layer info if not set
                if (layer && !layerInfo.hasOwnProperty("visibility")) {
                  layerInfo.visibility = layerInfo.layer.visible;
                }
                // set layer info id
                if (layer && !layerInfo.hasOwnProperty("id")) {
                  layerInfo.id = layerInfo.layer.id;
                }
                var subLayers;
                // layer node
                var layerNode = domConstruct.create("li", {
                  className: this.css.layer
                });
                // currently visible layer
                if (layer && !layer.visibleAtMapScale) {
                  domClass.add(layerNode, this.css.layerScaleInvisible);
                }
                domConstruct.place(layerNode, this._layersNode, "first");
                // title of layer
                var titleNode = domConstruct.create("div", {
                  className: this.css.title
                }, layerNode);
                // nodes for subLayers
                var subNodes = [];
                var layerType;
                if (layer) {
                  layerType = layer.declaredClass;
                }
                // get parent layer checkbox status
                var status = this._checkboxStatus(layerInfo);
                // title container
                var titleContainerNode = domConstruct.create("div", {
                  className: this.css.titleContainer
                }, titleNode);
                var id = this.id + "_checkbox_" + layerIndex;
                // Title checkbox
                var checkboxNode = domConstruct.create("input", {
                  type: "checkbox",
                  id: id,
                  "data-layer-index": layerIndex,
                  className: this.css.checkbox
                }, titleContainerNode);
                domAttr.set(checkboxNode, "checked", status);
                // optional button icon
                var buttonNode;
                if (layerInfo.button) {
                  buttonNode = domConstruct.create("div", {
                    className: this.css.button
                  }, titleContainerNode);
                  domConstruct.place(layerInfo.button, buttonNode);
                }
                // Title text
                var title = this._getLayerTitle(response);
                var labelNode = domConstruct.create("label", {
                  className: this.css.label,
                  textContent: title
                }, titleContainerNode);
                domAttr.set(labelNode, "for", id);
                // clear css
                var clearNode = domConstruct.create("div", {
                  className: this.css.clear
                }, titleContainerNode);
                // opacity slider
                if (layerInfo.hasOwnProperty("showOpacitySlider") ? layerInfo.showOpacitySlider : this.showOpacitySlider) {
                  var layers, opacity;
                  if (!layer && layerInfo.featureCollection) {
                    layers = layerInfo.featureCollection.layers;
                    opacity = layerInfo.featureCollection.layers[0].opacity;
                  } else {
                    opacity = layer.opacity;
                  }
                  this._slider(titleNode, layer, layers, opacity);
                }
                // legend
                if (layerInfo.hasOwnProperty("showLegend") ? layerInfo.showLegend : this.showLegend) {
                  this._legend(titleNode, layerInfo);
                }
                // optional custom content
                var contentNode;
                if (layerInfo.content) {
                  contentNode = domConstruct.create("div", {
                    className: this.css.content
                  }, titleNode);
                  domConstruct.place(layerInfo.content, contentNode);
                }
                // lets save all the nodes for events
                var nodesObj = {
                  checkbox: checkboxNode,
                  title: titleNode,
                  titleContainer: titleContainerNode,
                  label: labelNode,
                  layer: layerNode,
                  clear: clearNode,
                  button: buttonNode,
                  content: contentNode,
                  subNodes: subNodes
                };
                this._nodes[layerIndex] = nodesObj;
                domClass.toggle(layerNode, this.css.listVisible, status);
                if (layer) {
                  // subLayers from thier info. Also WMS layers
                  subLayers = layer.layerInfos;
                  // KML subLayers
                  if (layerType === "esri.layers.KMLLayer") {
                    subLayers = layer.folders;
                  }
                  // if we have more than one subLayer and layer is of valid type for subLayers
                  if (this._showSublayers(layerInfo) && layerType !== "esri.layers.ArcGISTiledMapServiceLayer" && subLayers && subLayers.length) {
                    domClass.add(layerNode, this.css.hasSubList);
                    domClass.toggle(layerNode, this.css.listExpand, status);
                    // create subLayer list
                    var subListNode = domConstruct.create("ul", {
                      className: this.css.subList
                    }, layerNode);
                    var oneSubLayerOn;
                    var subSubLists = [];
                    // create each subLayer item
                    for (var j = 0; j < subLayers.length; j++) {
                      // subLayer info
                      var subLayer = subLayers[j];
                      var subLayerIndex;
                      var parentId = -1;
                      var subSubListNode = null;
                      // Dynamic Map Service
                      if (layerType === "esri.layers.ArcGISDynamicMapServiceLayer") {
                        subLayerIndex = subLayer.id;
                        parentId = subLayer.parentLayerId;
                      }
                      // KML
                      else if (layerType === "esri.layers.KMLLayer") {
                        subLayerIndex = subLayer.id;
                        parentId = subLayer.parentFolderId;
                      }
                      // WMS
                      else if (layerType === "esri.layers.WMSLayer") {
                        subLayerIndex = subLayer.name;
                        parentId = -1;
                      }
                      // place subLayers not in the root
                      if (parentId !== -1) {
                        var parent = this._nodes[layerIndex].subNodes[parentId];
                        if (subSubLists[parentId]) {
                          subSubListNode = subSubLists[parentId];
                        } else {
                          var parentLayer = parent.subLayer;
                          subSubListNode = domConstruct.create("ul", {
                            className: this.css.subList
                          }, parentLayer);
                          domClass.add(parentLayer, this.css.hasSubList);
                          domClass.toggle(parentLayer, [this.css.listVisible, this.css.listExpand], subChecked);
                          subSubLists[parentId] = subSubListNode;
                        }
                      }
                      // default checked state
                      var subChecked = this._subCheckboxStatus(layerInfo, subLayer);
                      if (subChecked && !oneSubLayerOn) {
                        oneSubLayerOn = true;
                      }
                      var subId = this.id + "_checkbox_sub_" + layerIndex + "_" + subLayerIndex;
                      // list item node
                      var subLayerNode = domConstruct.create("li", {
                        className: this.css.subListLayer
                      }, subSubListNode || subListNode);
                      // title of subLayer layer
                      var subTitleNode = domConstruct.create("div", {
                        className: this.css.title
                      }, subLayerNode);
                      // subLayer title container
                      var subTitleContainerNode = domConstruct.create("div", {
                        className: this.css.titleContainer
                      }, subTitleNode);
                      // subLayer checkbox
                      var subCheckboxNode = domConstruct.create("input", {
                        type: "checkbox",
                        id: subId,
                        "data-layer-index": layerIndex,
                        "data-sublayer-index": subLayerIndex,
                        className: this.css.checkbox
                      }, subTitleContainerNode);
                      domAttr.set(subCheckboxNode, "checked", subChecked);
                      // subLayer Title text
                      var subTitle = subLayer.title || subLayer.name || "";
                      var subLabelNode = domConstruct.create("label", {
                        className: this.css.label,
                        textContent: subTitle
                      }, subTitleContainerNode);
                      domAttr.set(subLabelNode, "for", subId);
                      // subLayer clear css
                      var subClearNode = domConstruct.create("div", {
                        className: this.css.clear
                      }, subTitleContainerNode);
                      // object of subLayer nodes
                      var subNode = {
                        subList: subListNode,
                        subSubList: subSubListNode,
                        subLayer: subLayerNode,
                        subTitle: subTitleNode,
                        subTitleContainer: subTitleContainerNode,
                        subCheckbox: subCheckboxNode,
                        subLabel: subLabelNode,
                        subClear: subClearNode
                      };
                      // add node to array
                      subNodes[subLayerIndex] = subNode;
                    }
                  }
                }
              }
            }
          }
        } else {
          domClass.add(this._container, this.css.noLayers);
          domAttr.set(this._noLayersNode, "textContent", i18n.widgets.layerList.noLayers);
        }
      },

      _removeEvents: function () {
        // layer visibility events
        if (this._layerEvents && this._layerEvents.length) {
          for (var i = 0; i < this._layerEvents.length; i++) {
            this._layerEvents[i].remove();
          }
        }
        this._layerEvents = [];
      },

      _emitToggle: function (layerIndex, subLayerIndex, visible) {
        // emit event
        this.emit("toggle", {
          layerIndex: layerIndex,
          subLayerIndex: subLayerIndex,
          visible: visible
        });
      },

      _toggleVisible: function (index, visible) {
        var node = this._nodes[index].checkbox;
        domClass.toggle(this._nodes[index].layer, this.css.listVisible, visible);
        var checked = domAttr.get(node, "checked");
        if (domClass.contains(this._nodes[index].layer, this.css.hasSubList)) {
          domClass.toggle(this._nodes[index].layer, this.css.listExpand, checked);
        }
        if (checked !== visible) {
          // update checkbox and layer visibility classes
          domAttr.set(node, "checked", visible);
          this._emitToggle(index, null, visible);
        }
      },

      _layerVisChangeEvent: function (response, featureCollection, subLayerIndex) {
        var layer;
        // layer is a feature collection
        if (featureCollection) {
          // all subLayers
          var fcLayers = response.layerInfo.featureCollection.layers;
          // current layer object to setup event for
          layer = fcLayers[subLayerIndex].layer;
        } else {
          // layer object for event
          layer = response.layer;
        }
        // layer visibility changes
        var visChange = on(layer, "visibility-change", lang.hitch(this, function (evt) {
          if (featureCollection) {
            this._featureCollectionVisible(response.layerIndex, evt.visible);
          } else {
            // update checkbox and layer visibility classes
            this._toggleVisible(response.layerIndex, evt.visible);
          }
        }));
        this._layerEvents.push(visChange);
        if (!featureCollection) {
          // scale visibility changes
          var scaleVisChange = on(layer, "scale-visibility-change", lang.hitch(this, function (evt) {
            var visible = evt.target.visibleAtMapScale;
            domClass.toggle(this._nodes[response.layerIndex].layer, this.css.layerScaleInvisible, !visible);
          }));
          this._layerEvents.push(scaleVisChange);
          // show out of scale range for sublayers if its a map service
          if (layer.declaredClass === "esri.layers.ArcGISDynamicMapServiceLayer") {
            // on map LOD change
            var zoomChange = on(this.map, "zoom-end", lang.hitch(this, function () {
              // gray out invisible sublayers
              this._subLayerScale(response);
            }));
            this._layerEvents.push(zoomChange);
            // gray out invisible sublayers
            this._subLayerScale(response);
          }
        }
      },

      // gray out invisible sublayers
      _subLayerScale: function (response) {
        var layer = response.layer;
        var dynLayerInfos = layer.createDynamicLayerInfosFromLayerInfos();
        var layersInScale = layerUtils._getLayersForScale(this.map.getScale(), dynLayerInfos);
        array.forEach(dynLayerInfos, lang.hitch(this, function (layerInfo) {
          if (!layerInfo.subLayerIds) { // skip group layers
            var subLayerId = layerInfo.id;
            var subLayerNode = this._nodes[response.layerIndex].subNodes[subLayerId].subLayer;
            var scaleInvisible = false;
            // if visible and in scale
            if (array.indexOf(layersInScale, subLayerId) === -1) {
              scaleInvisible = true;
            }
            domClass.toggle(subLayerNode, this.css.layerScaleInvisible, scaleInvisible);
          }
        }));
      },

      _layerEvent: function (response) {
        var layerInfo = response.layerInfo;
        // feature collection layer
        if (layerInfo.featureCollection && layerInfo.featureCollection.layers && layerInfo.featureCollection.layers.length) {
          // feature collection layers
          var fsLayers = layerInfo.featureCollection.layers;
          if (fsLayers && fsLayers.length) {
            // make event for each layer
            for (var i = 0; i < fsLayers.length; i++) {
              // layer visibility changes
              this._layerVisChangeEvent(response, true, i);
            }
          }
        } else {
          // layer visibility changes
          this._layerVisChangeEvent(response);
          // todo: need to figure out way to support visibility change of map service, WMS, & KML sublayers outside of widget
        }
      },

      _getVisibleLayers: function (layer, subLayerIndex) {
        var layerInfos = layer.layerInfos;
        var i;
        // array for setting visible layers
        var visibleLayers = [-1];

        if (typeof subLayerIndex !== "undefined") {
          var newVis = !layerInfos[subLayerIndex].defaultVisibility;
          // reverse current visibility of sublayer
          layerInfos[subLayerIndex].defaultVisibility = newVis;
        }

        // for each sublayer
        for (i = 0; i < layerInfos.length; i++) {
          var info = layerInfos[i];
          // push to visible layers if it's visible
          if (info.defaultVisibility) {
            visibleLayers.push(info.id);
            var negative = array.lastIndexOf(visibleLayers, -1);
            if (negative !== -1) {
              visibleLayers.splice(negative, 1);
            }
          }
        }
        //Now that the array of visibleLayer Ids is assembled,
        //strip off Ids of invisible child layers, and
        //Ids of group layers (group layer Ids should not be submitted 
        //in .setVisible() or loss of toggle control madness ensues.
        //Remove layers whos parents are not visible:
        var noInvisibleParents = [];
        for (i = 0; i < visibleLayers.length; i++) {
          var id = visibleLayers[i];
          var hasParentsInVisibleArray = this._allIdsPresent(layer, id, visibleLayers);
          if (hasParentsInVisibleArray) {
            noInvisibleParents.push(id);
          }
        }
        var noGroups = [];
        for (var j = 0; j < noInvisibleParents.length; j++) {
          var lyrInfo = this._getLayerInfo(layer, noInvisibleParents[j]);
          if (lyrInfo && lyrInfo.subLayerIds === null) {
            noGroups.push(noInvisibleParents[j]);
          }
        }
        // note: set -1 if array is empty.
        if (!noGroups.length) {
          noGroups = [-1];
        }
        return noGroups;
      },

      _toggleState: function (layerIndex, subLayerIndex) {
        var layerNode, checkboxNode;
        layerIndex = parseInt(layerIndex, 10);
        var layerNodes = this._nodes[layerIndex];
        if (subLayerIndex !== null) {
          subLayerIndex = parseInt(subLayerIndex, 10);
          layerNode = layerNodes.subNodes[subLayerIndex].subLayer;
          checkboxNode = layerNodes.subNodes[subLayerIndex].subCheckbox;
        } else {
          layerNode = layerNodes.layer;
          checkboxNode = layerNodes.checkbox;
        }
        var status = domAttr.get(checkboxNode, "checked");
        if (domClass.contains(layerNode, this.css.hasSubList)) {
          domClass.toggle(layerNode, this.css.listExpand, status);
        }
        domClass.toggle(layerNode, this.css.listVisible, status);
      },

      _toggleLayer: function (layerIndex, subLayerIndex) {
        // all layers
        if (this.layers && this.layers.length) {
          var newVis;
          layerIndex = parseInt(layerIndex, 10);
          var layerInfo = this.layers[layerIndex];
          var layer = layerInfo.layer;
          var layerType;
          if (layer) {
            layerType = layer.declaredClass;
          }
          var featureCollection = layerInfo.featureCollection;
          var visibleLayers;
          var i;
          // feature collection layer
          if (featureCollection) {
            // new visibility
            newVis = !layerInfo.visibility;
            // set visibility for layer reference
            layerInfo.visibility = newVis;
            // toggle all sub layers
            for (i = 0; i < featureCollection.layers.length; i++) {
              var fcLayer = featureCollection.layers[i].layerObject;
              // toggle to new visibility
              fcLayer.setVisibility(newVis);
            }
          }
          // layer
          else if (layer) {
            // we're toggling a sublayer
            if (subLayerIndex !== null) {
              // Map Service Layer
              if (layerType === "esri.layers.ArcGISDynamicMapServiceLayer") {
                subLayerIndex = parseInt(subLayerIndex, 10);
                visibleLayers = this._getVisibleLayers(layer, subLayerIndex);
                // set visible sublayers which are not grouped
                layer.setVisibleLayers(visibleLayers);
              }
              // KML Layer
              else if (layerType === "esri.layers.KMLLayer") {
                subLayerIndex = parseInt(subLayerIndex, 10);
                var folders = layer.folders;
                // for each sublayer
                for (i = 0; i < folders.length; i++) {
                  var folder = folders[i];
                  if (folder.id === subLayerIndex) {
                    layer.setFolderVisibility(folder, !folder.visible);
                    break;
                  }
                }
              } else if (layerType === "esri.layers.WMSLayer") {
                visibleLayers = layer.visibleLayers;
                var found = array.indexOf(visibleLayers, subLayerIndex);
                if (found === -1) {
                  visibleLayers.push(subLayerIndex);
                } else {
                  visibleLayers.splice(found, 1);
                }
                layer.setVisibleLayers(visibleLayers);
              }
            }
            // parent map layer
            else {
              if (layerType === "esri.layers.ArcGISDynamicMapServiceLayer") {
                visibleLayers = this._getVisibleLayers(layer);
                layer.setVisibleLayers(visibleLayers);
              }
              // reverse current visibility of parent layer
              newVis = !layer.visible;
              // new visibility of parent layer
              layerInfo.visibility = newVis;
              layer.setVisibility(newVis);
            }
          }
          // Just layer object
          else {
            newVis = !layerInfo.visible;
            layerInfo.setVisibility(newVis);
          }
          // emit event
          this._emitToggle(layerIndex, subLayerIndex, newVis);
        }
      },

      _featureCollectionVisible: function (index, visible) {
        var layer = this.layers[index];
        // all layers either visible or not
        var equal;
        // feature collection layers turned on by default
        var visibleLayers = layer.visibleLayers;
        // feature collection layers
        var layers = layer.featureCollection.layers;
        // if we have layers set
        if (visibleLayers && visibleLayers.length) {
          // check if all layers have same visibility
          equal = array.every(visibleLayers, function (item) {
            // check if current layer has same as first layer
            return layers[item].layer.visible === visible;
          });
        } else {
          // check if all layers have same visibility
          equal = array.every(layers, function (item) {
            // check if current layer has same as first layer
            return item.layer.visible === visible;
          });
        }
        // all are the same
        if (equal) {
          this._toggleVisible(index, visible);
        }
      },

      _setLayerEvents: function () {
        // this function sets up all the events for layers
        var layers = this._loadedLayers;
        if (layers && layers.length) {
          // get all layers
          for (var i = 0; i < layers.length; i++) {
            var response = layers[i];
            // if we have a layer
            if (response.layer) {
              // create necessary events
              this._layerEvent(response);
            }
          }
        }
      },

      _allIdsPresent: function (layer, layerId, arrayOfIds) {
        //Returns false if any Ids are not present in the supplied array of Ids.
        var parentIds = this._walkUpLayerIds(layer, layerId);
        //If any of the parentIds are NOT in the arrayOfIds return false:
        return array.every(parentIds, function (id) {
          return array.indexOf(arrayOfIds, id) > -1;
        });
      },

      _walkUpLayerIds: function (layer, layerId) {
        //returns array of layerIds of all parents of layerId
        var layerInfo = this._getLayerInfo(layer, layerId);
        var parentLayerInfo;
        var parentLayerIds = [];
        if (layerInfo) {
          //If the current layerInfo layerInfo doesn't have a parent,
          //then we're at the top of the hierarchy and should return the result.
          while (layerInfo.parentLayerId !== -1) {
            //A parent exists, save the info and add to the array:
            parentLayerInfo = this._getLayerInfo(layer, layerInfo.parentLayerId);
            if (parentLayerInfo) {
              parentLayerIds.push(parentLayerInfo.id);
            }
            //Move up hierarchy: reassign the layerInfo to the parent. Loop.
            layerInfo = parentLayerInfo;
          }
        }
        return parentLayerIds;
      },

      _getLayerInfo: function (layer, layerId) {
        //Get the layerInfo for layerId from the layer:
        var info;
        for (var i = 0; i < layer.layerInfos.length; i++) {
          var layerInfo = layer.layerInfos[i];
          if (layerInfo.id === layerId) {
            //we have our desired layerInfo.
            info = layerInfo;
            break;
          }
        }
        return info;
      },

      _isSupportedLayerType: function (layer) {
        return layer && !layer._basemapGalleryLayerType || layer && layer._basemapGalleryLayerType !== "basemap";
      },

      _createLayerInfo: function (layer) {
        return {
          layer: layer
        };
      },

      _updateAllMapLayers: function () {
        if (this.map && (!this.layers || !this.layers.length)) {
          var layers = [];
          // get all non graphic layers
          array.forEach(this.map.layerIds, function (layerId) {
            var layer = this.map.getLayer(layerId);
            if (this._isSupportedLayerType(layer)) {
              layers.push(this._createLayerInfo(layer));
            }
          }, this);
          // get all graphic layers
          array.forEach(this.map.graphicsLayerIds, function (layerId) {
            var layer = this.map.getLayer(layerId);
            // check drawMode so we don't include layers created for pop-ups        
            if (this._isSupportedLayerType(layer) && layer._params && layer._params.drawMode) {
              layers.push(this._createLayerInfo(layer));
            }
          }, this);
          this._set("layers", layers);
        }
      },

      _init: function () {
        this._visible();
        this._updateAllMapLayers();
        this.refresh().always(lang.hitch(this, function () {
          this.set("loaded", true);
          this.emit("load");
        }));
      },

      _visible: function () {
        if (this.visible) {
          domStyle.set(this.domNode, "display", "block");
        } else {
          domStyle.set(this.domNode, "display", "none");
        }
      },

      /* stateful properties */

      _setThemeAttr: function (newVal) {
        if (this.domNode) {
          domClass.remove(this.domNode, this.theme);
          domClass.add(this.domNode, newVal);
        }
        this._set("theme", newVal);
      },

      _setMapAttr: function (newVal) {
        this._set("map", newVal);
        if (this._created) {
          this._mapLoaded(this.map).then(lang.hitch(this, function () {
            this._updateAllMapLayers();
            this.refresh();
          }));
        }
      },

      _setLayersAttr: function (newVal) {
        this._set("layers", newVal);
        if (this._created) {
          this.refresh();
        }
      },

      _setRemoveUnderscoresAttr: function (newVal) {
        this._set("removeUnderscores", newVal);
        if (this._created) {
          this.refresh();
        }
      },

      _setSubLayersAttr: function (newVal) {
        this._set("subLayers", newVal);
        if (this._created) {
          this.refresh();
        }
      },

      _setShowOpacitySliderAttr: function (newVal) {
        this._set("showOpacitySlider", newVal);
        if (this._created) {
          this.refresh();
        }
      },

      _setShowLegendAttr: function (newVal) {
        this._set("showLegend", newVal);
        if (this._created) {
          this.refresh();
        }
      },

      _setVisibleAttr: function (newVal) {
        this._set("visible", newVal);
        if (this._created) {
          this._visible();
        }
      }

    });
    if (has("extend-esri")) {
      lang.setObject("dijit.LayerList", Widget, esriNS);
    }
    return Widget;
  });