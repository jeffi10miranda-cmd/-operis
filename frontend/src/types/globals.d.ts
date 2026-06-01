// Permite imports de CSS como side-effects (ex: import './globals.css')
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
