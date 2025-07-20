declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_PERPLEXITY_API_KEY: string;
    PERPLEXITY_API_KEY: string;
    DATABASE_URL: string;
    NEXTAUTH_SECRET: string;
    // Add other env vars here
  }
}