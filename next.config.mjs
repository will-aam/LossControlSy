import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Aponta para o arquivo que criamos
  swSrc: "app/sw.ts",
  // Onde o arquivo final será gerado
  swDest: "public/sw.js",
  // Desabilita em desenvolvimento para não atrapalhar o debug (opcional)
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suas configurações existentes
  reactStrictMode: true,
  // Se tiver outras configs, mantenha aqui
};

export default withSerwist(nextConfig);
