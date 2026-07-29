/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute path to public/shows.yaml, for building vscode://file/... links
   * from the #problems page while developing locally. Set in .env.local. */
  readonly VITE_SHOWS_YAML_PATH?: string;
}
