declare module 'kill-port' {
  async function kill(port: number): Promise<void>;
  export = kill;
}
