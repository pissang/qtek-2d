requirejs.config({
    'baseUrl' : '../src',
    'paths' : {
        'glmatrix' : '../../qtek/thirdparty/gl-matrix',
        'qtek' : '../../qtek/src',
        'ClipperLib' : '../lib/clipper'
        // 'qtek-2d' : '../dist/qtek-2d',
        // 'qtek' : '../lib/qtek'
    },
    packages: [{
        name : 'qtek-2d',
        location : '.',
        main : 'qtek-2d'
    }]
});