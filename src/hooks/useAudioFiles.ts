// Stub mantido após remoção do módulo de Áudios.
// Mantém a API mínima usada por componentes legados sem quebrar tipagem.
export type AudioFileLite = {
  id: string;
  title: string;
  file_path: string;
};

export function useAudioFiles() {
  return {
    audios: [] as AudioFileLite[],
    loading: false,
    getPublicUrl: (_path: string) => null as string | null,
    downloadAsBase64: async (_path: string) => null as { base64: string; mimeType: string } | null,
  };
}
