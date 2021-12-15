import type { Plugin, ResolvedConfig, UserConfig, ConfigEnv } from 'vite';
import type { Plugin as ESbuildPlugin } from 'esbuild/lib/main';
import { modifyCssConfig } from './less';
import { modifyIconConfig, loadIcon } from './icon';
import { transformCssFile, transformJsFiles } from './transform';
import { libraryName } from './config';

const pkg = require('../../package.json');

type Vars = Record<string, any>;
type Style = boolean | 'css';

interface PluginOption {
  theme?: string; // Theme package name
  iconBox?: string; // Icon library package name
  modifyVars?: Vars; // less modifyVars
  style?: Style; // Style lazy load
}

export default function vitePluginArcoImport(options: PluginOption = {}): Plugin {
  const { theme = '', iconBox = '', modifyVars = {}, style = true } = options;
  let styleOptimization: boolean;
  let iconBoxLib: any;
  let resolvedConfig: ResolvedConfig;
  let isDevelopment = false;

  if (iconBox) {
    try {
      iconBoxLib = require(iconBox); // eslint-disable-line
    } catch (e) {
      console.error(`IconBox ${iconBox} not existed`);
    }
  }
  return {
    name: pkg.name,
    config(config: UserConfig, { command }: ConfigEnv) {
      isDevelopment = command === 'serve';
      // Lay load
      styleOptimization = command === 'build';

      // css preprocessorOptions
      modifyCssConfig(config, theme, modifyVars);

      // iconbox
      modifyIconConfig(config, iconBoxLib);

      const plugin: ESbuildPlugin = {
        name: 'test',
        setup(build) {
          console.log('originjs:commonjs');
          build.onLoad(
            {
              filter: new RegExp(`${libraryName}/lib/index.js`),
              namespace: 'file',
            },
            async ({ path }) => {
              console.log('path', path);
              // const code = fs.readFileSync(id).toString();
              // let result = lib_1.transformRequire(code, id);
              // if (result.replaced) {
              //   console.log('id', id);
              //   return {
              //     contents: result.code,
              //     loader: 'js',
              //   };
              // }
              return null;
            }
          );
        },
      };
      config.optimizeDeps.esbuildOptions.plugins.push(plugin);
    },
    async load(id: string) {
      const res = loadIcon(id, iconBox, iconBoxLib);
      if (res !== undefined) {
        return res;
      }
      // other ids should be handled as usually
      return null;
    },
    configResolved(config: ResolvedConfig) {
      resolvedConfig = config;
      // console.log('viteConfig', resolvedConfig)
    },
    transform(code, id) {
      // transform css files
      const res = transformCssFile({
        code,
        id,
        theme,
      });
      if (res !== undefined) {
        return res;
      }

      // css lazy load
      return transformJsFiles({
        code,
        id,
        theme,
        style,
        styleOptimization,
        sourceMaps: isDevelopment || Boolean(resolvedConfig?.build?.sourcemap),
      });
    },
  };
}
