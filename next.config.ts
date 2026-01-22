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
    async redirects() {
        return [
            // Редиректы со старых admin путей на methodist
            { source: '/admin/catalog', destination: '/methodist/catalog', permanent: true },
            { source: '/admin/schedule', destination: '/methodist/schedule', permanent: true },
            { source: '/admin/schedules', destination: '/methodist/schedules', permanent: true },
            { source: '/admin/rooms', destination: '/methodist/rooms', permanent: true },
            { source: '/admin/requests', destination: '/methodist/requests', permanent: true },
        ];
    },
};

module.exports = nextConfig;