import type { NextConfig } from "next";
const config: NextConfig = {
  // The cloud server binds to 0.0.0.0; internal browser checks use the loopback IP.
  allowedDevOrigins: ["127.0.0.1"],
};
export default config;
