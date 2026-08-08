/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/rapier', 'lucide-react', 'framer-motion'],
  webpack: (config) => {
    // Enable WebAssembly support for Rapier 3D physics
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

export default nextConfig;
