import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

export default [
    {
        input: './src/index.ts',
        plugins: [
            typescript(),
            resolve(),
            commonjs()
        ],
        output: {
            file: './MMM-SugarValue.js',
            format: 'iife',
        }
    },
    {
        input: './src/node_helper.ts',
        plugins: [
            typescript()
        ],
        output: {
            file: './node_helper.js',
            format: 'umd',
        }
    }
]
