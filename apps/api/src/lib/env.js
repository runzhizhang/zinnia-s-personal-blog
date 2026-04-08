import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.API_PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  webUrl: process.env.WEB_URL || "http://localhost:3000",
  minioEndPoint: process.env.MINIO_ENDPOINT || "localhost",
  minioPort: Number(process.env.MINIO_PORT || 9000),
  minioUseSSL: process.env.MINIO_USE_SSL === "true",
  minioAccessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  minioSecretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  minioBucket: process.env.MINIO_BUCKET || "media"
};
