angular.module('three')
    .directive('glMap', function () {
        return {
            restrict: 'E',
            require: "^glScene",
            scope: {
                'name': '@'
            },
            controller: mapController,
            controllerAs: 'vm',
            link: function postLink(scope, element, attrs, parentCtrl) {

                scope.$on('bounds loaded', function () {
                    console.log("adding land");
                    //parentCtrl.sceneService.addSomething(scope.name, scope.vm.buildLand());
                    scope.vm.buildLand(parentCtrl);
                });

            }
        };
    });

function mapController($scope, glVideoService, glConstantsService, glCoordService) {
    var vm = this;

    vm.videoService = glVideoService;
    vm.constants = glConstantsService;
    vm.coordService = glCoordService;

    vm.getShader = function(src) {
        var source = null;
        $.ajax({
            async: false,
            url: src,
            success: function (data) {
                source = $(data).html();
            },
            dataType: 'html'
        });
        return source;
    };

    vm.buildLand = function (parentCtrl) {
        var ambientLight = new THREE.AmbientLight(0xffffff);
        var pointLight = new THREE.PointLight(0xffffff, 0.0);
        pointLight.position.set(0, 300, -200);

        var ambient = 0x000000, diffuse = 0x666666, specular = 0xffffff, shininess = 50.0, scale = 100;

        htBBox = vm.coordService.minLat.toString() + "," +
                    vm.coordService.minLon.toString() + "," +
                    vm.coordService.maxLat.toString() + "," +
                    vm.coordService.maxLon.toString();

        var htMapParams = {
            REQUEST:'GetMap',
            STYLES:'boxfill/greyscale',
            FORMAT:'image/png',
            HEIGHT:1024,
            WIDTH:1024,
            //BBOX:'48.77,-10.12,59.29,2.43',
            BBOX:htBBox,
            CRS:'EPSG:4326',
            LAYER:'topo',
            VERSION:'1.3.0',
            LAYERS:'topo',
            COLORSCALERANGE:'0,1000',
            NUMCOLORBANDS:'253',
            ABOVEMAXCOLOR:'extend'
        };

        var htMapPng = 'http://thredds.3dvis.informaticslab.co.uk/thredds/wms/testLab/global_dem_unmasked.nc?' +
        jQuery.param( htMapParams );

        wrBBox = vm.coordService.minLon.toString() + "," +
                    vm.coordService.minLat.toString() + "," +
                    vm.coordService.maxLon.toString() + "," +
                    vm.coordService.maxLat.toString();

        var landTxtrParams = {
            request:'getmap',
            service:'wms',
            //BBOX:'-10.12,48.77,2.43,59.29',
            BBOX:wrBBox,
            srs:'EPSG:4326',
            format:'image/jpeg',
            layers:'gebco_latest',
            width:2048,
            height:2048,
            version:'1.1.1'

        };
        var landTxtrPng = 'http://www.gebco.net/' +
        'data_and_products/gebco_web_services/web_map_service/mapserv?' +
        jQuery.param( landTxtrParams );

        var htImage = new Image();
        var wrImage = new Image();
        var dispTexture = null;
        var wrapTexture = null;

        htImage.onload = function() {
            var canv = document.createElement('canvas');
            var ctx = canv.getContext('2d');
            canv.width = this.width;
            canv.height = this.height;
            ctx.drawImage(this, 0, 0);
            dispTexture = new THREE.ImageUtils.loadTexture ( canv.toDataURL() );
            if (dispTexture && wrapTexture){
                onLoaded(dispTexture, wrapTexture, parentCtrl);
            }
        }
        htImage.crossOrigin = 'anonymous';
        htImage.src = htMapPng;      

        wrImage.onload = function() {
            var canv = document.createElement('canvas');
            var ctx = canv.getContext('2d');
            canv.width = this.width;
            canv.height = this.height;
            ctx.drawImage(this, 0, 0);
            wrapTexture = new THREE.ImageUtils.loadTexture ( canv.toDataURL() );
            if (dispTexture && wrapTexture){
                onLoaded(dispTexture, wrapTexture, parentCtrl);
            }
        }
        wrImage.crossOrigin = 'anonymous';
        wrImage.src =  landTxtrPng;   

        function onLoaded(dispTexture, wrapTexture, parentCtrl) {
            //var dispTexture = new THREE.ImageUtils.loadTexture('../../components/scene_objects/map/data/global_dem_unmasked.png');
            dispTexture.minFilter = THREE.NearestFilter;
            var diffTexture = new THREE.ImageUtils.loadTexture('../../components/scene_objects/map/data/UK-colormap-cropped.jpg');
            //var diffTexture = wrapTexture;
            diffTexture.minFilter = THREE.NearestFilter;
            var uniforms = THREE.UniformsUtils.merge([

                THREE.UniformsLib["fog"],
                THREE.UniformsLib["lights"],
                THREE.UniformsLib["shadowmap"],

                {

                    "enableAO": {type: "i", value: 0},
                    "enableDiffuse": {type: "i", value: 0},
                    "enableSpecular": {type: "i", value: 0},
                    "enableReflection": {type: "i", value: 0},
                    "enableDisplacement": {type: "i", value: 0},

                    "tDisplacement": {type: "t", value: null}, // must go first as this is vertex texture
                    "tDiffuse": {type: "t", value: null},
                    "tCube": {type: "t", value: null},
                    "tNormal": {type: "t", value: null},
                    "tSpecular": {type: "t", value: null},
                    "tAO": {type: "t", value: null},

                    "uNormalScale": {type: "v2", value: new THREE.Vector2(1, 1)},

                    "uDisplacementBias": {type: "f", value: 0.0},
                    "uDisplacementScale": {type: "f", value: 1.0},

                    "uDiffuseColor": {type: "c", value: new THREE.Color(0xffffff)},
                    "uSpecularColor": {type: "c", value: new THREE.Color(0x111111)},
                    "uAmbientColor": {type: "c", value: new THREE.Color(0xffffff)},
                    "uShininess": {type: "f", value: 30},
                    "uOpacity": {type: "f", value: 1},

                    "useRefract": {type: "i", value: 0},
                    "uRefractionRatio": {type: "f", value: 0.98},
                    "uReflectivity": {type: "f", value: 0.5},

                    "uOffset": {type: "v2", value: new THREE.Vector2(0, 0)},
                    "uRepeat": {type: "v2", value: new THREE.Vector2(1, 1)},

                    "wrapRGB": {type: "v3", value: new THREE.Vector3(1, 1, 1)}

                }

            ]);

            uniforms["enableDisplacement"] = {type: 'i', value: 1};
            uniforms["enableDiffuse"] = {type: 'i', value: 0};
            uniforms["tDiffuse"].value = diffTexture;
            uniforms["tDiffuseOpacity"] = {type: 'f', value: 1.0};
            uniforms["tDisplacement"] = {type: 't', value: dispTexture};
            uniforms["uDisplacementScale"] = {type: 'f', value: 100};

            uniforms["tNormal"] = {
                type: 't',
                value: new THREE.ImageUtils.loadTexture('../../components/scene_objects/map/data/flat.png')
            };

            uniforms["uDiffuseColor"].value = new THREE.Color(diffuse);
            uniforms["uSpecularColor"].value = new THREE.Color(specular);
            uniforms["uAmbientColor"].value = new THREE.Color(ambient);
            uniforms["uShininess"].value = shininess;

            uniforms["uPointLightPos"] = {type: "v3", value: pointLight.position},
                uniforms["uPointLightColor"] = {type: "c", value: new THREE.Color(pointLight.color)};
            uniforms["uAmbientLightColor"] = {type: "c", value: new THREE.Color(ambientLight.color)};

            uniforms["uDisplacementPostScale"] = {type: 'f', value: 5};

            uniforms["bumpScale"] = {type: "f", value: 10};


            var material = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: vm.getShader('../../components/scene_objects/map/shaders/vertex_shader_heightmap.html'),
                fragmentShader: vm.getShader('../../components/scene_objects/map/shaders/fragment_shader_heightmap.html'),
                side: THREE.FrontSide
            });

            // GEOMETRY
            var geometry = new THREE.PlaneBufferGeometry(vm.videoService.data.data_dimensions.x, vm.videoService.data.data_dimensions.y, 512, 512);
            geometry.computeTangents();

            var terrain = new THREE.Mesh(geometry, material);
            terrain.position.y = -(vm.videoService.data.data_dimensions.z / 2) * vm.constants.HEIGHT_SCALE_FACTOR;
            terrain.rotation.x = (3 * Math.PI) / 2;
            //return terrain;
            console.log(terrain);
            parentCtrl.sceneService.addSomething($scope.name, terrain);
        }
    };


}
