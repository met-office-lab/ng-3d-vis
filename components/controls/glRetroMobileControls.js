'use strict';

angular.module('three')
    .directive('glRetroMobileControls', function ($rootScope) {
        return {
            restrict: 'A',
            require: '^glScene',
            link: function (scope, element, attrs, sceneCtrl) {

                console.log("loading controls");
                var controls = new THREE.MyRetroMobileControls(sceneCtrl.cameraService.camera, sceneCtrl.rendererService.renderer.domElement);

                scope.$on('update', function(event, data){

                    controls.update(data.delta);
                    if(controls.move){
                        $rootScope.$broadcast('moving');
                    }
                });

            }
        }
    });

THREE.MyRetroMobileControls = function ( object, domElement ) {

    this.object = object;
    this.domElement = ( domElement !== undefined ) ? domElement : document;

    // Set to false to disable this control
    this.enabled = true;

    this.rotateSpeed = 1.0;
    this.moveSpeed = 100.0;

    this.keys = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        BOTTOM: 40,
        S: 'S'.charCodeAt(0),
        W: 'W'.charCodeAt(0),
        A: 'A'.charCodeAt(0),
        D: 'D'.charCodeAt(0)
    };

    var scope = this;

    var rotateStart = new THREE.Vector2();
    var rotateEnd = new THREE.Vector2();
    var rotateDelta = new THREE.Vector2();

    var panStart = new THREE.Vector2();
    var panEnd = new THREE.Vector2();
    var panDelta = new THREE.Vector2();
    var panOffset = new THREE.Vector3();

    var offset = new THREE.Vector3();

    var phiDelta = 0;
    var thetaDelta = 0;
    var scale = 1;
    var pan = new THREE.Vector3();

    var lastPosition = new THREE.Vector3();

    var STATE = { NONE : -1, ROTATE : 0, SPEEDCHANGE : 1, PAN : 2 };

    var state = STATE.NONE;

    // for reset
    this.position0 = this.object.position.clone();

    // events
    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start'};
    var endEvent = { type: 'end'};

    this.rotateLeft = function ( angle ) {
        thetaDelta -= angle;
    };

    this.rotateUp = function ( angle ) {
        phiDelta -= angle;
    };

    // pass in distance in world space to move left
    this.panLeft = function ( distance ) {

        var te = this.object.matrix.elements;

        // get X column of matrix
        panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
        panOffset.multiplyScalar( - distance );

        pan.add( panOffset );

    };

    // pass in distance in world space to move up
    this.panUp = function ( distance ) {

        var te = this.object.matrix.elements;

        // get Y column of matrix
        panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
        panOffset.multiplyScalar( distance );

        pan.add( panOffset );

    };

    // pass in distance in world space to move forward
    this.panForward = function ( distance ) {

        var te = this.object.matrix.elements;

        // get Y column of matrix
        panOffset.set( te[ 8 ], te[ 9 ], te[ 10 ] );
        panOffset.multiplyScalar( distance );

        pan.add( panOffset );

    };

    this.pan = function ( deltaX, deltaY ) {

        var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

        if ( scope.object.fov !== undefined ) {
            // perspective
            var position = scope.object.position;
            var offset = position.clone();
            var targetDistance = offset.length();

            // half of the fov is center to top of screen
            targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

            // we actually don't use screenWidth, since perspective camera is fixed to screen height
            scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
            scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );

        } else if ( scope.object.top !== undefined ) {

            // orthographic
            scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
            scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );
        } else {

            // camera neither orthographic or perspective
            console.warn( 'WARNING: FirstPersonControls.js encountered an unknown camera type - pan disabled.' );
        }
    };

    this.update = function (delta) {
        this.object.rotation.order = 'YXZ';
        var position = this.object.position;

        if(delta !== undefined){
            if(this.moveRight){
                this.panLeft(-delta * this.moveSpeed);
            }
            if(this.moveLeft){
                this.panLeft(delta * this.moveSpeed);
            }
            if(this.moveForward){
                this.panForward(-delta * this.moveSpeed);
            }
            if(this.moveBackward){
                this.panForward(delta * this.moveSpeed);
            }
            if(this.lookUp){
                this.rotateUp(-delta * scope.rotateSpeed);
            }
            if(this.lookDown){
                this.rotateUp(delta * scope.rotateSpeed);
            }
            if(this.lookLeft){
                this.rotateLeft(-delta * scope.rotateSpeed);
            }
            if(this.lookRight){
                this.rotateLeft(delta * scope.rotateSpeed);
            }
        }

        if(!pan.equals(new THREE.Vector3(0,0,0))){
            var event = {
                type: 'move',
                translation: pan.clone()
            };
            this.dispatchEvent(event);
        }

        position.add(pan);

        if(!(thetaDelta === 0.0 && phiDelta === 0.0)) {
            var event = {
                type: 'rotate',
                thetaDelta: thetaDelta,
                phiDelta: phiDelta
            };
            this.dispatchEvent(event);
        }

        this.object.updateMatrix();
        var rot = new THREE.Matrix4().makeRotationY(thetaDelta);
        var res = new THREE.Matrix4().multiplyMatrices(rot, this.object.matrix);
        this.object.quaternion.setFromRotationMatrix(res);

        this.object.rotation.x += phiDelta;

        thetaDelta = 0;
        phiDelta = 0;
        scale = 1;
        pan.set( 0, 0, 0 );

        if ( lastPosition.distanceTo( this.object.position ) > 0 ) {
            this.dispatchEvent( changeEvent );

            lastPosition.copy( this.object.position );
        }
    };

    this.reset = function () {
        state = STATE.NONE;

        this.object.position.copy( this.position0 );
    };


    /*Key events*/
    function onKeyDown( event ) {
        if ( scope.enabled === false) return;
        scope.move = true;
        switch ( event.keyCode ) {
            case scope.keys.UP: scope.lookUp = true; break;
            case scope.keys.BOTTOM: scope.lookDown = true; break;
            case scope.keys.LEFT: scope.lookLeft = true; break;
            case scope.keys.RIGHT: scope.lookRight = true; break;
            case scope.keys.W: scope.moveForward = true; break;
            case scope.keys.S: scope.moveBackward = true; break;
            case scope.keys.A: scope.moveLeft = true; break;
            case scope.keys.D: scope.moveRight = true; break;
        }
    }

    function onKeyUp( event ) {
        scope.move = false;
        switch ( event.keyCode ) {
            case scope.keys.W: scope.moveForward = false; break;
            case scope.keys.S: scope.moveBackward = false; break;
            case scope.keys.A: scope.moveLeft = false; break;
            case scope.keys.D: scope.moveRight = false; break;
            case scope.keys.UP: scope.lookUp = false; break;
            case scope.keys.BOTTOM: scope.lookDown = false; break;
            case scope.keys.LEFT: scope.lookLeft = false; break;
            case scope.keys.RIGHT: scope.lookRight = false; break;
        }
    }

    window.addEventListener( 'keydown', onKeyDown, false );
    window.addEventListener( 'keyup', onKeyUp, false );

    /*my touch events*/

    $('#up').bind('touchstart', function(event) {
        event.preventDefault();
        console.log("up start");
        scope.lookUp = true;
        scope.move = true;
    });
    $('#up').bind('touchend', function() {
        console.log("up ended");
        scope.lookUp = false;
        scope.move = false;
    });

    $('#down').bind('touchstart', function(event) {
        event.preventDefault();
        console.log("down start");
        scope.lookDown = true;
        scope.move = true;
    });
    $('#down').bind('touchend', function() {
        console.log("down ended");
        scope.lookDown = false;
        scope.move = false;
    });

    $('#left').bind('touchstart', function(event) {
        event.preventDefault();
        console.log("left start");
        scope.lookLeft = true;
        scope.move = true;
    });
    $('#left').bind('touchend', function() {
        console.log("left ended");
        scope.lookLeft = false;
        scope.move = false;
    });

    $('#right').bind('touchstart', function(event) {
        event.preventDefault();
        console.log("right start");
        scope.lookRight=true;
        scope.move = true;
    });
    $('#right').bind('touchend', function() {
        console.log("right ended");
        scope.lookRight = false;
        scope.move = false;
    });

    $('#forward').bind('touchstart', function(event) {
        event.preventDefault();
        console.log("forward start");
        scope.moveForward = true;
        scope.move = true;
    });
    $('#forward').bind('touchend', function() {
        console.log("forward ended");
        scope.moveForward = false;
        scope.move = false;
    });

    $('#back').bind('touchstart', function(event) {
        event.preventDefault();
        console.log("back start");
        scope.moveBackward = true;
        scope.move = true;
    });
    $('#back').bind('touchend', function() {
        console.log("back ended");
        scope.moveBackward = false;
        scope.move = false;
    });

};

THREE.MyRetroMobileControls.prototype = Object.create( THREE.EventDispatcher.prototype );