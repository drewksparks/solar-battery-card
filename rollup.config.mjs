import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "battery-card.js",  
  output: {
    file: "dist/battery-card.js",
    format: "es"
  },
  plugins: [
    resolve(),
    commonjs()
  ]
};
