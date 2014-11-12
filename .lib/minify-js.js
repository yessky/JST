var U = require('uglify-js');
var fs = require('fs');
var transform = require('./transform');

compress.gulp = function( opts, mges ) {
    opts = extend( opts || {}, options );
    mges = extend( mges || {}, mangles );
    return transform.each(function( file, encoding, done ) {
        if ( file.isNull() ) {
            return done( null, file );
        }
        if ( file.isStream() ) {
            //TODO: re-visit here or throw PluginError ?
            var stm = transform.each(
                function( chunk, encoding, done ) {
                    if ( !this._buf ) {
                        this._buf = Buffer('');
                    }
                    this._buf = Buffer.concat([this._buf, chunk], this._buf.length + chunk.length);
                    done();
                },
                function( done ) {
                    this.push( this._buf );
                    done();
                }
            );
            file.contents = file.contents.pipe( stm );
            return done( null, file );
        }
        var contents = compress( String(file.contents), opts, mges );
        file.contents = new Buffer( contents );
        done( null, file );
    });
};

module.exports = compress;

var options = {
    // 连续单语句，逗号分开
    // 如： alert(1);alert(2); => alert(1),alert(2)
    sequences: false,
    // 重写属性
    // 如：foo['bar'] => foo.bar
    properties: false,
    // 删除无意义代码
    dead_code: false,
    // 移除`debugger;`
    drop_debugger: true,
    // 使用以下不安全的压缩
    unsafe: false,
    //
    unsafe_comps: false,
    // 压缩if表达式
    conditionals: false,
    // 压缩条件表达式
    comparisons: false,
    // 压缩常数表达式
    evaluate: false,
    // 压缩布尔值
    booleans: true,
    // 压缩循环
    loops: false,
    // 移除未使用变量
    unused: true,
    // 函数声明提前
    hoist_funs: true,
    // 变量声明提前
    hoist_vars: true,
    // 压缩 if return if continue
    if_return: false,
    // 合并连续变量省略
    join_vars: true,
    // 小范围连续变量压缩
    cascade: false,
    // 不显示警告语句
    warnings: false,
    side_effects: true,
    pure_getters: true,
    pure_funcs: null,
    negate_iife: true,
    // 全局变量
    global_defs: {}
};

var mangles = {
    except: 'require,exports'
};

function compress( data, opts, mges ) {
    var ast = U.parse(data);
    opts = extend( opts || {}, options );
    mges = extend( mges || {}, mangles );

    ast.figure_out_scope();

    var compressor = U.Compressor( opts );

    ast = ast.transform( compressor );
    ast.figure_out_scope();
    ast.compute_char_frequency();
    ast.mangle_names( mges );
    data = ast.print_to_string();

    return data;
}

function extend( dest, src ) {
    for ( var p in src ) {
        dest[p] = src[p];
    }
    return dest;
}