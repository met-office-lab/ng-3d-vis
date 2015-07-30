'use strict';

angular.module('three')
    .service('glCoordService', ['$rootScope', 'glVideoService', function ($rootScope, glVideoService) {
        var vm = this;

        vm.videoService = glVideoService;

        $rootScope.$on('video data loaded', function() {

                // We're assuming for now that we have a rectangle along lat/lon lines
                // Later, might need to worry about the meridian -180/180
                vm.grid_dims = vm.videoService.data.data_dimensions;

                vm.maxLat = -90;
                vm.minLat = 90;
                vm.maxLon = -180;
                vm.minLon = 180;
                vm.videoService.data.geographic_region.forEach(function (bound) {
                    if (bound.lat > vm.maxLat) {
                        vm.maxLat = bound.lat;
                    }
                    if (bound.lat < vm.minLat) {
                        vm.minLat = bound.lat;
                    }
                    if (bound.lng > vm.maxLon) {
                        vm.maxLon = bound.lng;
                    }
                    if (bound.lng < vm.minLon) {
                        vm.minLon = bound.lng;
                    }
                });


        });

        vm.lookupCoordX = function (lon) {
            var btm_left = -vm.grid_dims.x / 2;
            return vm.lookupCoord(lon, vm.minLon, vm.maxLon, vm.grid_dims.x, btm_left);
        };

        vm.lookupCoordZ = function (lat) {
            var btm_left = -vm.grid_dims.z / 2;
            return -vm.lookupCoord(lat, vm.minLat, vm.maxLat, vm.grid_dims.z, btm_left);
        };

        vm.lookupCoord = function (val, min, max, grid, btm_left) {
            return (((val - min) / (max - min)) * grid) + btm_left;
        };

        vm.lookupCoords = function (latlon) {
            return {
                x: vm.lookupCoordX(latlon.lon),
                y: -(vm.grid_dims.y/2) * 0.99,               //setting this to the bottom of the cube?
                z: vm.lookupCoordZ(latlon.lat)
            };
        };

        //TODO lookup lat lng from camera position
        vm.lookupLatLon = function (position) {

            return {
                lat: 0.0,
                lon: 0.0
            };
        };

        return vm;
    }]);
