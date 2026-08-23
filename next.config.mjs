/** @type {import('next').NextConfig} */
const nextConfig = {
  // ssaju는 ESM 전용(CommonJS 빌드 없음) 패키지라, 서버 런타임에서 일반 require()로
  // 불러오면 Node 버전에 따라(20.19/22.12 미만) "Cannot find module" 오류가 난다.
  // transpilePackages로 지정하면 Next.js가 이 패키지를 webpack으로 직접 번들링해
  // Node의 ESM 로딩 문제를 우회한다.
  transpilePackages: ["ssaju"],
};

export default nextConfig;
