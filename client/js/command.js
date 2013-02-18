/*global window kampfer console localStorage*/
kampfer.require('Class');
kampfer.require('JSON');
kampfer.require('BlobBuilder');
kampfer.require('saveAs');
kampfer.require('mindMap.Node');
kampfer.require('mindMap.Map');
kampfer.require('mindMap.MapManager');
kampfer.require('mindMap.MapsManager');

kampfer.provide('mindMap.command');
kampfer.provide('mindMap.map');
kampfer.provide('mindMap.mapManager');
kampfer.provide('mindMap.mapsManager');
kampfer.provide('mindMap.command.commandStack');

kampfer.mindMap.map = null;

kampfer.mindMap.mapManager = null;

kampfer.mindMap.mapsManager = new kampfer.mindMap.MapsManager('mindMap');

kampfer.mindMap.command.Base = kampfer.Class.extend({
    initializer : function() {},

    execute : function() {},

    unExecute : function() {},

    needPush : false,

    dispose : function() {}
});


kampfer.mindMap.command.CreateNewMap = kampfer.mindMap.command.Base.extend({
    initializer : function(data, view) {
        this.view = view;
    },

    execute : function() {
        kampfer.mindMap.mapManager = new kampfer.mindMap.MapManager();

        kampfer.mindMap.map = new kampfer.mindMap.Map(kampfer.mindMap.mapManager);

        this.view.addChild(kampfer.mindMap.map, true);
    },

    dispose : function() {
        delete this.view;
    }
});

kampfer.mindMap.command.CreateNewMap.isAvailable = function() {
    if(kampfer.mindMap.map || kampfer.mindMap.mapManager) {
        return false;
    }
    return true;
};


kampfer.mindMap.command.SaveMapInStorage = kampfer.mindMap.command.Base.extend({
    execute : function() {
        var map = kampfer.mindMap.mapManager.getMapData();
        kampfer.mindMap.mapsManager.saveMapToLocalStorage(map);
    }
});

kampfer.mindMap.command.SaveMapInStorage.isAvailable = function() {
    if(kampfer.mindMap.map && kampfer.mindMap.mapManager) {
        return true;
    }
    return false;
};


kampfer.mindMap.command.SaveMapInDisk = kampfer.mindMap.command.Base.extend({
    execute : function() {
        var content = JSON.stringify( kampfer.mindMap.mapManager.getMapData() );
        var mapName = kampfer.mindMap.mapManager.getMapName();
        //The standard W3C File API BlobBuilder interface is not available in all browsers.
        //BlobBuilder.js is a cross-browser BlobBuilder implementation that solves this.
        var bb = new kampfer.BlobBuilder();
        bb.append(content);
        kampfer.saveAs( bb.getBlob('text/plain;charset=utf-8'), mapName + '.json' );
    }
});

kampfer.mindMap.command.SaveMapInDisk.isAvailable =
    kampfer.mindMap.command.SaveMapInStorage.isAvailable;


kampfer.mindMap.command.OpenMapInDisk = kampfer.mindMap.command.Base.extend({
    initializer : function(data, view) {
        if(!kampfer.mindMap.command.OpenMapInStorage.input) {
            var input = kampfer.mindMap.command.OpenMapInStorage.input =
                document.getElementById('mapJson');
        
            kampfer.events.addListener(input, 'change', function(e){
                if (window.File && window.FileReader && window.FileList && window.Blob) {
                    var files = e.target.files;
                    for(var i = 0, f; (f = files[i]); i++) {
                        var reader = new FileReader();
                        reader.onload = function(e) {
                            var result = e.target.result;
                            var data = JSON.parse(result);

                            kampfer.mindMap.mapManager = new kampfer.mindMap.MapManager(data);
                            kampfer.mindMap.map = new kampfer.mindMap.Map(kampfer.mindMap.mapManager);
                            view.addChild(kampfer.mindMap.map, true);
                        };
                        reader.readAsText(f);
                    }
                } else {
                    alert('浏览器不支持html5 files api');
                }
            });
        }
    },

    execute : function(data, view) {
        kampfer.events.dispatch(kampfer.mindMap.command.OpenMapInStorage.input, 'click');
    }
});

kampfer.mindMap.command.OpenMapInDisk.isAvailable =
    kampfer.mindMap.command.CreateNewMap.isAvailable;


kampfer.mindMap.command.OpenMapInStorage = kampfer.mindMap.command.Base.extend({
    execute : function() {
        var mapData = kampfer.mindMap.mapsManager.getMapStorage();
        console.log(mapData);
    }
});

kampfer.mindMap.command.OpenMapInStorage.isAvailable =
    kampfer.mindMap.command.CreateNewMap.isAvailable;


kampfer.mindMap.command.RenameMap = kampfer.mindMap.command.Base.extend({

});


kampfer.mindMap.command.CreateNewRootNode = kampfer.mindMap.command.Base.extend({
    initializer : function(data) {
        var nodeData = kampfer.mindMap.mapManager.createNode(),
            window = kampfer.mindMap.map.getParent();
        nodeData.offset.x = data.pageX + window.scrollLeft();
        nodeData.offset.y = data.pageY + window.scrollTop();
        this.nodeData = nodeData;
    },

    execute : function() {
        var node = new kampfer.mindMap.Node(this.nodeData),
            parent;

        if(this.nodeData.parent) {
            parent = kampfer.mindMap.map.getChild(this.nodeData.parent);
        } else {
            parent = kampfer.mindMap.map;
        }

        kampfer.mindMap.mapManager.addNode(this.nodeData);
        parent.addChild(node, true);
    },

    unExecute : function() {
        var parent;
        if(this.nodeData.parent) {
            parent = kampfer.mindMap.map.getChild(this.nodeData.parent);
        } else {
            parent = kampfer.mindMap.map;
        }
        parent.removeChild(this.nodeData.id, true);
        kampfer.mindMap.mapManager.deleteNode(this.nodeData.id);
    },

    dispose : function() {
        delete this.nodeData;
    },

    needPush : true
});

kampfer.mindMap.command.CreateNewRootNode.isAvailable = function() {
    if(kampfer.mindMap.map) {
        return true;
    }
    return false;
};


kampfer.mindMap.command.AppendChildNode = kampfer.mindMap.command.CreateNewRootNode.extend({
    initializer : function() {
        var nodeData = kampfer.mindMap.mapManager.createNode();
        nodeData.parent = kampfer.mindMap.map.currentNode.getId();
        this.nodeData = nodeData;
    }
});

kampfer.mindMap.command.AppendChildNode.isAvailable = function() {
    if(kampfer.mindMap.map.currentNode) {
        return true;
    }
    return false;
};


kampfer.mindMap.command.DeleteNode = kampfer.mindMap.command.Base.extend({
    initializer : function(data) {
        var id = kampfer.mindMap.map.currentNode.getId();
        this.nodeData = kampfer.mindMap.mapManager.getNode(id);
    },

    needPush : true,

    execute : function() {
        var parent;
        if(this.nodeData.parent) {
            parent = kampfer.mindMap.map.getChild(this.nodeData.parent);
        } else {
            parent = kampfer.mindMap.map;
        }

        parent.removeChild(this.nodeData.id, true);
        kampfer.mindMap.mapManager.deleteNode(this.nodeData.id);
    },

    unExecute : function() {
        var node = new kampfer.mindMap.Node(this.nodeData),
            parent;

        if(this.nodeData.parent) {
            parent = kampfer.mindMap.map.getChild(this.nodeData.parent);
        } else {
            parent = kampfer.mindMap.map;
        }

        kampfer.mindMap.mapManager.addNode(this.nodeData);
        parent.addChild(node, true);
    },

    dispose : function() {
        delete this.nodeData;
    }
});

kampfer.mindMap.command.DeleteNode.isAvailable = function() {
    if(!kampfer.mindMap.map || !kampfer.mindMap.map.currentNode) {
        return false;
    }
    return true;
};


kampfer.mindMap.command.SaveNodePosition = kampfer.mindMap.command.Base.extend({
    initializer : function(data) {
        var id = data.nodeId,
            nodeData = kampfer.mindMap.mapManager.getNode(id);

        this.oriX = nodeData.offset.x;
        this.oriY = nodeData.offset.y;

        this.newX = data.x;
        this.newY = data.y;

        this.nodeData = nodeData;
    },

    needPush : true,

    execute : function() {
        kampfer.mindMap.map.getChild(this.nodeData.id).moveTo(this.newX, this.newY);
        kampfer.mindMap.mapManager.setNodePosition(this.nodeData.id, this.newX, this.newY);
    },

    unExecute : function() {
        kampfer.mindMap.map.getChild(this.nodeData.id).moveTo(this.oriX, this.oriY);
        kampfer.mindMap.mapManager.setNodePosition(this.nodeData.id, this.oriX, this.oriY);
    },

    dispose : function() {
        delete this.nodeData;
        delete this.oriY;
        delete this.oriX;
        delete this.newX;
        delete this.newY;
    }
});


kampfer.mindMap.command.EditNodeContent = kampfer.mindMap.command.Base.extend({
    execute : function() {
        kampfer.mindMap.map.currentNode.getCaption().insertTextarea();
    }
});


kampfer.mindMap.command.SaveNodeContent = kampfer.mindMap.command.Base.extend({
    initializer : function(data) {
        //CreatRootNode和AppendChild命令的undo、redo操作会删除旧view而后生成新的view
        //这里如果缓存view,那么SaveNodeContent的操作对象就是已经从文档中删除的旧view
        //this.view = kampfer.mindMap.map.getChild(id);
        this.nodeId = data.nodeId;
        var view = kampfer.mindMap.map.getChild(this.nodeId);
        this.oriContent = view.getCaption().getContent();
        this.newContent = view.getCaption().getTextareaValue();
    },

    needPush : true,

    execute : function() {
        kampfer.mindMap.map.getChild(this.nodeId).getCaption().setContent(this.newContent);
        kampfer.mindMap.mapManager.setNodeContent(this.nodeId, this.newContent);
    },

    unExecute : function() {
        kampfer.mindMap.map.getChild(this.nodeId).getCaption().setContent(this.oriContent);
        kampfer.mindMap.mapManager.setNodeContent(this.nodeId, this.oriContent);
    },

    dispose : function() {
        delete this.view;
        delete this.oriContent;
        delete this.newContent;
    }
});


kampfer.mindMap.command.Copy = kampfer.mindMap.command.Base.extend({
    execute : function() {
        var nodeId = kampfer.mindMap.map.currentNode.getId();

        var node = kampfer.mindMap.mapManager.createNode(
            kampfer.mindMap.mapManager.getNode(nodeId) );
        
        kampfer.mindMap.mapsManager.setClipboard(node);
    }
});

kampfer.mindMap.command.Copy.isAvailable = function() {
    if(!kampfer.mindMap.map || !kampfer.mindMap.map.currentNode) {
        return false;
    }
    return true;
};


kampfer.mindMap.command.Cut = kampfer.mindMap.command.DeleteNode.extend({
    execute : function() {
        kampfer.mindMap.command.Cut.superClass.execute.apply(this);

        var node = kampfer.mindMap.mapManager.createNode(this.nodeData);
        
        kampfer.mindMap.mapsManager.setClipboard(node);
    }
});

kampfer.mindMap.command.Cut.isAvailable = kampfer.mindMap.command.DeleteNode.isAvailable;


kampfer.mindMap.command.Paste = kampfer.mindMap.command.CreateNewRootNode.extend({
    initializer : function(data) {
        this.nodeData = kampfer.mindMap.mapsManager.getClipboard();

        //重置所有id
        kampfer.mindMap.mapManager.traverseNode(this.nodeData, function(node) {
            node.id = kampfer.mindMap.mapManager.generateUniqueId();
            node.parent = null;
            if(node.children) {
                var child, i = 0;
                while( (child = node.children[i++]) ) {
                    child.parent = node.id;
                }
            }
        });

        if(kampfer.mindMap.map.currentNode) {
            this.nodeData.parent = kampfer.mindMap.map.currentNode.getId();
        }

        if(!this.nodeData.parent) {
            var window = kampfer.mindMap.map.getParent();
            this.nodeData.offset.x = data.pageX + window.scrollLeft();
            this.nodeData.offset.y = data.pageY + window.scrollTop();
        }
    }
});

kampfer.mindMap.command.Paste.isAvailable = function() {
    var clipboard = kampfer.mindMap.mapsManager.getClipboard();
    if( !kampfer.mindMap.map || !clipboard || clipboard.length <= 0) {
        return false;
    }
    return true;
};