import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        // next.js requests to a 3rd party api, doesn't reach the middleware.ts file
        // so in order to intercept requests:
        // 1- you can use axios interceptor, which is against what we are trying to do
        // 2- make an endpoint as a proxy for each 3rd party api endpoint, which is boring
        // 3- or simply, add these 2 lines  here
        // these 2 lines add a proxy automatically to all requests going to your server (if theres no api route for them)
        // for example: if you have a route at /api/profile it will request this endpoint
        // but if you don't, then it will redirect it to http://localhost:3001/profile
        // AND THE GREAT THING IS, they reach the middleware.ts file which is all we want.
        source: "/api/:path*",
        destination: `${process.env.API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
