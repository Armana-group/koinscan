/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.module.rules.push({
          test: /\.js$/,
          loader: 'babel-loader',
          options: {
            plugins: ['@babel/plugin-transform-modules-commonjs'],
          },
        });
        return config;
      },
};

export default nextConfig;
