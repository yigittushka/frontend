/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone', // Для Docker
    async rewrites() {
        // В Docker используем имя сервиса, локально - localhost
        const backendUrl = process.env.BACKEND_URL || 
            (process.env.NODE_ENV === 'production' ? 'http://backend:8080' : 'http://localhost:8080');
        return [
            { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
        ];
    },
};

module.exports = nextConfig;